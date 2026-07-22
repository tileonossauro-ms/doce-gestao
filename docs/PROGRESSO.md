# Progresso — Doce Gestão

Ao concluir cada fase: marcar aqui, resumir em 3–5 linhas, listar o que testar, aguardar OK. "continue" = retomar a partir daqui.

## Fases

- [x] **Fase 0** — `CLAUDE.md` + `docs/PROGRESSO.md`.
- [x] **Fase 1** — Setup do projeto (Vite 8 + React 19 + TS, Tailwind v4, shadcn/ui preset Nova, router, pastas `src/pages|components|lib`, `src/lib/supabase.ts`, `.env.example`, atalho `@/`). Build OK, app roda.
- [x] **Fase 2** — Migration + RLS + seed aplicados no Supabase (via SQL Editor). `.env` configurado. Usuário de teste `teste@docegestao.com` criado. Verificado: tabelas existem e RLS bloqueia leitura sem login (retorna `[]`).
- [ ] **Fase 3** — Edge Functions (`calcular-preco`, `confirmar-pedido`) + trigger Postgres + idempotência.
- [ ] **Fase 4** — Layout, login e navegação (sidebar colapsável, header, rotas protegidas).
- [ ] **Fase 5** — Receitas + calculadora de preço (coração do produto).
- [ ] **Fase 6** — Ingredientes, Clientes e Pedidos.
- [ ] **Fase 7** — Financeiro, Configurações e Painel (KPIs + gráficos Recharts).
- [ ] **Fase 8** — Polish (loading em todo botão, empty states, não quebrar em tela pequena, revisão de RLS) + deploy Vercel + teste do fluxo completo no desktop.

## Notas
- Env pendente do usuário: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (pedir antes da Fase 2).
