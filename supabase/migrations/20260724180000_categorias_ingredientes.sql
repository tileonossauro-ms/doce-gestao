-- Doce Gestão — Categorias de ingrediente (1 nível), lógica de "prateleira de supermercado".
-- Pré-cadastradas por usuário; os produtos do catálogo já saem classificados.
-- Só cria/insere/atualiza (categoria_id). NÃO apaga nada.

create table if not exists categorias_ingredientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, nome)
);
alter table categorias_ingredientes enable row level security;
drop policy if exists dono_categorias_ing on categorias_ingredientes;
create policy dono_categorias_ing on categorias_ingredientes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_cat_ing_user on categorias_ingredientes(user_id);

alter table ingredientes add column if not exists categoria_id uuid references categorias_ingredientes(id) on delete set null;

-- Classifica os ingredientes SEM categoria de um usuário que casam com algum padrão de nome.
create or replace function _classificar_ing(p_uid uuid, p_cat text, p_patterns text[])
returns void language plpgsql security definer set search_path = public as $$
declare catid uuid;
begin
  select id into catid from categorias_ingredientes where user_id = p_uid and nome = p_cat;
  if catid is null then return; end if;
  update ingredientes i set categoria_id = catid
   where i.user_id = p_uid and i.categoria_id is null
     and exists (select 1 from unnest(p_patterns) pat where lower(i.nome) like lower(pat));
end $$;

-- Cria as categorias padrão do usuário e classifica o catálogo. Idempotente.
create or replace function seed_categorias_ingredientes(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare catid uuid;
begin
  insert into categorias_ingredientes (user_id, nome) values
    (p_uid,'Chocolates e cacau'),
    (p_uid,'Laticínios'),
    (p_uid,'Gorduras'),
    (p_uid,'Açúcares'),
    (p_uid,'Farináceos'),
    (p_uid,'Confeitos e complementos'),
    (p_uid,'Ovos'),
    (p_uid,'Frutas e recheios'),
    (p_uid,'Embalagens e descartáveis'),
    (p_uid,'Outros')
  on conflict (user_id, nome) do nothing;

  perform _classificar_ing(p_uid, 'Chocolates e cacau', array['chocolate%','cacau%']);
  perform _classificar_ing(p_uid, 'Laticínios', array['leite condensado%','creme de leite%','leite em pó%','chantilly%']);
  perform _classificar_ing(p_uid, 'Gorduras', array['manteiga%','margarina%']);
  perform _classificar_ing(p_uid, 'Açúcares', array['açúcar%','glucose%']);
  perform _classificar_ing(p_uid, 'Farináceos', array['farinha%','fermento%']);
  perform _classificar_ing(p_uid, 'Confeitos e complementos', array['coco ralado%','granulado%','confeito%','essência%']);
  perform _classificar_ing(p_uid, 'Ovos', array['ovos%','ovo %']);
  perform _classificar_ing(p_uid, 'Embalagens e descartáveis',
    array['caixa%','forminha%','blister%','sacola%','fita%','papel manteiga%','pote%','colher%','tag%','etiqueta%']);

  -- o que sobrou sem categoria vai para "Outros"
  select id into catid from categorias_ingredientes where user_id = p_uid and nome = 'Outros';
  update ingredientes set categoria_id = catid where user_id = p_uid and categoria_id is null;
end $$;

-- Signup passa a semear também as categorias de ingrediente (após o catálogo).
create or replace function trg_novo_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (user_id, nome, email)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'nome'), ''), new.email)
  on conflict (user_id) do nothing;
  perform seed_padroes_usuario(new.id);
  perform seed_catalogo_usuario(new.id);
  perform seed_categorias_ingredientes(new.id);
  return new;
end $$;

-- Backfill: todos os usuários já existentes ganham as categorias e têm o catálogo classificado.
do $$
declare u record;
begin
  for u in select id from auth.users loop
    perform seed_categorias_ingredientes(u.id);
  end loop;
end $$;
