# Doce Gestão

SaaS de gestão para confeiteiros caseiros. Nome oficial em todo texto visível: **Doce Gestão** (nunca "ConfeitApp" ou outro).

## Contexto
- MVP para 2–3 confeiteiros testarem; meta futura ~100 assinantes com infra mínima.
- **Web desktop** na v1. Mobile otimizado é v2 — não fazer bottom nav / gestos / layouts mobile. Só não pode quebrar em tela pequena (layout fluido do Tailwind basta).
- Público não-técnico. Tudo em **português**, simples. Inputs numéricos com `inputMode="decimal"`.
- **O usuário é leigo:** dar sempre passo a passo para qualquer ação (comandos, cliques, configs), traduzir jargões técnicos e explicar o "porquê" em linguagem simples. Nunca assumir conhecimento prévio de terminal, código ou ferramentas.
- MVP 100% manual e determinístico: sem IA, cron, gateway de pagamento, WhatsApp ou PDF. Integrações futuras marcadas com badge "em breve".

## Stack (fixa — não propor alternativas)
- **Front:** React + Vite + TypeScript, Tailwind, shadcn/ui, lucide-react, react-router-dom, Recharts.
- **Back:** Supabase — Postgres, Auth (email/senha), Edge Functions, migrations via Supabase CLI (`supabase db push`, `supabase functions deploy`).
- **Deploy front:** Vercel.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (fornecidos pelo usuário). Client em `src/lib/supabase.ts`. Pastas: `src/pages`, `src/components`, `src/lib`.
- `SUPABASE_SERVICE_ROLE_KEY` só nas Edge Functions (env da function), **nunca no front**.

## Regras inegociáveis
1. **RLS habilitado em TODAS as tabelas**, policies com `auth.uid() = user_id`. Cada confeiteiro vê só os próprios dados. Reverificar na fase final.
2. **Fórmula de precificação** (`pct_margem` e `pct_taxas` são % sobre o **preço final de venda**, não sobre o custo):
   - `custo_direto = soma(quantidade × custo_unitario)`
   - `custo_por_unidade = custo_direto / rendimento`
   - `preco_sugerido = custo_por_unidade × (1 + pct_indireto/100) / (1 − pct_margem/100 − pct_taxas/100)`
   - Arredondar a 2 casas. Erro claro (mantém `status='pendente'`) se `rendimento = 0`, se `pct_margem + pct_taxas ≥ 100`, ou se algum ingrediente estiver sem `custo_unitario`.
3. Dinheiro sempre `numeric` no banco, exibido com 2 casas. Datas de dia-calendário como `date` (sem hora).
4. **Padrão único de UI nos CRUDs:** Table + Dialog (criar) + Sheet (editar) + AlertDialog (excluir) + Toast em toda ação + Skeleton no loading + empty state convidando à primeira ação.
5. Toda rota protegida por login; sem sessão → redireciona para `/login`.

## Edge Functions
- `calcular-preco` — `{ receita_id }`: aplica a fórmula, grava `custo_direto`, `preco_sugerido`, `status='ativo'`.
- `confirmar-pedido` — `{ pedido_id }`: cria `lancamento` tipo='entrada' com `valor = valor_total` e `pedido_id` vinculado. **Idempotente** (confirmar 2x não duplica). Reforço via **trigger** no Postgres.

## Como trabalhar
- Trabalhar por fases (ver `docs/PROGRESSO.md`). Ao fim de cada fase: parar, resumir em 3–5 linhas, listar o que testar, aguardar OK.
- Atualizar `docs/PROGRESSO.md` ao concluir cada fase. "continue" = retomar a partir dele.
- Conflito técnico com o pedido: apontar e propor — **não** decidir sozinho mudanças de escopo, schema ou contrato.
