-- Doce Gestão — Fase 14: pedido vira cabeçalho + itens; forma de pagamento; baixa.
-- Migra os pedidos existentes (1 receita) para 1 item cada. Re-executável.

-- 0) Remove a lógica antiga (gatilho por 'entregue') que referencia colunas que vão sair.
drop trigger if exists pedido_entregue_entrada on pedidos;
drop function if exists trg_pedido_entregue_entrada() cascade;
drop function if exists confirmar_pedido(uuid);  -- versão antiga (1 arg) sai; nova tem 2 args

-- 1) ITENS DO PEDIDO
create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pedido_id uuid not null references pedidos(id) on delete cascade,
  receita_id uuid references receitas(id) on delete set null,
  quantidade int not null default 1,
  preco_unitario numeric not null default 0,
  custo_unitario_snapshot numeric,
  criado_em timestamptz not null default now()
);
alter table pedido_itens enable row level security;
drop policy if exists dono_pedido_itens on pedido_itens;
create policy dono_pedido_itens on pedido_itens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_pedido_itens_pedido on pedido_itens(pedido_id);
create index if not exists idx_pedido_itens_user on pedido_itens(user_id);

-- 2) NOVOS CAMPOS EM PEDIDOS
alter table pedidos add column if not exists status_pagamento text not null default 'a_pagar'
  check (status_pagamento in ('a_pagar','pago'));
alter table pedidos add column if not exists forma_pagamento_prevista uuid references formas_pagamento(id) on delete set null;
alter table pedidos add column if not exists forma_pagamento_confirmada uuid references formas_pagamento(id) on delete set null;

-- 3) FORMA DE PAGAMENTO NO LANÇAMENTO
alter table lancamentos add column if not exists forma_pagamento uuid references formas_pagamento(id) on delete set null;

-- 4) MIGRA dados: cada pedido antigo (com receita_id) vira 1 item. (feito ANTES do trigger de recalc)
insert into pedido_itens (user_id, pedido_id, receita_id, quantidade, preco_unitario, custo_unitario_snapshot)
select p.user_id, p.id, p.receita_id, coalesce(p.quantidade, 1),
       case when coalesce(p.quantidade, 0) > 0 then round(p.valor_total / p.quantidade, 2) else p.valor_total end,
       p.custo_unitario_snapshot
from pedidos p
where p.receita_id is not null
  and not exists (select 1 from pedido_itens i where i.pedido_id = p.id);

-- pedidos que já têm entrada = já pagos
update pedidos set status_pagamento = 'pago'
where exists (select 1 from lancamentos l where l.pedido_id = pedidos.id and l.tipo = 'entrada');

-- 5) valor_total = soma dos itens (recalculado por trigger)
create or replace function _recalc_valor_pedido(p_pedido_id uuid)
returns void language sql as $$
  update pedidos set valor_total = coalesce(
    (select sum(quantidade * preco_unitario) from pedido_itens where pedido_id = p_pedido_id), 0)
  where id = p_pedido_id;
$$;
create or replace function trg_pedido_itens_recalc()
returns trigger language plpgsql as $$
begin
  perform _recalc_valor_pedido(coalesce(new.pedido_id, old.pedido_id));
  return null;
end $$;
drop trigger if exists pedido_itens_recalc on pedido_itens;
create trigger pedido_itens_recalc
  after insert or update or delete on pedido_itens
  for each row execute function trg_pedido_itens_recalc();

-- 6) Reforço: quando status_pagamento vira 'pago', grava snapshot por item + 1 lançamento de entrada.
create or replace function trg_pedido_pago_entrada()
returns trigger language plpgsql as $$
declare v_desc text;
begin
  if new.status_pagamento = 'pago'
     and (tg_op = 'INSERT' or old.status_pagamento is distinct from 'pago') then
    update pedido_itens i set custo_unitario_snapshot = _custo_unit_receita(i.receita_id)
      where i.pedido_id = new.id and i.custo_unitario_snapshot is null;
    if not exists (select 1 from lancamentos where pedido_id = new.id and tipo = 'entrada') then
      select 'Pedido: ' || string_agg(rc.nome || ' x' || pi.quantidade, ', ')
        into v_desc
      from pedido_itens pi left join receitas rc on rc.id = pi.receita_id
      where pi.pedido_id = new.id;
      begin
        insert into lancamentos (user_id, tipo, descricao, valor, pedido_id, data, forma_pagamento)
        values (new.user_id, 'entrada', coalesce(v_desc, 'Pedido'), new.valor_total, new.id, current_date,
                coalesce(new.forma_pagamento_confirmada, new.forma_pagamento_prevista));
      exception when unique_violation then null; end;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists pedido_pago_entrada on pedidos;
create trigger pedido_pago_entrada
  after insert or update on pedidos
  for each row execute function trg_pedido_pago_entrada();

-- 7) confirmar_pedido (baixa a_pagar->pago com forma). O trigger acima faz snapshot + lançamento.
create or replace function confirmar_pedido(p_pedido_id uuid, p_forma_pagamento uuid default null)
returns jsonb language plpgsql as $$
declare p pedidos; v_ja boolean;
begin
  select * into p from pedidos where id = p_pedido_id;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Pedido não encontrado.'); end if;
  v_ja := exists (select 1 from lancamentos where pedido_id = p_pedido_id and tipo = 'entrada');
  update pedidos
     set status_pagamento = 'pago',
         forma_pagamento_confirmada = coalesce(p_forma_pagamento, forma_pagamento_confirmada, forma_pagamento_prevista)
   where id = p_pedido_id;
  return jsonb_build_object('ok', true, 'ja_confirmado', v_ja, 'valor', p.valor_total);
end $$;

-- 8) Remove colunas antigas de pedidos (agora vivem em pedido_itens)
alter table pedidos drop column if exists receita_id;
alter table pedidos drop column if exists quantidade;
alter table pedidos drop column if exists custo_unitario_snapshot;
