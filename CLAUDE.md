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

## Funções (implementadas como RPC no Postgres, por decisão do usuário — não Edge Functions)
- `calcular_preco(p_receita_id)` — aplica a fórmula, grava `custo_direto`, `preco_sugerido`, `status='ativo'`. Retorna jsonb `{ok, ...}`.
- `confirmar_pedido(p_pedido_id)` — cria `lancamento` tipo='entrada' com `valor = valor_total` e `pedido_id` vinculado. **Idempotente** (índice único parcial em `lancamentos(pedido_id) where tipo='entrada'`). Reforço via **trigger** `pedido_entregue_entrada`.
  - **A partir da Fase 9**, `confirmar_pedido` também: grava `pedidos.custo_unitario_snapshot` e gera as movimentações de `consumo` de estoque (ver regras abaixo). Tudo na mesma transação e idempotente.

## Regras do escopo ampliado (custo histórico, venda, estoque)
6. **Snapshot de custo:** ao confirmar um pedido, gravar `pedidos.custo_unitario_snapshot = custo_direto / rendimento` (custo por unidade vigente da receita naquele momento). **Todo relatório de margem/lucro usa o snapshot, nunca o custo atual** — o histórico não pode mudar quando o preço de um ingrediente muda depois.
7. **Definição de "venda"** (fixa, usada em relatórios): venda = **pedido confirmado** (com `lancamento` de entrada vinculado), datada pela **data do lançamento**. **Custo de um pedido** = `custo_unitario_snapshot × quantidade`.
8. **Baixa de estoque na confirmação:** para cada ingrediente da receita, gerar movimentação `consumo` com `quantidade = (quantidade_na_receita ÷ rendimento) × quantidade_do_pedido` e descontar de `ingredientes.estoque_atual`. Idempotente (confirmar 2x não duplica consumo nem lançamento).
9. **Estoque pode ficar negativo** (a confeiteira pode ter esquecido de lançar uma compra): mostrar **alerta visual**, **nunca bloquear** a venda.

## Sistema visual (marca) — Fase 13
- **Cor de marca: roxo `#7C5CFC`** (`oklch(0.60 0.21 285)`). Usada em: botão primário, links, foco de campo (`--ring`), item ativo da sidebar. Resto neutro (preto/branco).
- **Sidebar escura** (`#14121B`, `--sidebar oklch(0.16 0.015 300)`): logo em versão clara, itens em cinza-claro, **item ativo = pílula roxa preenchida** (regra CSS unlayered em `index.css` sobre `[data-slot="sidebar-menu-button"][data-active="true"]`). Conteúdo (main) segue claro.
- **Badges semânticos** (papel, não decoração): info=azul, warning=âmbar, success=verde, danger=vermelho. Manter esse mapeamento.
- **KPIs do Painel:** card de Faturamento com destaque (maior + leve fundo roxo) e texto de tendência % ao lado (verde alta / vermelho queda) vs período anterior.
- Não faz parte do MVP: busca global Ctrl+K, sino de notificação, "dica do dia", ilustrações.

## Como trabalhar
- Trabalhar por fases (ver `docs/PROGRESSO.md`). Ao fim de cada fase: parar, resumir em 3–5 linhas, listar o que testar, aguardar OK.
- Atualizar `docs/PROGRESSO.md` ao concluir cada fase. "continue" = retomar a partir dele.
- Conflito técnico com o pedido: apontar e propor — **não** decidir sozinho mudanças de escopo, schema ou contrato.
