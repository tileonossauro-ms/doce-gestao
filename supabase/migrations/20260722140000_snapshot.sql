-- Doce Gestão — Fase 6 / item A2: snapshot de custo no pedido.
-- Congela o custo por unidade da receita no momento da confirmação, para os
-- relatórios de margem não mudarem quando o preço de um ingrediente mudar depois.
-- Re-executável.

alter table pedidos add column if not exists custo_unitario_snapshot numeric;

-- Custo por unidade vigente da receita (custo_direto / rendimento). Null se não dá para calcular.
create or replace function _custo_unit_receita(p_receita_id uuid)
returns numeric
language sql
stable
as $$
  select case
           when r.rendimento is null or r.rendimento = 0 then null
           else round(r.custo_direto / r.rendimento, 4)
         end
  from receitas r
  where r.id = p_receita_id
$$;

-- confirmar_pedido agora também grava o snapshot (se ainda não gravado).
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

  update pedidos
     set custo_unitario_snapshot = _custo_unit_receita(p.receita_id)
   where id = p_pedido_id and custo_unitario_snapshot is null;

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
    return jsonb_build_object('ok', true, 'ja_confirmado', true,
      'mensagem', 'Pedido já estava confirmado.');
  end;

  return jsonb_build_object('ok', true, 'ja_confirmado', false, 'valor', p.valor_total);
end $$;

-- Trigger de reforço (pedido -> 'entregue') também grava o snapshot.
-- O update do snapshot é guardado por "is null", então não recursiona.
create or replace function trg_pedido_entregue_entrada()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'entregue'
     and (tg_op = 'INSERT' or old.status is distinct from 'entregue') then
    if new.custo_unitario_snapshot is null then
      update pedidos
         set custo_unitario_snapshot = _custo_unit_receita(new.receita_id)
       where id = new.id and custo_unitario_snapshot is null;
    end if;
    if not exists (select 1 from lancamentos where pedido_id = new.id and tipo = 'entrada') then
      begin
        insert into lancamentos (user_id, tipo, descricao, valor, pedido_id, data)
        values (new.user_id, 'entrada', 'Pedido entregue', new.valor_total, new.id, current_date);
      exception when unique_violation then
        null;
      end;
    end if;
  end if;
  return new;
end $$;

-- Backfill: pedidos já confirmados (com entrada) recebem o snapshot com base no custo atual.
update pedidos p
   set custo_unitario_snapshot = _custo_unit_receita(p.receita_id)
 where p.custo_unitario_snapshot is null
   and exists (select 1 from lancamentos l where l.pedido_id = p.id and l.tipo = 'entrada');
