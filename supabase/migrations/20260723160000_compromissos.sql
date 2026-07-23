-- Doce Gestão — Fase 11: Agenda (compromissos avulsos).
-- A agenda MESCLA três fontes na tela: entregas de pedidos (já existem), aniversários
-- de clientes (já existem) e estes compromissos avulsos. Só os avulsos viram tabela.
-- RLS igual às demais. Re-executável.

create table if not exists compromissos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  data date not null,
  hora time,                      -- opcional; compromisso pode ser "no dia", sem hora
  observacao text,
  criado_em timestamptz not null default now()
);
alter table compromissos enable row level security;
drop policy if exists dono_compromissos on compromissos;
create policy dono_compromissos on compromissos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_compromissos_user_data on compromissos(user_id, data);
