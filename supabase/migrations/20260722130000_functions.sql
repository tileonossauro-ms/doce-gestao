-- Doce Gestão — Fase 3: cálculo de preço e confirmação de pedido
-- Implementado como funções no banco (RPC) + trigger + índice de idempotência.
-- Re-executável (create or replace / if not exists / drop-if-exists).

-- ============================================================
-- calcular_preco(receita_id) — aplica a fórmula da regra 2.
-- Grava custo_direto, preco_sugerido e status='ativo'.
-- Em caso de erro, mantém status='pendente' e devolve { ok:false, erro }.
-- Roda como o usuário logado, então a RLS garante que só mexe na receita dele.
-- ============================================================
create or replace function calcular_preco(p_receita_id uuid)
returns jsonb
language plpgsql
as $$
declare
  r               receitas;
  v_custo_direto  numeric;
  v_sem_custo     int;
  v_custo_unid    numeric;
  v_denominador   numeric;
  v_preco         numeric;
  v_lucro         numeric;
begin
  select * into r from receitas where id = p_receita_id;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Receita não encontrada.');
  end if;

  -- Algum ingrediente sem custo unitário?
  select count(*) into v_sem_custo
  from receita_ingredientes ri
  join ingredientes i on i.id = ri.ingrediente_id
  where ri.receita_id = p_receita_id and i.custo_unitario is null;

  if v_sem_custo > 0 then
    update receitas set status = 'pendente' where id = p_receita_id;
    return jsonb_build_object('ok', false,
      'erro', 'Há ingrediente(s) sem custo unitário. Preencha o custo antes de calcular.');
  end if;

  -- custo_direto = soma(quantidade * custo_unitario)
  select coalesce(sum(ri.quantidade * i.custo_unitario), 0) into v_custo_direto
  from receita_ingredientes ri
  join ingredientes i on i.id = ri.ingrediente_id
  where ri.receita_id = p_receita_id;

  if r.rendimento is null or r.rendimento = 0 then
    update receitas set status = 'pendente', custo_direto = round(v_custo_direto, 2)
      where id = p_receita_id;
    return jsonb_build_object('ok', false, 'erro', 'Rendimento deve ser maior que zero.');
  end if;

  if coalesce(r.pct_margem, 0) + coalesce(r.pct_taxas, 0) >= 100 then
    update receitas set status = 'pendente', custo_direto = round(v_custo_direto, 2)
      where id = p_receita_id;
    return jsonb_build_object('ok', false, 'erro', 'Margem + taxas devem somar menos de 100%.');
  end if;

  v_custo_unid  := v_custo_direto / r.rendimento;
  v_denominador := 1 - r.pct_margem / 100.0 - r.pct_taxas / 100.0;
  v_preco       := round(v_custo_unid * (1 + r.pct_indireto / 100.0) / v_denominador, 2);
  v_lucro       := round(v_preco * r.pct_margem / 100.0, 2);

  update receitas
     set custo_direto   = round(v_custo_direto, 2),
         preco_sugerido = v_preco,
         status         = 'ativo'
   where id = p_receita_id;

  return jsonb_build_object(
    'ok',                true,
    'custo_direto',      round(v_custo_direto, 2),
    'custo_por_unidade', round(v_custo_unid, 2),
    'preco_sugerido',    v_preco,
    'lucro_unidade',     v_lucro
  );
end $$;

-- ============================================================
-- Idempotência: no máximo UMA entrada por pedido.
-- (lançamentos manuais têm pedido_id nulo e não entram nessa regra.)
-- ============================================================
create unique index if not exists uidx_lancamento_entrada_por_pedido
  on lancamentos (pedido_id)
  where tipo = 'entrada' and pedido_id is not null;

-- ============================================================
-- confirmar_pedido(pedido_id) — cria o lançamento de entrada
-- com valor = valor_total. Chamado pelo botão "Confirmar".
-- Idempotente: confirmar 2x não duplica.
-- ============================================================
create or replace function confirmar_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
as $$
declare
  p       pedidos;
  v_desc  text;
begin
  select * into p from pedidos where id = p_pedido_id;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Pedido não encontrado.');
  end if;

  if exists (select 1 from lancamentos where pedido_id = p_pedido_id and tipo = 'entrada') then
    return jsonb_build_object('ok', true, 'ja_confirmado', true,
      'mensagem', 'Pedido já estava confirmado.');
  end if;

  select 'Pedido: ' || coalesce(rc.nome, 'receita')
         || coalesce(' (' || cl.nome || ')', '')
    into v_desc
  from pedidos pp
  left join receitas rc on rc.id = pp.receita_id
  left join clientes cl on cl.id = pp.cliente_id
  where pp.id = p_pedido_id;

  begin
    insert into lancamentos (user_id, tipo, descricao, valor, pedido_id, data)
    values (p.user_id, 'entrada', v_desc, p.valor_total, p.id, current_date);
  exception when unique_violation then
    -- corrida: outra chamada já criou. Idempotente.
    return jsonb_build_object('ok', true, 'ja_confirmado', true,
      'mensagem', 'Pedido já estava confirmado.');
  end;

  return jsonb_build_object('ok', true, 'ja_confirmado', false, 'valor', p.valor_total);
end $$;

-- ============================================================
-- Trigger de reforço: quando um pedido passa a 'entregue', garante
-- que o lançamento de entrada exista — mesmo que o front não chame
-- a função. Idempotente (índice único + guarda + tratamento de corrida).
-- ============================================================
create or replace function trg_pedido_entregue_entrada()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'entregue'
     and (tg_op = 'INSERT' or old.status is distinct from 'entregue') then
    if not exists (select 1 from lancamentos where pedido_id = new.id and tipo = 'entrada') then
      begin
        insert into lancamentos (user_id, tipo, descricao, valor, pedido_id, data)
        values (new.user_id, 'entrada', 'Pedido entregue', new.valor_total, new.id, current_date);
      exception when unique_violation then
        null; -- já existe, ok
      end;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists pedido_entregue_entrada on pedidos;
create trigger pedido_entregue_entrada
  after insert or update on pedidos
  for each row execute function trg_pedido_entregue_entrada();
