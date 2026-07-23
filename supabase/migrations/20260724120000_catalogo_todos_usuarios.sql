-- Doce Gestão — catálogo inicial para TODO usuário novo (não só o de teste).
-- Move o catálogo (marcas, fornecedores, ingredientes + embalagens) para uma função
-- por-usuário, chamada no signup, e faz backfill de quem já existe.
-- Idempotente: marcas/fornecedores via ON CONFLICT; ingredientes só se o usuário ainda não tem nenhum.

create or replace function seed_catalogo_usuario(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Marcas comuns entre confeiteiros
  insert into marcas (user_id, nome) values
    (p_uid,'Sicao'), (p_uid,'Callebaut'), (p_uid,'Harald Melken'), (p_uid,'Harald Top'), (p_uid,'Garoto'),
    (p_uid,'Nestlé'), (p_uid,'Dr. Oetker'), (p_uid,'Mavalério'), (p_uid,'Moça'), (p_uid,'Itambé'),
    (p_uid,'Piracanjuba'), (p_uid,'Italac'), (p_uid,'Ninho'), (p_uid,'Amélia'), (p_uid,'Vigor'),
    (p_uid,'Aviação'), (p_uid,'President'), (p_uid,'Dona Benta'), (p_uid,'Renata'), (p_uid,'Royal')
  on conflict (user_id, nome) do nothing;

  -- Fornecedores comuns (atacados e lojas do ramo)
  insert into fornecedores (user_id, nome, contato) values
    (p_uid,'Atacadão', null), (p_uid,'Assaí Atacadista', null), (p_uid,'Makro', null),
    (p_uid,'Casa do Confeiteiro', null), (p_uid,'Empório das Embalagens', null), (p_uid,'Mercado do bairro', null)
  on conflict (user_id, nome) do nothing;

  -- Ingredientes/insumos + embalagens (só se o usuário ainda não tem nenhum ingrediente).
  -- custo_unitario em branco: ela só edita os preços depois.
  if not exists (select 1 from ingredientes where user_id = p_uid) then
    insert into ingredientes (user_id, nome, unidade, custo_unitario, estoque_atual, estoque_minimo) values
      (p_uid,'Chocolate meio amargo 80g','g',null,0,0),
      (p_uid,'Chocolate meio amargo 1,01kg','g',null,0,0),
      (p_uid,'Chocolate meio amargo 2,05kg','g',null,0,0),
      (p_uid,'Chocolate ao leite 1,01kg','g',null,0,0),
      (p_uid,'Chocolate branco 1,01kg','g',null,0,0),
      (p_uid,'Chocolate em pó 50% 200g','g',null,0,0),
      (p_uid,'Chocolate em pó 50% 1kg','g',null,0,0),
      (p_uid,'Cacau em pó 100% 200g','g',null,0,0),
      (p_uid,'Leite condensado 395g','g',null,0,0),
      (p_uid,'Leite condensado 2,5kg','g',null,0,0),
      (p_uid,'Creme de leite 200g','g',null,0,0),
      (p_uid,'Creme de leite 1kg','g',null,0,0),
      (p_uid,'Leite em pó 300g','g',null,0,0),
      (p_uid,'Leite em pó 1kg','g',null,0,0),
      (p_uid,'Açúcar refinado 1kg','g',null,0,0),
      (p_uid,'Açúcar refinado 5kg','g',null,0,0),
      (p_uid,'Açúcar de confeiteiro 500g','g',null,0,0),
      (p_uid,'Farinha de trigo 1kg','g',null,0,0),
      (p_uid,'Farinha de trigo 5kg','g',null,0,0),
      (p_uid,'Manteiga sem sal 200g','g',null,0,0),
      (p_uid,'Manteiga sem sal 500g','g',null,0,0),
      (p_uid,'Margarina 500g','g',null,0,0),
      (p_uid,'Ovos (dúzia)','un',null,0,0),
      (p_uid,'Fermento químico 100g','g',null,0,0),
      (p_uid,'Chantilly 1L','ml',null,0,0),
      (p_uid,'Glucose de milho 1kg','g',null,0,0),
      (p_uid,'Essência de baunilha 30ml','ml',null,0,0),
      (p_uid,'Coco ralado 100g','g',null,0,0),
      (p_uid,'Granulado/confeitos 500g','g',null,0,0),
      -- embalagens e descartáveis (unidade 'un')
      (p_uid,'Caixa para bolo','un',null,0,0),
      (p_uid,'Caixa para 6 doces','un',null,0,0),
      (p_uid,'Caixa para 4 doces','un',null,0,0),
      (p_uid,'Forminha nº 4 (papel)','un',null,0,0),
      (p_uid,'Forminha para trufa','un',null,0,0),
      (p_uid,'Blister para trufa','un',null,0,0),
      (p_uid,'Sacola kraft','un',null,0,0),
      (p_uid,'Sacola plástica','un',null,0,0),
      (p_uid,'Fita de cetim (rolo)','un',null,0,0),
      (p_uid,'Papel manteiga (rolo)','un',null,0,0),
      (p_uid,'Pote/marmita para bolo no pote','un',null,0,0),
      (p_uid,'Colher descartável','un',null,0,0),
      (p_uid,'Tag/etiqueta','un',null,0,0);
  end if;
end $$;

-- Signup passa a semear também o catálogo (preserva perfil + padrões da versão anterior).
create or replace function trg_novo_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (user_id, nome, email)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'nome'), ''), new.email)
  on conflict (user_id) do nothing;
  perform seed_padroes_usuario(new.id);
  perform seed_catalogo_usuario(new.id);
  return new;
end $$;

-- Backfill: usuários já existentes que ainda não têm o catálogo recebem agora (guarda evita duplicar).
do $$
declare u record;
begin
  for u in select id from auth.users loop
    perform seed_catalogo_usuario(u.id);
  end loop;
end $$;
