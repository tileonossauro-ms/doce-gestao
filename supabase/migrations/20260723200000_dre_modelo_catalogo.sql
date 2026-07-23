-- Doce Gestão — DRE no modelo do usuário + plano de contas + catálogo pré-cadastrado.
-- 1) categorias ganham grupo_dre (onde a conta entra no DRE gerencial).
-- 2) função que semeia formas de pagamento + plano de contas para CADA usuário (novo e antigo).
-- 3) catálogo de demonstração (fornecedores, marcas, ingredientes em gramaturas, embalagens)
--    para o usuário de teste. Re-executável (ON CONFLICT DO NOTHING / DO UPDATE).

-- ============================================================
-- 1) grupo_dre nas categorias
-- valores: 'deducao' | 'custo_variavel' | 'custo_fixo' | 'investimento'
-- ============================================================
alter table categorias_financeiras add column if not exists grupo_dre text;

-- ============================================================
-- 2) Plano de contas + formas padrão, por usuário (idempotente).
-- Chamada no signup (trigger) e no backfill dos usuários já existentes.
-- ============================================================
create or replace function seed_padroes_usuario(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into formas_pagamento (user_id, nome) values
    (p_uid, 'Dinheiro'), (p_uid, 'Pix'), (p_uid, 'Cartão de crédito'), (p_uid, 'Cartão de débito'), (p_uid, 'Outro')
  on conflict (user_id, nome) do nothing;

  -- tipo: fixo/variavel/ambos (dirige onde vira custo fixo). grupo_dre: linha do DRE.
  -- conta_no_dre=false em "Ingrediente" porque esse custo já entra pelo custo da receita (snapshot).
  insert into categorias_financeiras (user_id, nome, tipo, grupo_dre, conta_no_dre) values
    -- Deduções da receita
    (p_uid, 'Taxa de cartão/Pix',                 'variavel', 'deducao', true),
    (p_uid, 'Comissão de app (iFood, etc.)',      'variavel', 'deducao', true),
    (p_uid, 'Impostos sobre vendas (DAS/Simples)','variavel', 'deducao', true),
    (p_uid, 'Descontos/Devoluções',               'variavel', 'deducao', true),
    -- Custos variáveis (CPV)
    (p_uid, 'Ingrediente',                        'variavel', 'custo_variavel', false),
    (p_uid, 'Embalagem',                          'variavel', 'custo_variavel', true),
    (p_uid, 'Mão de obra extra/Freelancer',       'variavel', 'custo_variavel', true),
    (p_uid, 'Frete/Entrega/Motoboy',              'variavel', 'custo_variavel', true),
    (p_uid, 'Gás/Energia de produção',            'variavel', 'custo_variavel', true),
    (p_uid, 'Perdas/Desperdício',                 'variavel', 'custo_variavel', true),
    -- Custos fixos
    (p_uid, 'Pró-labore',                         'fixo', 'custo_fixo', true),
    (p_uid, 'Salários da equipe',                 'fixo', 'custo_fixo', true),
    (p_uid, 'Encargos (13º, férias, FGTS, INSS)', 'fixo', 'custo_fixo', true),
    (p_uid, 'Aluguel/Condomínio/IPTU',            'fixo', 'custo_fixo', true),
    (p_uid, 'Contas fixas (energia, água, gás)',  'fixo', 'custo_fixo', true),
    (p_uid, 'Internet/Telefone/Sistemas',         'fixo', 'custo_fixo', true),
    (p_uid, 'Contabilidade',                      'fixo', 'custo_fixo', true),
    (p_uid, 'Manutenção de equipamentos',         'fixo', 'custo_fixo', true),
    (p_uid, 'Limpeza/Higiene/EPIs',               'fixo', 'custo_fixo', true),
    (p_uid, 'Marketing/Anúncios',                 'ambos','custo_fixo', true),
    (p_uid, 'Taxas/Alvarás/Vigilância sanitária', 'fixo', 'custo_fixo', true),
    (p_uid, 'Tarifas bancárias',                  'fixo', 'custo_fixo', true),
    (p_uid, 'Outras despesas fixas',              'fixo', 'custo_fixo', true),
    -- Após o lucro operacional
    (p_uid, 'Investimento em equipamentos',       'ambos','investimento', true)
  on conflict (user_id, nome) do update set grupo_dre = excluded.grupo_dre;
end $$;

-- Todo usuário novo já nasce com formas + plano de contas.
create or replace function trg_novo_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (user_id, nome)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'nome'), ''))
  on conflict (user_id) do nothing;
  perform seed_padroes_usuario(new.id);
  return new;
end $$;

-- Backfill de quem já existe.
do $$
declare u record;
begin
  for u in select id from auth.users loop
    perform seed_padroes_usuario(u.id);
  end loop;
end $$;

-- Categorias legadas (seed da Fase 16) ganham o grupo_dre certo, para o DRE agrupá-las.
update categorias_financeiras set grupo_dre = 'custo_fixo'
  where grupo_dre is null and nome in ('Aluguel','Energia','Ferramentas/assinaturas','Mão de obra','Retirada/pró-labore');
