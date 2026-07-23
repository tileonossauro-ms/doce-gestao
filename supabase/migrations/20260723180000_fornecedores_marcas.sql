-- Doce Gestão — Fase 12: Fornecedores e Marcas + captura de preço/marca nas compras.
-- Objetivo do usuário: com o tempo, comparar quanto cada MARCA custa por unidade de um
-- ingrediente (ex.: leite condensado Itambé x Piracanjuba por kg). Para isso, toda COMPRA
-- (movimentacoes_estoque tipo 'entrada') pode guardar marca, fornecedor e preço pago.
-- "Dado não capturado hoje está perdido" — por isso a captura entra já, mesmo que o
-- relatório completo venha depois. RLS igual às demais. Re-executável.

-- ============================================================
-- MARCAS
-- ============================================================
create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  observacao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, nome)
);
alter table marcas enable row level security;
drop policy if exists dono_marcas on marcas;
create policy dono_marcas on marcas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_marcas_user on marcas(user_id);

-- ============================================================
-- FORNECEDORES
-- ============================================================
create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  contato text,
  observacao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, nome)
);
alter table fornecedores enable row level security;
drop policy if exists dono_fornecedores on fornecedores;
create policy dono_fornecedores on fornecedores for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_fornecedores_user on fornecedores(user_id);

-- ============================================================
-- PREFERÊNCIAS NO INGREDIENTE (só pré-preenchem a compra)
-- ============================================================
alter table ingredientes add column if not exists marca_id uuid references marcas(id) on delete set null;
alter table ingredientes add column if not exists fornecedor_id uuid references fornecedores(id) on delete set null;

-- ============================================================
-- CAPTURA NA COMPRA (movimentacoes_estoque)
-- preco_total = quanto foi pago na compra inteira. Preço por unidade da tela = preco_total/quantidade.
-- ============================================================
alter table movimentacoes_estoque add column if not exists marca_id uuid references marcas(id) on delete set null;
alter table movimentacoes_estoque add column if not exists fornecedor_id uuid references fornecedores(id) on delete set null;
alter table movimentacoes_estoque add column if not exists preco_total numeric;

-- ============================================================
-- SEED (usuário de teste) — só se ainda não houver marcas
-- ============================================================
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'teste@docegestao.com';
  if uid is null then return; end if;
  if exists (select 1 from marcas where user_id = uid) then return; end if;

  insert into marcas (user_id, nome) values (uid, 'Itambé'), (uid, 'Piracanjuba'), (uid, 'Nestlé') on conflict do nothing;
  insert into fornecedores (user_id, nome, contato) values
    (uid, 'Atacadão', '(11) 3000-0000'),
    (uid, 'Mercado do bairro', null)
  on conflict do nothing;
end $$;
