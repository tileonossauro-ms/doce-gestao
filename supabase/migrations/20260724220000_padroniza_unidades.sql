-- Doce Gestão — padroniza unidades de ingrediente.
-- Regra nova: a RECEITA sempre usa a unidade-base do tipo (Peso→g, Volume→ml, Contável→un).
-- kg/L deixam de ser unidade de USO; viram só conveniência na COMPRA (o front converte).
-- Também consolida o catálogo (mesmo produto em vários tamanhos → um só). Re-executável.

-- ============================================================
-- 1) Normaliza qualquer ingrediente em kg/L para g/ml (converte tudo junto)
-- ============================================================
-- Quantidades usadas em receitas e movimentações precisam ×1000 (kg→g, L→ml).
update receita_ingredientes ri set quantidade = quantidade * 1000
  from ingredientes i where ri.ingrediente_id = i.id and i.unidade in ('kg','L');
update movimentacoes_estoque m set quantidade = quantidade * 1000
  from ingredientes i where m.ingrediente_id = i.id and i.unidade in ('kg','L');
-- No ingrediente: custo por unidade ÷1000, estoque/tamanho ×1000.
update ingredientes set
  custo_unitario   = custo_unitario / 1000,
  estoque_atual    = estoque_atual * 1000,
  estoque_minimo   = estoque_minimo * 1000,
  tamanho_embalagem = tamanho_embalagem * 1000,
  unidade          = case unidade when 'kg' then 'g' when 'L' then 'ml' end
where unidade in ('kg','L');

-- ============================================================
-- 2) Consolida o catálogo: apaga os itens semeados (duplicados por tamanho) que
-- estão INTOCADOS (sem preço, sem estoque, sem uso). Só nomes do seed antigo.
-- ============================================================
delete from ingredientes i
where i.custo_unitario is null
  and coalesce(i.estoque_atual,0) = 0 and coalesce(i.estoque_minimo,0) = 0
  and not exists (select 1 from receita_ingredientes r where r.ingrediente_id = i.id)
  and not exists (select 1 from movimentacoes_estoque m where m.ingrediente_id = i.id)
  and i.nome in (
    'Chocolate meio amargo 80g','Chocolate meio amargo 1,01kg','Chocolate meio amargo 2,05kg',
    'Chocolate ao leite 1,01kg','Chocolate branco 1,01kg','Chocolate em pó 50% 200g','Chocolate em pó 50% 1kg',
    'Cacau em pó 100% 200g','Leite condensado 395g','Leite condensado 2,5kg','Creme de leite 200g','Creme de leite 1kg',
    'Leite em pó 300g','Leite em pó 1kg','Açúcar refinado 1kg','Açúcar refinado 5kg','Açúcar de confeiteiro 500g',
    'Farinha de trigo 1kg','Farinha de trigo 5kg','Manteiga sem sal 200g','Manteiga sem sal 500g','Margarina 500g',
    'Ovos (dúzia)','Fermento químico 100g','Chantilly 1L','Glucose de milho 1kg','Essência de baunilha 30ml',
    'Coco ralado 100g','Granulado/confeitos 500g','Caixa para bolo','Caixa para 6 doces','Caixa para 4 doces',
    'Forminha nº 4 (papel)','Forminha para trufa','Blister para trufa','Sacola kraft','Sacola plástica',
    'Fita de cetim (rolo)','Papel manteiga (rolo)','Pote/marmita para bolo no pote','Colher descartável','Tag/etiqueta'
  );

-- ============================================================
-- 3) Catálogo limpo: um produto por item, na unidade-base. Top-up por nome (não duplica).
-- ============================================================
create or replace function seed_catalogo_usuario(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  produtos text[][] := array[
    -- {nome, unidade-base}
    ['Chocolate meio amargo','g'],['Chocolate ao leite','g'],['Chocolate branco','g'],
    ['Chocolate em pó 50%','g'],['Cacau em pó 100%','g'],['Leite condensado','g'],['Creme de leite','g'],
    ['Leite em pó','g'],['Açúcar refinado','g'],['Açúcar de confeiteiro','g'],['Farinha de trigo','g'],
    ['Manteiga sem sal','g'],['Margarina','g'],['Fermento químico','g'],['Coco ralado','g'],
    ['Granulado/confeitos','g'],['Glucose de milho','g'],
    ['Chantilly','ml'],['Essência de baunilha','ml'],
    ['Ovo','un'],['Caixa para bolo','un'],['Caixa para 6 doces','un'],['Caixa para 4 doces','un'],
    ['Forminha nº 4','un'],['Forminha para trufa','un'],['Blister para trufa','un'],
    ['Sacola kraft','un'],['Sacola plástica','un'],['Fita de cetim','un'],['Papel manteiga','un'],
    ['Pote para bolo no pote','un'],['Colher descartável','un'],['Tag/etiqueta','un']
  ];
  i int;
begin
  -- Marcas comuns
  insert into marcas (user_id, nome) values
    (p_uid,'Sicao'),(p_uid,'Callebaut'),(p_uid,'Harald Melken'),(p_uid,'Harald Top'),(p_uid,'Garoto'),
    (p_uid,'Nestlé'),(p_uid,'Dr. Oetker'),(p_uid,'Mavalério'),(p_uid,'Moça'),(p_uid,'Itambé'),
    (p_uid,'Piracanjuba'),(p_uid,'Italac'),(p_uid,'Ninho'),(p_uid,'Amélia'),(p_uid,'Vigor'),
    (p_uid,'Aviação'),(p_uid,'President'),(p_uid,'Dona Benta'),(p_uid,'Renata'),(p_uid,'Royal')
  on conflict (user_id, nome) do nothing;

  insert into fornecedores (user_id, nome, contato) values
    (p_uid,'Atacadão',null),(p_uid,'Assaí Atacadista',null),(p_uid,'Makro',null),
    (p_uid,'Casa do Confeiteiro',null),(p_uid,'Empório das Embalagens',null),(p_uid,'Mercado do bairro',null)
  on conflict (user_id, nome) do nothing;

  -- Ingredientes: um por produto, só se ainda não existir com esse nome.
  for i in 1 .. array_length(produtos,1) loop
    insert into ingredientes (user_id, nome, unidade, custo_unitario, estoque_atual, estoque_minimo)
    select p_uid, produtos[i][1], produtos[i][2], null, 0, 0
    where not exists (select 1 from ingredientes where user_id = p_uid and nome = produtos[i][1]);
  end loop;
end $$;

-- Backfill: todo mundo recebe o catálogo limpo (top-up, sem duplicar).
do $$ declare u record; begin
  for u in select id from auth.users loop perform seed_catalogo_usuario(u.id); end loop;
end $$;
