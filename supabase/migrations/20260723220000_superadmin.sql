-- Doce Gestão — Fase 19: Painel Superadmin (gestão manual de contas).
-- Modelo de acesso por ASSINATURA: `acesso_ate` = até quando o acesso está pago.
-- Passou a data e não renovou → perde o acesso (sem botão de suspender). null = sem cobrança/liberado.
-- Superadmin vê/edita só METADADOS de conta (perfis); dados de negócio continuam privados.

-- ============================================================
-- 1) Novas colunas em perfis
-- ============================================================
alter table perfis add column if not exists email text;
alter table perfis add column if not exists acesso_ate date;              -- assinatura paga até
alter table perfis add column if not exists ultima_atividade timestamptz; -- último pedido/lançamento

-- email vem do auth.users (o cliente do superadmin não lê auth.users direto).
update perfis p set email = u.email from auth.users u where u.id = p.user_id and p.email is null;

-- ============================================================
-- 2) Quem é superadmin (SECURITY DEFINER evita recursão de RLS em perfis)
-- ============================================================
create or replace function eh_superadmin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_superadmin from perfis where user_id = auth.uid()), false);
$$;

-- ============================================================
-- 3) RLS: superadmin lê e edita todos os perfis (só perfis!).
-- Policies permissivas (OR) somam-se à dono_perfil já existente.
-- ============================================================
drop policy if exists admin_le_perfis on perfis;
create policy admin_le_perfis on perfis for select using (eh_superadmin());
drop policy if exists admin_edita_perfis on perfis;
create policy admin_edita_perfis on perfis for update using (eh_superadmin()) with check (eh_superadmin());

-- ============================================================
-- 4) Trava anti-escalonamento: usuário comum NÃO muda plano/assinatura/superadmin
-- de si mesmo (ele ainda edita nome, percentuais, etc.). Só o superadmin muda.
-- ============================================================
create or replace function trg_protege_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not eh_superadmin() then
    new.plano           := old.plano;
    new.is_superadmin   := old.is_superadmin;
    new.acesso_ate      := old.acesso_ate;
    new.pagamento_em_dia:= old.pagamento_em_dia;
    new.email           := old.email;
  end if;
  return new;
end $$;
drop trigger if exists protege_perfil on perfis;
create trigger protege_perfil before update on perfis
  for each row execute function trg_protege_perfil();

-- ============================================================
-- 5) Última atividade: qualquer pedido/lançamento carimba perfis.ultima_atividade.
-- (só um timestamp — o superadmin vê atividade sem ver os dados de negócio.)
-- ============================================================
create or replace function trg_marca_atividade()
returns trigger language plpgsql as $$
begin
  update perfis set ultima_atividade = now() where user_id = new.user_id;
  return new;
end $$;
drop trigger if exists marca_atividade_lanc on lancamentos;
create trigger marca_atividade_lanc after insert on lancamentos
  for each row execute function trg_marca_atividade();
drop trigger if exists marca_atividade_ped on pedidos;
create trigger marca_atividade_ped after insert on pedidos
  for each row execute function trg_marca_atividade();

-- ============================================================
-- 6) trg_novo_perfil passa a gravar o email também.
-- ============================================================
create or replace function trg_novo_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (user_id, nome, email)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'nome'), ''), new.email)
  on conflict (user_id) do nothing;
  perform seed_padroes_usuario(new.id);
  return new;
end $$;

-- ============================================================
-- 7) Marca a conta de teste como superadmin (para poder testar o painel).
-- TROCAR para a conta real do Leonardo quando ela existir.
-- ============================================================
update perfis set is_superadmin = true
  where user_id = (select id from auth.users where email = 'teste@docegestao.com');
