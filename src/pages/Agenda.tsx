import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Loader2, CalendarDays, Truck, Cake, CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatData } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const JANELA_DIAS = 30

type Compromisso = { id: string; titulo: string; data: string; hora: string | null; observacao: string | null }
type Pedido = {
  id: string; status: string; data_entrega: string | null
  cliente: { nome: string } | null; itens: { receita: { nome: string } | null }[]
}
type Cliente = { id: string; nome: string; aniversario: string | null }

/** Um item na linha do tempo da agenda. `ordem` = hora para ordenar dentro do dia. */
type Evento = {
  chave: string
  data: string
  ordem: string
  tipo: 'entrega' | 'aniversario' | 'compromisso'
  titulo: string
  detalhe?: string
  compromisso?: Compromisso
}

const hoje = () => new Date().toISOString().slice(0, 10)
function diasAFrente(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
/** Nome do dia da semana (dom, seg...) sem sofrer com fuso horário. */
function diaSemana(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getDay()]
}
function itensResumo(p: Pedido): string {
  const nomes = (p.itens ?? []).map((i) => i.receita?.nome).filter(Boolean)
  return nomes.length ? nomes.join(', ') : 'pedido'
}
/** Próxima ocorrência (ISO) de um aniversário dentro da janela, ou null. */
function proximoAniversario(aniversario: string, de: string, ate: string): string | null {
  const mmdd = aniversario.slice(5)
  const anoDe = Number(de.slice(0, 4))
  for (const ano of [anoDe, anoDe + 1]) {
    const cand = `${ano}-${mmdd}`
    if (cand >= de && cand <= ate) return cand
  }
  return null
}

const CONFIG = {
  entrega: { icone: Truck, cor: 'border-blue-300 bg-blue-50 text-blue-700', rotulo: 'Entrega' },
  aniversario: { icone: Cake, cor: 'border-pink-300 bg-pink-50 text-pink-700', rotulo: 'Aniversário' },
  compromisso: { icone: CalendarClock, cor: 'border-violet-300 bg-violet-50 text-violet-700', rotulo: 'Compromisso' },
} as const

