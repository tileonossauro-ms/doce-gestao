// Padrões de percentuais para novas receitas.
// Fase 7 (Configurações) vai persistir isso; por enquanto lê do localStorage com fallback.
// ponytail: localStorage evita uma tabela/migration só para 3 números no MVP.

export type Percentuais = { indireto: number; margem: number; taxas: number }

const PADRAO: Percentuais = { indireto: 10, margem: 30, taxas: 5 }
const CHAVE = 'doce-gestao:percentuais-padrao'

export function getPercentuaisPadrao(): Percentuais {
  try {
    const raw = localStorage.getItem(CHAVE)
    if (raw) return { ...PADRAO, ...JSON.parse(raw) }
  } catch {
    // ignora JSON inválido
  }
  return { ...PADRAO }
}

export function setPercentuaisPadrao(p: Percentuais): void {
  localStorage.setItem(CHAVE, JSON.stringify(p))
}

// Janela de análise: quantos dias de histórico as sugestões de compra/produção olham.
// Antecipado da Fase 17 (lá vira coluna da tabela `perfis`); a Fase 10 já lê daqui.
const CHAVE_JANELA = 'doce-gestao:janela-analise-dias'
export const JANELAS_ANALISE = [30, 60, 90] as const

export function getJanelaAnalise(): number {
  const n = Number(localStorage.getItem(CHAVE_JANELA))
  return JANELAS_ANALISE.includes(n as (typeof JANELAS_ANALISE)[number]) ? n : 60
}

export function setJanelaAnalise(dias: number): void {
  localStorage.setItem(CHAVE_JANELA, String(dias))
}
