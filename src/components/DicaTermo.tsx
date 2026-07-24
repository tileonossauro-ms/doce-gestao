import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import Cupcake from '@/components/Cupcake'

/** "?" translúcido ao lado de um termo técnico. Ao passar o mouse (ou focar pelo teclado),
 *  o cupcake explica: o que é, e — opcionalmente — a faixa usual (sugestão).
 *
 *  <DicaTermo titulo="Margem" faixa="Costuma ficar entre 30% e 60%.">
 *    É o seu lucro em cada venda.
 *  </DicaTermo>
 */
export default function DicaTermo({ titulo, faixa, children }: {
  titulo: string
  faixa?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`O que é ${titulo}?`}
          className="inline-flex align-middle text-muted-foreground/50 transition-colors hover:text-primary focus-visible:text-primary"
        >
          <HelpCircle className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[16rem] flex-col items-start gap-1.5 p-3 text-left text-xs leading-relaxed">
        <span className="flex items-center gap-1.5 font-semibold"><Cupcake className="size-4" /> {titulo}</span>
        <span>{children}</span>
        {faixa && <span className="rounded bg-background/15 px-1.5 py-0.5">💡 {faixa}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