export default function Agenda() {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Compromisso | null>(null)
  const [excluir, setExcluir] = useState<Compromisso | null>(null)

  const de = hoje()
  const ate = diasAFrente(JANELA_DIAS)

  const carregar = useCallback(async () => {
    const [k, p, c] = await Promise.all([
      supabase.from('compromissos').select('*').gte('data', de).lte('data', ate).order('data'),
      supabase.from('pedidos').select('id, status, data_entrega, cliente:clientes(nome), itens:pedido_itens(receita:receitas(nome))')
        .gte('data_entrega', de).lte('data_entrega', ate),
      supabase.from('clientes').select('id, nome, aniversario'),
    ])
    if (k.error) toast.error('Erro ao carregar a agenda: ' + k.error.message)
    setCompromissos((k.data as Compromisso[]) ?? [])
    setPedidos((p.data as unknown as Pedido[]) ?? [])
    setClientes((c.data as Cliente[]) ?? [])
    setLoading(false)
  }, [de, ate])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Junta as três fontes e agrupa por dia.
  const dias = useMemo(() => {
    const eventos: Evento[] = []
    for (const p of pedidos) {
      if (!p.data_entrega) continue
      if (p.status === 'entregue') continue // já entregue não é mais "a entregar"
      eventos.push({
        chave: 'e' + p.id, data: p.data_entrega, ordem: '00:00', tipo: 'entrega',
        titulo: `Entregar para ${p.cliente?.nome ?? 'cliente'}`,
        detalhe: `${itensResumo(p)} · ${p.status}`,
      })
    }
    for (const c of clientes) {
      if (!c.aniversario) continue
      const quando = proximoAniversario(c.aniversario, de, ate)
      if (quando) eventos.push({ chave: 'a' + c.id, data: quando, ordem: '00:00', tipo: 'aniversario', titulo: `Aniversário de ${c.nome}` })
    }
    for (const k of compromissos) {
      eventos.push({
        chave: 'c' + k.id, data: k.data, ordem: k.hora ?? '99:99', tipo: 'compromisso',
        titulo: k.titulo, detalhe: k.observacao ?? undefined, compromisso: k,
      })
    }

    const porDia = new Map<string, Evento[]>()
    for (const ev of eventos) {
      const arr = porDia.get(ev.data) ?? []
      arr.push(ev)
      porDia.set(ev.data, arr)
    }
    return [...porDia.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([data, evs]) => ({ data, eventos: evs.sort((a, b) => a.ordem.localeCompare(b.ordem)) }))
  }, [pedidos, clientes, compromissos, de, ate])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Próximos {JANELA_DIAS} dias: entregas, aniversários de clientes e seus compromissos.</p>
        </div>
        <Button onClick={() => setCriar(true)}><Plus /> Novo compromisso</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : dias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border py-16 text-center">
          <CalendarDays className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Nada nos próximos {JANELA_DIAS} dias.</p>
          <Button onClick={() => setCriar(true)}><Plus /> Anotar um compromisso</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {dias.map(({ data, eventos }) => (
            <div key={data} className="rounded-lg border">
              <div className="flex items-baseline justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                <span className="font-medium">{formatData(data)}</span>
                <span className="text-sm capitalize text-muted-foreground">
                  {data === hoje() ? 'hoje' : diaSemana(data)}
                </span>
              </div>
              <ul className="divide-y">
                {eventos.map((ev) => {
                  const cfg = CONFIG[ev.tipo]
                  const Icone = cfg.icone
                  return (
                    <li key={ev.chave} className="flex items-center gap-3 px-4 py-3">
                      <Icone className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {ev.compromisso?.hora ? <span className="tabular-nums text-muted-foreground">{ev.compromisso.hora.slice(0, 5)} · </span> : null}
                          {ev.titulo}
                        </p>
                        {ev.detalhe && <p className="truncate text-sm text-muted-foreground">{ev.detalhe}</p>}
                      </div>
                      <Badge variant="outline" className={cfg.cor}>{cfg.rotulo}</Badge>
                      {ev.compromisso && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditando(ev.compromisso!)} aria-label="Editar"><Pencil className="text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setExcluir(ev.compromisso!)} aria-label="Excluir"><Trash2 className="text-muted-foreground" /></Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={criar} onOpenChange={setCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo compromisso</DialogTitle>
            <DialogDescription>Um lembrete pessoal na sua agenda (feira, curso, pagamento...).</DialogDescription>
          </DialogHeader>
          <CompromissoForm onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar compromisso</SheetTitle>
            <SheetDescription>Atualize os dados do compromisso.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <CompromissoForm compromisso={editando} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>"{excluir?.titulo}" será removido da agenda. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!excluir) return
              const { error } = await supabase.from('compromissos').delete().eq('id', excluir.id)
              if (error) toast.error('Erro ao excluir: ' + error.message)
              else { toast.success('Compromisso excluído.'); carregar() }
              setExcluir(null)
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CompromissoForm({ compromisso, onSaved, onClose }: { compromisso?: Compromisso; onSaved: () => void; onClose: () => void }) {
  const { user } = useAuth()
  const [titulo, setTitulo] = useState(compromisso?.titulo ?? '')
  const [data, setData] = useState(compromisso?.data ?? hoje())
  const [hora, setHora] = useState(compromisso?.hora?.slice(0, 5) ?? '')
  const [observacao, setObservacao] = useState(compromisso?.observacao ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!user) return
    if (!titulo.trim()) return toast.error('Dê um título ao compromisso.')
    if (!data) return toast.error('Escolha a data.')
    setSalvando(true)
    const base = { titulo: titulo.trim(), data, hora: hora || null, observacao: observacao.trim() || null }
    const { error } = compromisso
      ? await supabase.from('compromissos').update(base).eq('id', compromisso.id)
      : await supabase.from('compromissos').insert({ ...base, user_id: user.id })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(compromisso ? 'Compromisso salvo!' : 'Compromisso criado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cmp-titulo">Título</Label>
        <Input id="cmp-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Feira de doces no centro" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cmp-data">Data</Label>
          <Input id="cmp-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cmp-hora">Hora (opcional)</Label>
          <Input id="cmp-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cmp-obs">Observação</Label>
        <Input id="cmp-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {compromisso ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  )
}
