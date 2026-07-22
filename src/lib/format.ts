/** Formata número como dinheiro em Real: 1234.5 -> "R$ 1.234,50". */
export function formatBRL(valor: number | null | undefined): string {
  const n = typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Formata número comum com até `casas` casas decimais (pt-BR). */
export function formatNum(valor: number | null | undefined, casas = 2): string {
  const n = typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
}

/** Converte texto de input em número, aceitando vírgula OU ponto como decimal.
 *  Ex.: "0,5" e "0.5" -> 0.5; "" -> NaN. (Campos do app não usam separador de milhar.) */
export function parseNum(texto: string): number {
  const limpo = texto.replace(',', '.').trim()
  return limpo === '' ? NaN : Number(limpo)
}
