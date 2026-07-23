-- Doce Gestão — Fase 15: custos fixos + categoria nos lançamentos (base do DRE).
-- RLS igual às demais (dono via auth.uid()). Re-executável.

-- ============================================================
-- CUSTOS FIXOS
-- Vigência por datas (inicio/fim) em vez de um booleano "ativo": o DRE de um mês
-- passado não pode mudar porque a confeiteira parou de pagar o aluguel hoje.
-- "Ativo" na tela = fim is null.
-- ============================================================
create table if not exists custos_fixos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  valor_mensal numeric not null default 0,
  categoria_id uuid references categorias_financeiras(id) on delete set null,
  inicio date not null default current_date,
  fim date,
  criado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
alter table custos_fixos enable row level security;
drop policy if exists dono_custos_fixos on custos_fixos;
create policy dono_custos_fixos on custos_fixos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_custos_fixos_user on custos_fixos(user_id);

-- ============================================================
-- CATEGORIA NOS LANÇAMENTOS (separa custo variável de fixo no DRE)
-- ============================================================
alter table lancamentos add column if not exists categoria_id uuid references categorias_financeiras(id) on delete set null;
create index if not exists idx_lancamentos_categoria on lancamentos(categoria_id);

-- Categorias que NÃO entram no DRE porque o valor já entra por outro caminho.
-- Caso de hoje: "Ingrediente" — o custo do ingrediente já entra pelo snapshot da venda,
-- então a compra lançada no Financeiro seria contada duas vezes.
alter table categorias_financeiras add column if not exists conta_no_dre boolean not null default true;
update categorias_financeiras set conta_no_dre = false where lower(nome) = 'ingrediente';

-- ============================================================
-- SEED (usuário de teste) — só se ele ainda não tiver nenhum custo fixo
-- ============================================================
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'teste@docegestao.com';
  if uid is null then return; end if;
  if exists (select 1 from custos_fixos where user_id = uid) then return; end if;

  insert into custos_fixos (user_id, nome, valor_mensal, categoria_id, inicio)
  select uid, v.nome, v.valor, c.id, date '2026-01-01'
  from (values ('Aluguel do espaço', 800), ('Energia elétrica', 150), ('Internet', 100)) as v(nome, valor)
  left join categorias_financeiras c
    on c.user_id = uid and c.nome = case v.nome when 'Aluguel do espaço' then 'Aluguel'
                                                when 'Energia elétrica' then 'Energia'
                                                else 'Ferramentas/assinaturas' end;
end $$;
