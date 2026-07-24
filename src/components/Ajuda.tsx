import { useState, type ReactNode } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'

/** Caixa de instrução que RECOLHE e lembra a escolha (por id, no localStorage).
 *  Resolve a regra do projeto: todo texto de ajuda precisa poder ser escondido,
 *  para o sistema não parecer mais complicado do que é.
 *
 *  Uso:
 *    <Ajuda id="custos-fixos" titulo="Como funciona o custo fixo?">
 *      <p>explicação…</p>
 *    </Ajuda>
 */
const chave = (id: string) => `doce-gestao:ajuda:${id}`

export default function Ajuda({ id, titulo, children, tom = 'info', padrao = 'aberto' }: {
  id: string
  titulo: string
  children: ReactNode
  tom?: 'info' | 'destaque'
  /** Estado na primeira vez que a pessoa vê (antes de mexer). Depois vale a escolha dela. */
  padrao?: 'aberto' | 'fechado'
}) {
  const [aberto, setAberto] = useState(() => {
    try {
      const v = localStorage.getItem(chave(id))
      return v ? v === 'aberto' : padrao === 'aberto'
    } catch {
      return padrao === 'aberto'
    }
  })

  function alternar() {
    setAberto((a) => {
      const novo = !a
      try { localStorage.setItem(chave(id), novo ? 'aberto' : 'fechado') } catch { /* ignora */ }
      return novo
    })
  }

  const cor = tom === 'destaque'
    ? 'border-primary/30 bg-primary/5 text-foreground'
    : 'border-blue-200 bg-blue-50 text-blue-900'

  return (
    <div className={`rounded-md border ${cor}`}>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
      >
        <Lightbulb className="size-4 shrink-0" />
        <span className="flex-1">{titulo}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && <div className="space-y-2 px-3 pb-3 pl-9 text-sm">{children}</div>}
    </div>
  )
}
