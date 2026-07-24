import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip as TP } from 'radix-ui'
import Cupcake from '@/components/Cupcake'

/** "?" translúcido ao lado de um termo técnico. Ao passar o mouse (ou focar pelo teclado),
 *  o cupcake aparece e o balão sai da boca dele explicando — com a faixa usual (sugestão).
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
    <TP.Root>
      <TP.Trigger asChild>
        <button
          type="button"
          aria-label={`O que é ${titulo}?`}
          className="inline-flex align-middle text-muted-foreground/50 transition-colors hover:text-primary focus-visible:text-primary"
        >
          <HelpCircle className="size-3.5" />
        </button>
      </TP.Trigger>
      <TP.Portal>
        <TP.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 origin-(--radix-tooltip-content-transform-origin) data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95"
        >
          <div className="flex items-end gap-0.5">
            <Cupcake className="size-11 shrink-0 drop-shadow-sm" />
            <div className="relative mb-1.5 max-w-[15rem] rounded-2xl rounded-bl-none border bg-popover p-3 text-left text-xs leading-relaxed text-popover-foreground shadow-lg">
              {/* rabinho apontando para a boca do cupcake */}
              <span className="absolute -left-1.5 bottom-0 size-3 rotate-45 border-b border-l bg-popover" />
              <p className="mb-1 font-semibold">{titulo}</p>
              <p className="text-muted-foreground">{children}</p>
              {faixa && <p className="mt-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">💡 {faixa}</p>}
            </div>
          </div>
        </TP.Content>
      </TP.Portal>
    </TP.Root>
  )
}
