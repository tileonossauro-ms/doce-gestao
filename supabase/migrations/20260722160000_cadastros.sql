-- Doce Gestão — Fase 16: cadastros de Formas de pagamento e Categorias financeiras.
-- RLS igual às demais (dono via auth.uid()). Re-executável.

-- ============================================================
-- FORMAS DE PAGAMENTO
-- ============================================================
create table if not exists formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, nome)
);
alter table formas_pagamento enable row level security;
drop policy if exists dono_formas_pagamento on formas_pagamento;
create policy dono_formas_pagamento on formas_pagamento for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_formas_pagamento_user on formas_pagamento(user_id);

-- ============================================================
-- CATEGORIAS FINANCEIRAS (unifica categoria de custos_fixos e de lançamentos)
-- ============================================================
create table if not exists categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'ambos' check (tipo in ('fixo','variavel','ambos')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, nome)
);
alter table categorias_financeiras enable row level security;
drop policy if exists dono_categorias on categorias_financeiras;
create policy dono_categorias on categorias_financeiras for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_categorias_user on categorias_financeiras(user_id);

-- ============================================================
-- SEED (usuário de teste) — padrões editáveis
-- ============================================================
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'teste@docegestao.com';
  if uid is null then return; end if;

  insert into formas_pagamento (user_id, nome) values
    (uid, 'Dinheiro'),
    (uid, 'Pix'),
    (uid, 'Cartão de crédito'),
    (uid, 'Cartão de débito'),
    (uid, 'Outro')
  on conflict (user_id, nome) do nothing;

  insert into categorias_financeiras (user_id, nome, tipo) values
    (uid, 'Aluguel', 'fixo'),
    (uid, 'Energia', 'fixo'),
    (uid, 'Ferramentas/assinaturas', 'fixo'),
    (uid, 'Mão de obra', 'fixo'),
    (uid, 'Retirada/pró-labore', 'fixo'),
    (uid, 'Embalagem', 'variavel'),
    (uid, 'Ingrediente', 'variavel'),
    (uid, 'Taxa', 'variavel'),
    (uid, 'Marketing', 'ambos'),
    (uid, 'Outro', 'ambos')
  on conflict (user_id, nome) do nothing;
end $$;
