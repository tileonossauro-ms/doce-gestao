-- Doce Gestão — schema inicial + RLS
-- Pode ser rodado inteiro no SQL Editor do Supabase. É re-executável (idempotente).

-- ============================================================
-- TABELAS
-- ============================================================

-- 1) INGREDIENTES
create table if not exists ingredientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  unidade text not null check (unidade in ('g','ml','un','kg','L')),
  custo_unitario numeric,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- 2) RECEITAS
create table if not exists receitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  rendimento numeric,
  custo_direto numeric not null default 0,
  pct_indireto numeric not null default 0,
  pct_margem numeric not null default 0,
  pct_taxas numeric not null default 0,
  preco_sugerido numeric,
  status text not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- 3) RECEITA_INGREDIENTES (itens de cada receita)
create table if not exists receita_ingredientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receita_id uuid not null references receitas(id) on delete cascade,
  ingrediente_id uuid not null references ingredientes(id) on delete restrict,
  quantidade numeric not null
);

-- 4) CLIENTES
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  aniversario date,
  observacao text,
  criado_em timestamptz not null default now()
);

-- 5) PEDIDOS
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete set null,
  receita_id uuid references receitas(id) on delete set null,
  quantidade int not null,
  valor_total numeric not null,
  status text not null default 'novo' check (status in ('novo','em produção','entregue')),
  data_entrega date,
  flag_revisao boolean not null default false,
  criado_em timestamptz not null default now()
);

-- 6) LANCAMENTOS (fluxo de caixa)
create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text,
  valor numeric not null,
  pedido_id uuid references pedidos(id) on delete set null,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES (busca por dono / relacionamentos)
-- ============================================================
create index if not exists idx_ingredientes_user on ingredientes(user_id);
create index if not exists idx_receitas_user on receitas(user_id);
create index if not exists idx_receita_ingredientes_receita on receita_ingredientes(receita_id);
create index if not exists idx_receita_ingredientes_user on receita_ingredientes(user_id);
create index if not exists idx_clientes_user on clientes(user_id);
create index if not exists idx_pedidos_user on pedidos(user_id);
create index if not exists idx_lancamentos_user on lancamentos(user_id);
create index if not exists idx_lancamentos_pedido on lancamentos(pedido_id);

-- ============================================================
-- RLS — cada confeiteiro vê apenas os próprios dados
-- ============================================================
alter table ingredientes          enable row level security;
alter table receitas              enable row level security;
alter table receita_ingredientes  enable row level security;
alter table clientes              enable row level security;
alter table pedidos               enable row level security;
alter table lancamentos           enable row level security;

-- Uma policy por tabela cobrindo select/insert/update/delete.
-- drop antes de create para o script poder rodar de novo sem erro.
drop policy if exists dono_ingredientes on ingredientes;
create policy dono_ingredientes on ingredientes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dono_receitas on receitas;
create policy dono_receitas on receitas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dono_receita_ingredientes on receita_ingredientes;
create policy dono_receita_ingredientes on receita_ingredientes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dono_clientes on clientes;
create policy dono_clientes on clientes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dono_pedidos on pedidos;
create policy dono_pedidos on pedidos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dono_lancamentos on lancamentos;
create policy dono_lancamentos on lancamentos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
