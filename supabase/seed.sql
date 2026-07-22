-- Doce Gestão — dados de teste (seed)
-- PRÉ-REQUISITO: já existir um usuário com e-mail 'teste@docegestao.com'
-- (criado em Authentication > Users, com "Auto Confirm User" marcado).
-- Re-executável: usa "on conflict do nothing".

do $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = 'teste@docegestao.com';
  if uid is null then
    raise exception 'Crie primeiro o usuario teste@docegestao.com em Authentication > Users (marque Auto Confirm) e rode este seed de novo.';
  end if;

  -- INGREDIENTES (5)
  insert into ingredientes (id, user_id, nome, unidade, custo_unitario) values
    ('a0000000-0000-0000-0000-000000000001', uid, 'Leite condensado',     'un', 6.50),
    ('a0000000-0000-0000-0000-000000000002', uid, 'Creme de leite',       'un', 3.80),
    ('a0000000-0000-0000-0000-000000000003', uid, 'Chocolate em pó 50%',  'kg', 28.00),
    ('a0000000-0000-0000-0000-000000000004', uid, 'Manteiga',             'kg', 42.00),
    ('a0000000-0000-0000-0000-000000000005', uid, 'Açúcar refinado',      'kg', 4.50)
  on conflict (id) do nothing;

  -- RECEITAS (3) — percentuais preenchidos; preço calculado depois pela função calcular-preco
  insert into receitas (id, user_id, nome, rendimento, pct_indireto, pct_margem, pct_taxas) values
    ('b0000000-0000-0000-0000-000000000001', uid, 'Brigadeiro Gourmet', 30, 10, 30, 5),
    ('b0000000-0000-0000-0000-000000000002', uid, 'Bolo de Pote',        8, 10, 35, 5),
    ('b0000000-0000-0000-0000-000000000003', uid, 'Beijinho',           25, 10, 30, 5)
  on conflict (id) do nothing;

  -- ITENS DAS RECEITAS
  insert into receita_ingredientes (id, user_id, receita_id, ingrediente_id, quantidade) values
    -- Brigadeiro Gourmet
    ('c0000000-0000-0000-0000-000000000001', uid, 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2),
    ('c0000000-0000-0000-0000-000000000002', uid, 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 0.10),
    ('c0000000-0000-0000-0000-000000000003', uid, 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 0.02),
    -- Bolo de Pote
    ('c0000000-0000-0000-0000-000000000004', uid, 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1),
    ('c0000000-0000-0000-0000-000000000005', uid, 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 1),
    ('c0000000-0000-0000-0000-000000000006', uid, 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 0.15),
    ('c0000000-0000-0000-0000-000000000007', uid, 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 0.20),
    -- Beijinho
    ('c0000000-0000-0000-0000-000000000008', uid, 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 2),
    ('c0000000-0000-0000-0000-000000000009', uid, 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 0.02),
    ('c0000000-0000-0000-0000-00000000000a', uid, 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 0.05)
  on conflict (id) do nothing;

  -- CLIENTES (2)
  insert into clientes (id, user_id, nome, telefone, aniversario, observacao) values
    ('d0000000-0000-0000-0000-000000000001', uid, 'Maria Silva', '(11) 98765-4321', '1990-07-15', 'Prefere brigadeiro meio amargo'),
    ('d0000000-0000-0000-0000-000000000002', uid, 'João Santos', '(11) 91234-5678', '1985-11-22', 'Faz pedidos grandes para festas da empresa')
  on conflict (id) do nothing;

  -- PEDIDOS (4) — um com flag_revisao=true para a seção "Precisa de atenção"
  insert into pedidos (id, user_id, cliente_id, receita_id, quantidade, valor_total, status, data_entrega, flag_revisao) values
    ('e0000000-0000-0000-0000-000000000001', uid, 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 30,  90.00, 'entregue',     '2026-07-10', false),
    ('e0000000-0000-0000-0000-000000000002', uid, 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',  8,  96.00, 'em produção',  '2026-07-25', false),
    ('e0000000-0000-0000-0000-000000000003', uid, 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 25,  62.50, 'novo',         '2026-07-28', false),
    ('e0000000-0000-0000-0000-000000000004', uid, 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 60, 240.00, 'entregue',     '2026-07-05', true)
  on conflict (id) do nothing;

  -- LANCAMENTOS (6) — 3 entradas, 3 saídas, no mês corrente
  insert into lancamentos (id, user_id, tipo, descricao, valor, pedido_id, data) values
    ('f0000000-0000-0000-0000-000000000001', uid, 'entrada', 'Pedido Brigadeiro Gourmet (Maria)',        90.00,  'e0000000-0000-0000-0000-000000000001', '2026-07-10'),
    ('f0000000-0000-0000-0000-000000000002', uid, 'entrada', 'Pedido Brigadeiro 60un (João)',            240.00, 'e0000000-0000-0000-0000-000000000004', '2026-07-05'),
    ('f0000000-0000-0000-0000-000000000003', uid, 'saida',   'Compra de leite condensado (caixa c/12)',  78.00,  null, '2026-07-02'),
    ('f0000000-0000-0000-0000-000000000004', uid, 'saida',   'Chocolate em pó 5kg',                      140.00, null, '2026-07-03'),
    ('f0000000-0000-0000-0000-000000000005', uid, 'saida',   'Embalagens e forminhas',                   45.00,  null, '2026-07-06'),
    ('f0000000-0000-0000-0000-000000000006', uid, 'entrada', 'Venda avulsa na feira',                    120.00, null, '2026-07-18')
  on conflict (id) do nothing;

  raise notice 'Seed aplicado para o usuario % (teste@docegestao.com).', uid;
end $$;
