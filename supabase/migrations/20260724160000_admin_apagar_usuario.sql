-- Doce Gestão — superadmin apaga uma conta (e tudo dela, em cascata).
-- Segurança: só superadmin; nunca a própria conta. security definer para poder mexer em auth.users.
-- Apagar de auth.users cascateia para perfis e todas as tabelas do usuário (FKs on delete cascade).

create or replace function admin_apagar_usuario(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from perfis where user_id = auth.uid() and is_superadmin) then
    raise exception 'Apenas o superadmin pode apagar contas.';
  end if;
  if p_uid = auth.uid() then
    raise exception 'Você não pode apagar a própria conta.';
  end if;
  delete from auth.users where id = p_uid;
end $$;

revoke all on function admin_apagar_usuario(uuid) from public, anon;
grant execute on function admin_apagar_usuario(uuid) to authenticated;