update categorias_financeiras set grupo_dre = 'custo_variavel'
  where grupo_dre is null and nome in ('Embalagem','Ingrediente');
update categorias_financeiras set grupo_dre = 'deducao'
  where grupo_dre is null and nome = 'Taxa';
update categorias_financeiras set grupo_dre = 'custo_fixo'
  where grupo_dre is null and nome = 'Marketing';

-- ============================================================
-- 3) CATÁLOGO DE DEMONSTRAÇÃO (só usuário de teste)
-- ============================================================
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'teste@docegestao.com';
  if uid is null then return; end if;

  -- Marcas comuns entre confeiteiros
  insert into marcas (user_id, nome) values
    (uid,'Sicao'), (uid,'Callebaut'), (uid,'Harald Melken'), (uid,'Harald Top'), (uid,'Garoto'),
    (uid,'Nestlé'), (uid,'Dr. Oetker'), (uid,'Mavalério'), (uid,'Moça'), (uid,'Itambé'),
    (uid,'Piracanjuba'), (uid,'Italac'), (uid,'Ninho'), (uid,'Amélia'), (uid,'Vigor'),
    (uid,'Aviação'), (uid,'President'), (uid,'Dona Benta'), (uid,'Renata'), (uid,'Royal')
  on conflict (user_id, nome) do nothing;

  -- Fornecedores comuns (atacados e lojas do ramo)
  insert into fornecedores (user_id, nome, contato) values
    (uid,'Atacadão', null), (uid,'Assaí Atacadista', null), (uid,'Makro', null),
    (uid,'Casa do Confeiteiro', null), (uid,'Empório das Embalagens', null), (uid,'Mercado do bairro', null)
  on conflict (user_id, nome) do nothing;

  -- Ingredientes/insumos em gramaturas comuns. custo_unitario fica em branco (ela preenche/compra).
  -- unidade = unidade de USO na receita (g/ml/un); a gramatura no nome identifica a embalagem que ela compra.
  insert into ingredientes (user_id, nome, unidade, custo_unitario, estoque_atual, estoque_minimo) values
    (uid,'Chocolate meio amargo 80g','g',null,0,0),
    (uid,'Chocolate meio amargo 1,01kg','g',null,0,0),
    (uid,'Chocolate meio amargo 2,05kg','g',null,0,0),
    (uid,'Chocolate ao leite 1,01kg','g',null,0,0),
    (uid,'Chocolate branco 1,01kg','g',null,0,0),
    (uid,'Chocolate em pó 50% 200g','g',null,0,0),
    (uid,'Chocolate em pó 50% 1kg','g',null,0,0),
    (uid,'Cacau em pó 100% 200g','g',null,0,0),
    (uid,'Leite condensado 395g','g',null,0,0),
    (uid,'Leite condensado 2,5kg','g',null,0,0),
    (uid,'Creme de leite 200g','g',null,0,0),
    (uid,'Creme de leite 1kg','g',null,0,0),
    (uid,'Leite em pó 300g','g',null,0,0),
    (uid,'Leite em pó 1kg','g',null,0,0),
    (uid,'Açúcar refinado 1kg','g',null,0,0),
    (uid,'Açúcar refinado 5kg','g',null,0,0),
    (uid,'Açúcar de confeiteiro 500g','g',null,0,0),
    (uid,'Farinha de trigo 1kg','g',null,0,0),
    (uid,'Farinha de trigo 5kg','g',null,0,0),
    (uid,'Manteiga sem sal 200g','g',null,0,0),
    (uid,'Manteiga sem sal 500g','g',null,0,0),
    (uid,'Margarina 500g','g',null,0,0),
    (uid,'Ovos (dúzia)','un',null,0,0),
    (uid,'Fermento químico 100g','g',null,0,0),
    (uid,'Chantilly 1L','ml',null,0,0),
    (uid,'Glucose de milho 1kg','g',null,0,0),
    (uid,'Essência de baunilha 30ml','ml',null,0,0),
    (uid,'Coco ralado 100g','g',null,0,0),
    (uid,'Granulado/confeitos 500g','g',null,0,0)
  on conflict do nothing;

  -- Embalagens e descartáveis: também são ingredientes (unidade 'un'). Marca é opcional na compra.
  insert into ingredientes (user_id, nome, unidade, custo_unitario, estoque_atual, estoque_minimo) values
    (uid,'Caixa para bolo','un',null,0,0),
    (uid,'Caixa para 6 doces','un',null,0,0),
    (uid,'Caixa para 4 doces','un',null,0,0),
    (uid,'Forminha nº 4 (papel)','un',null,0,0),
    (uid,'Forminha para trufa','un',null,0,0),
    (uid,'Blister para trufa','un',null,0,0),
    (uid,'Sacola kraft','un',null,0,0),
    (uid,'Sacola plástica','un',null,0,0),
    (uid,'Fita de cetim (rolo)','un',null,0,0),
    (uid,'Papel manteiga (rolo)','un',null,0,0),
    (uid,'Pote/marmita para bolo no pote','un',null,0,0),
    (uid,'Colher descartável','un',null,0,0),
    (uid,'Tag/etiqueta','un',null,0,0)
  on conflict do nothing;
end $$;
