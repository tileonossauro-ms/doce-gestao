-- Doce Gestão — Fase 17: custo fixo na precificação + tabela `perfis`.
-- `perfis` é 1 linha por usuário e substitui o localStorage das configurações.
-- Já traz as colunas que as Fases 18 (plano) e 19 (superadmin) vão usar, para não
-- precisar de outra migration nem de outro backfill depois. Re-executável.

-- ============================================================
-- PERFIS (configurações + dados de conta)
-- ============================================================
create table if not exists perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text,

  -- precificação (Fase 17)
  pct_indireto_padrao   numeric not null default 10,
  pct_margem_padrao     numeric not null default 30,
  pct_taxas_padrao      numeric not null default 5,
  pct_custo_fixo_padrao numeric not null default 0,
  modo_custo_fixo text not null default 'manual' check (modo_custo_fixo in ('manual','automatico')),
  estimativa_faturamento_mensal numeric,

  -- janela usada pelas sugestões dos Relatórios (Fase 10, saiu do localStorage)
  janela_analise_dias int not null default 60 check (janela_analise_dias in (30,60,90)),

  -- conta: preenchidas agora, usadas nas Fases 18/19 (nada no app lê ainda)
  plano text not null default 'basico' check (plano in ('basico','pro')),
  is_superadmin boolean not null default false,
  status_conta text not null default 'ativo' check (status_conta in ('ativo','suspenso')),
  pagamento_em_dia boolean not null default true,

  criado_em timestamptz not null default now()
);
alter table perfis enable row level security;
drop policy if exists dono_perfil on perfis;
create policy dono_perfil on perfis for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Todo usuário novo ganha seu perfil no cadastro.
-- security definer: o trigger roda no contexto do signup, antes de existir sessão.
create or replace function trg_novo_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (user_id, nome)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'nome'), ''))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists novo_perfil on auth.users;
create trigger novo_perfil after insert on auth.users
  for each row execute function trg_novo_perfil();

-- Backfill dos usuários que já existiam.
insert into perfis (user_id, nome)
select id, nullif(trim(raw_user_meta_data->>'nome'), '') from auth.users
on conflict (user_id) do nothing;

-- ============================================================
-- 4º PERCENTUAL NA RECEITA
-- ============================================================
alter table receitas add column if not exists pct_custo_fixo numeric not null default 0;

-- ============================================================
-- calcular_preco — agora com 4 percentuais no denominador.
-- preco = custo_unidade × (1 + indireto/100) / (1 − margem/100 − taxas/100 − custo_fixo/100)
-- Continua simples: lê só o que está gravado na receita, não consulta custos_fixos.
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

  select count(*) into v_sem_custo
  from receita_ingredientes ri
  join ingredientes i on i.id = ri.ingrediente_id
  where ri.receita_id = p_receita_id and i.custo_unitario is null;

  if v_sem_custo > 0 then
    update receitas set status = 'pendente' where id = p_receita_id;
    return jsonb_build_object('ok', false,
      'erro', 'Há ingrediente(s) sem custo unitário. Preencha o custo antes de calcular.');
  end if;

  select coalesce(sum(ri.quantidade * i.custo_unitario), 0) into v_custo_direto
  from receita_ingredientes ri
  join ingredientes i on i.id = ri.ingrediente_id
  where ri.receita_id = p_receita_id;

  if r.rendimento is null or r.rendimento = 0 then
    update receitas set status = 'pendente', custo_direto = round(v_custo_direto, 2)
      where id = p_receita_id;
    return jsonb_build_object('ok', false, 'erro', 'Rendimento deve ser maior que zero.');
  end if;

  if coalesce(r.pct_margem, 0) + coalesce(r.pct_taxas, 0) + coalesce(r.pct_custo_fixo, 0) >= 100 then
    update receitas set status = 'pendente', custo_direto = round(v_custo_direto, 2)
      where id = p_receita_id;
    return jsonb_build_object('ok', false,
      'erro', 'Margem + taxas + custo fixo devem somar menos de 100%.');
  end if;

  v_custo_unid  := v_custo_direto / r.rendimento;
  v_denominador := 1 - r.pct_margem / 100.0 - r.pct_taxas / 100.0 - coalesce(r.pct_custo_fixo, 0) / 100.0;
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
    'lucro_unidade',     v_lucro,
    'custo_fixo_unidade', round(v_preco * coalesce(r.pct_custo_fixo, 0) / 100.0, 2)
  );
end $$;
