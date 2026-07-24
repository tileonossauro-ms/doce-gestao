import { useState } from 'react'
import { AlertTriangle, Truck, HandCoins, Pencil } from 'lucide-react'
import { formatBRL, formatData } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/** Forma mínima de um pedido para o quadro. Compatível com o Pedido da tela. */
export type PedidoCard = {
  id: string
  status: string
  status_pagamento: string
  data_entrega: string | null
  flag_revisao: boolean
  valor_total: number
  cliente: { nome: string } | null
  itens: { quantidade: number; receita: { nome: string } | null }[]
}

/** Cor da faixa do topo de cada coluna, por estado da produção. */
const CORES: Record<string, string> = {
  'novo': 'bg-blue-400',
  'em produção': 'bg-amber-400',
  'entregue': 'bg-green-500',
}

export default function PedidosKanban({
  pedidos, colunas, onMover, onEditar, onBaixa,
}: {
  pedidos: PedidoCard[]
  colunas: string[]
  onMover: (id: string, novoStatus: string) => void
  onEditar: (p: PedidoCard) => void
  onBaixa: (p: PedidoCard) => void
}) {
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {colunas.map((coluna) => {
        const daColuna = pedidos.filter((p) => p.status === coluna)
        const destacar = sobre === coluna && arrastando != null
        return (
          <div
            key={coluna}
            onDragOver={(e) => { e.preventDefault(); setSobre(coluna) }}
            onDragLeave={() => setSobre((s) => (s === coluna ? null : s))}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              if (id) onMover(id, coluna)
              setSobre(null); setArrastando(null)
            }}
            className={`flex flex-col rounded-lg border bg-muted/30 transition-colors ${destacar ? 'border-primary bg-primary/5' : ''}`}
          >
            <div className={`h-1 rounded-t-lg ${CORES[coluna] ?? 'bg-neutral-300'}`} />
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold capitalize">{coluna}</span>
              <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">{daColuna.length}</span>
            </div>

            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2 pt-0">
              {daColuna.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">Arraste um pedido para cá</p>
              ) : (
                daColuna.map((p) => {
                  const pago = p.status_pagamento === 'pago'
                  const itensTxt = p.itens.map((i) => `${i.receita?.nome ?? '?'} ×${i.quantidade}`).join(', ')
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; setArrastando(p.id) }}
                      onDragEnd={() => { setArrastando(null); setSobre(null) }}
                      onClick={() => onEditar(p)}
                      className={`cursor-grab rounded-md border bg-background p-2.5 shadow-sm active:cursor-grabbing ${arrastando === p.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium leading-tight">{p.cliente?.nome ?? '—'}</span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold">
                          {p.flag_revisao && <AlertTriangle className="size-3.5 text-amber-500" aria-label="Valor precisa de revisão" />}
                          {formatBRL(p.valor_total)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={itensTxt}>{itensTxt || 'sem itens'}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge variant="outline" className={pago ? 'border-green-300 bg-green-50 text-green-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>
                          {pago ? 'Pago' : 'A Pagar'}
                        </Badge>
                        {p.data_entrega && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="size-3.5" /> {formatData(p.data_entrega)}
                          </span>
                        )}
                      </div>
                      {!pago && (
                        <Button
                          variant="outline" size="sm" className="mt-2 h-7 w-full"
                          onClick={(e) => { e.stopPropagation(); onBaixa(p) }}
                        >
                          <HandCoins className="size-3.5" /> Receber pagamento
                        </Button>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        <Pencil className="size-3" /> clique para editar · arraste para mover
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
