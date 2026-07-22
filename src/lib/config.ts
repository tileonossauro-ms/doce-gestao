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
