-- Doce Gestão — pedido pode ser Entrega (você leva) ou Retirada (cliente busca).
-- Vira um flag na Agenda. Re-executável.
alter table pedidos add column if not exists tipo_entrega text not null default 'entrega'
  check (tipo_entrega in ('entrega','retirada'));
