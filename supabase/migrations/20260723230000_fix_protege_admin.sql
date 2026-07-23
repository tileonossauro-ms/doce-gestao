-- Doce Gestão — correção do gatilho de proteção do perfil.
-- Bug: trg_protege_perfil revertia is_superadmin/plano até quando a mudança vinha da
-- própria migration ou do SQL Editor (onde auth.uid() é null), pois eh_superadmin()
-- devolve false sem usuário logado. A proteção só deve valer para um usuário LOGADO
-- que não é admin. Sem sessão (migration/service role/painel), a mudança é legítima.

create or replace function trg_protege_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not eh_superadmin() then
    new.plano           := old.plano;
    new.is_superadmin   := old.is_superadmin;
    new.acesso_ate      := old.acesso_ate;
    new.pagamento_em_dia:= old.pagamento_em_dia;
    new.email           := old.email;
  end if;
  return new;
end $$;

-- Reaplica a promoção da conta de teste (agora não é mais bloqueada).
update perfis set is_superadmin = true
  where user_id = (select id from auth.users where email = 'teste@docegestao.com');

-- Quando o Leonardo criar a conta real, promova rodando no Supabase › SQL Editor:
--   update perfis set is_superadmin = true where email = 'leonardo@granddos.tech';
