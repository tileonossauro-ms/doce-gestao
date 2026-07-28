-- Doce Gestão — registra QUANDO o pedido foi realmente entregue.
-- Gatilho preenche entregue_em ao virar 'entregue' (por qualquer caminho: agenda ou pedidos)
-- e limpa se voltar atrás. Assim a tela de Pedidos pode separar "em aberto" x "entregues".
alter table pedidos add column if not exists entregue_em timestamptz;

create or replace function trg_pedido_entregue_em()
returns trigger language plpgsql as $$
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue' then
    new.entregue_em := now();
  elsif new.status <> 'entregue' then
    new.entregue_em := null;
  end if;
  return new;
end $$;
drop trigger if exists pedido_entregue_em on pedidos;
create trigger pedido_entregue_em before update on pedidos
  for each row execute function trg_pedido_entregue_em();

-- Backfill: pedidos já 'entregue' sem data ganham a data de criação como aproximação.
update pedidos set entregue_em = criado_em where status = 'entregue' and entregue_em is null;
