# Progresso — Doce Gestão

Ao concluir cada fase: marcar aqui, resumir em 3–5 linhas, listar o que testar, aguardar OK. "continue" = retomar a partir daqui.

## Fases

- [x] **Fase 0** — `CLAUDE.md` + `docs/PROGRESSO.md`.
- [x] **Fase 1** — Setup do projeto (Vite 8 + React 19 + TS, Tailwind v4, shadcn/ui preset Nova, router, pastas `src/pages|components|lib`, `src/lib/supabase.ts`, `.env.example`, atalho `@/`). Build OK, app roda.
- [x] **Fase 2** — Migration + RLS + seed aplicados no Supabase (via SQL Editor). `.env` configurado. Usuário de teste `teste@docegestao.com` criado. Verificado: tabelas existem e RLS bloqueia leitura sem login (retorna `[]`).
- [x] **Fase 3** — Feita como funções no banco (RPC) por decisão do usuário, não Edge Functions: `calcular_preco` e `confirmar_pedido` + trigger `pedido_entregue_entrada` + índice único de idempotência. Aplicada via `supabase db push`. Testada ponta-a-ponta: fórmula bate (Brigadeiro R$0,94/un) e confirmar 2x não duplica.
- [x] **Fase 4** — Login/registro (email+senha), `AuthProvider`, rotas protegidas (sem sessão → /login), `AppLayout` com sidebar colapsável (7 menus) + header (nome/logout), Toaster (sonner). Testado no navegador: login redireciona p/ /painel, navegação e proteção de rota OK.
- [x] **Fase 5** — `/receitas`: tabela (nome, rendimento, custo, preço, badge de status) + busca + filtro; criar (Dialog), editar (Sheet), excluir (AlertDialog), skeleton, empty state. `ReceitaForm` com seção de ingredientes (select+qtd) e Calculadora (3 percentuais pré-preenchidos por `src/lib/config.ts`, botão Calcular chama `calcular_preco` e mostra preço em destaque + lucro R$/un). Helpers `format.ts`. Testado no navegador: Brigadeiro R$0,94, Beijinho R$0,95/un.
- [x] **Fase 6** — `/ingredientes` (CRUD, atualizado_em ao editar), `/clientes` (CRUD, badge aniversariantes do mês), `/pedidos` (CRUD, valor pré-preenchido = preço×qtd editável, flag_revisao se diverge >20%, mini-histórico do cliente, botão Confirmar → `confirmar_pedido`, badge Confirmado). Migration `20260722140000_snapshot.sql`: coluna `pedidos.custo_unitario_snapshot` + `confirmar_pedido`/trigger gravam snapshot + backfill (item A2). Helpers `formatData`. Testado: as 3 páginas carregam o seed, badge aniversário e confirmar OK. **Pendente: usuário rodar `npx supabase db push` para aplicar a migration do snapshot.**
- [x] **Fase 7** — `/financeiro` (cards entradas/saídas/saldo do mês, tabela com badges, filtro tipo+período, lançamento manual via Dialog); `/configuracoes` (nome via user_metadata, email read-only, 3 percentuais padrão em localStorage via config.ts); `/painel` (4 KPIs com filtro 7/30/90d, 2 gráficos Recharts [faturamento×lucro/semana, pedidos por status], "Precisa de atenção" [revisão, aniversariantes do dia, entregas 7d], atividade recente, refetch ao focar). Testado: KPIs batem (faturamento R$450, lucro R$187, ticket R$112,50).
- [ ] **Fase 8** — Polish (loading em todo botão, empty states, não quebrar em tela pequena, revisão de RLS) + deploy Vercel + teste do fluxo completo no desktop.

### Escopo ampliado (entram DEPOIS da Fase 8)
- [ ] **Fase 9** — Controle de Estoque.
  - A) Migration incremental (RLS igual às demais): `ingredientes.estoque_atual numeric default 0`; `pedidos.custo_unitario_snapshot numeric`; nova tabela `movimentacoes_estoque` (id, user_id, ingrediente_id FK, tipo `entrada`/`ajuste`/`consumo`, quantidade numeric, pedido_id FK nullable, observacao, data date default now(), criado_em).
  - B) Estender `confirmar_pedido` (function + trigger): além do lançamento, gravar `custo_unitario_snapshot` e gerar `consumo` por ingrediente (`(qtd_receita ÷ rendimento) × qtd_pedido`), descontando de `estoque_atual`. Idempotente. Estoque pode ficar negativo (alerta, nunca bloqueio).
  - C) UI: `/ingredientes` coluna estoque com badge (vermelho negativo / amarelo baixo) + botão "Lançar compra/ajuste" (Dialog); `/painel` "Precisa de atenção" lista estoque negativo/baixo.
- [ ] **Fase 10** — Relatórios (`/relatorios`, novo item na sidebar). Filtro de período (7/30/60/90d ou custom) aplicado a tudo. 8 blocos: (1) resumo clientes/margem, (2) produtos mais vendidos, (3) margem por produto, (4) sugestão de estoque, (5) sugestão de produção, (6) melhores clientes, (7) clientes sumidos (30+ dias), (8) vendas por dia da semana (Recharts). Queries no client, sem tabelas agregadas. Sem export (v2).
- [ ] **Fase 11** — Agenda (`/agenda`, novo item na sidebar, ícone calendar). Tabela `compromissos` (RLS: id, user_id, titulo, data, hora time nullable, observacao, criado_em). Visão por dia (próximos 30 dias / mini-calendário) mesclando: entregas de pedidos (data_entrega + cliente + status), compromissos avulsos, aniversários de clientes — cada tipo com cor/badge. Dialog "Novo compromisso" (padrão CRUD). Consultiva; sem push (v2).

## Notas
- Env do usuário já configurado no `.env` (Supabase). Usuário de teste: `teste@docegestao.com` / `doce123456`.
- **Exceção de escopo (A2):** o campo `pedidos.custo_unitario_snapshot` pode entrar já na próxima migration que eu criar (não esperar a Fase 9), para evitar retrabalho. Quando entrar, `confirmar_pedido` deve passar a gravá-lo na mesma hora — senão pedidos confirmados antes da Fase 9 ficariam sem snapshot e sumiriam dos relatórios de margem. Avaliar isso ao chegar na Fase 6 (tela de pedidos com botão Confirmar).
- Regras permanentes novas no `CLAUDE.md` (itens 6–9): snapshot de custo, definição de "venda", baixa de estoque na confirmação, estoque negativo permitido.
