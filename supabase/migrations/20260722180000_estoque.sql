-- Doce Gestão — Fase 9: controle de estoque.
-- Estoque em ingredientes + movimentações + baixa automática por item na baixa do pedido.
-- Re-executável. Estoque pode ficar negativo (alerta na UI, nunca bloqueia).

-- 1) ingredientes: estoque + limite mínimo (estoque_minimo antecipado p/ badge amarelo e F10)
alter table ingredientes add column if not exists estoque_atual numeric not null default 0;
alter table ingredientes add column if not exists estoque_minimo numeric not null default 0;

-- 2) movimentações de estoque
create table if not exists movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingrediente_id uuid not null references ingredientes(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','ajuste','consumo')),
  quantidade numeric not null,   -- na unidade do ingrediente. consumo = valor positivo consumido.
  pedido_id uuid references pedidos(id) on delete set null,
  observacao text,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);
alter table movimentacoes_estoque enable row level security;
drop policy if exists dono_movimentacoes on movimentacoes_estoque;
create policy dono_movimentacoes on movimentacoes_estoque for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_mov_ingrediente on movimentacoes_estoque(ingrediente_id);
create index if not exists idx_mov_user on movimentacoes_estoque(user_id);
create index if not exists idx_mov_consumo on movimentacoes_estoque(tipo, data);

-- 3) toda movimentação aplica o delta no estoque_atual do ingrediente
create or replace function trg_mov_estoque_aplica()
returns trigger language plpgsql as $$
begin
  update ingredientes
     set estoque_atual = estoque_atual +
         case new.tipo when 'consumo' then -new.quantidade else new.quantidade end
   where id = new.ingrediente_id;
  return null;
end $$;
drop trigger if exists mov_estoque_aplica on movimentacoes_estoque;
create trigger mov_estoque_aplica after insert on movimentacoes_estoque
  for each row execute function trg_mov_estoque_aplica();

-- 4) estende o gatilho de "pago" (F14) para também gerar o consumo por item (idempotente)
create or replace function trg_pedido_pago_entrada()
returns trigger language plpgsql as $$
declare v_desc text;
begin
  if new.status_pagamento = 'pago'
     and (tg_op = 'INSERT' or old.status_pagamento is distinct from 'pago') then
    -- snapshot de custo por item
    update pedido_itens i set custo_unitario_snapshot = _custo_unit_receita(i.receita_id)
      where i.pedido_id = new.id and i.custo_unitario_snapshot is null;

    -- lançamento de entrada (1 por pedido)
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

    -- baixa de estoque: consumo por ingrediente de cada item (1 vez por pedido)
    if not exists (select 1 from movimentacoes_estoque where pedido_id = new.id and tipo = 'consumo') then
      insert into movimentacoes_estoque (user_id, ingrediente_id, tipo, quantidade, pedido_id, observacao)
      select new.user_id, ri.ingrediente_id, 'consumo',
             round((ri.quantidade / r.rendimento) * pi.quantidade, 4),
             new.id, 'Baixa automática do pedido'
      from pedido_itens pi
      join receitas r on r.id = pi.receita_id
      join receita_ingredientes ri on ri.receita_id = pi.receita_id
      where pi.pedido_id = new.id and r.rendimento is not null and r.rendimento <> 0;
    end if;
  end if;
  return new;
end $$;
-- o trigger pedido_pago_entrada já existe (F14) e chama esta função; não precisa recriar.
