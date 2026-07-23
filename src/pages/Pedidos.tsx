import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, ClipboardList, Loader2, HandCoins, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatData, parseNum } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useSort, SortHead } from '@/components/SortHead'

type Cliente = { id: string; nome: string }
type Receita = { id: string; nome: string; preco_sugerido: number | null }
type Forma = { id: string; nome: string }
type ItemLoad = { quantidade: number; preco_unitario: number; receita: { nome: string } | null }
type Pedido = {
  id: string
  cliente_id: string | null
  status: string
  status_pagamento: string
  data_entrega: string | null
  flag_revisao: boolean
  valor_total: number
  forma_pagamento_prevista: string | null
  cliente: { nome: string } | null
  itens: ItemLoad[]
}

const STATUS = ['novo', 'em produção', 'entregue']
const LIMITE_DIVERGENCIA = 0.2

function badgeStatus(s: string) {
  if (s === 'entregue') return 'border-green-300 bg-green-50 text-green-700'
  if (s === 'em produção') return 'border-amber-300 bg-amber-50 text-amber-700'
  return 'border-blue-300 bg-blue-50 text-blue-700'
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [formas, setFormas] = useState<Forma[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Pedido | null>(null)
  const [excluir, setExcluir] = useState<Pedido | null>(null)
  const [baixa, setBaixa] = useState<Pedido | null>(null)

  const carregar = useCallback(async () => {
    const [p, c, r, f] = await Promise.all([
      supabase
        .from('pedidos')
        .select('id, cliente_id, status, status_pagamento, data_entrega, flag_revisao, valor_total, forma_pagamento_prevista, cliente:clientes(nome), itens:pedido_itens(quantidade, preco_unitario, receita:receitas(nome))')
        .order('data_entrega', { ascending: false, nullsFirst: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('receitas').select('id, nome, preco_sugerido').order('nome'),
      supabase.from('formas_pagamento').select('id, nome').eq('ativo', true).order('nome'),
    ])
    if (p.error) toast.error('Erro ao carregar pedidos: ' + p.error.message)
    setPedidos(((p.data as unknown as Pedido[]) ?? []).map((x) => ({ ...x, valor_total: Number(x.valor_total) })))
    setClientes((c.data as Cliente[]) ?? [])
    setReceitas((r.data as Receita[]) ?? [])
    setFormas((f.data as Forma[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return pedidos.filter((p) => {
      const nomes = (p.cliente?.nome ?? '') + ' ' + p.itens.map((i) => i.receita?.nome ?? '').join(' ')
      const okBusca = !t || nomes.toLowerCase().includes(t)
      const okStatus = filtroStatus === 'todos' || p.status === filtroStatus
      return okBusca && okStatus
    })
  }, [pedidos, busca, filtroStatus])

  const { sorted, sort, toggle } = useSort(
    filtrados,
    (p, k) => (k === 'cliente' ? p.cliente?.nome : (p as unknown as Record<string, unknown>)[k]),
    { key: 'data_entrega', dir: 'desc' },
  )

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('pedidos').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else { toast.success('Pedido excluído.'); carregar() }
    setExcluir(null)
  }

  /** Muda o andamento da produção direto na tabela. Não mexe no financeiro:
   *  o dinheiro entra só pela baixa de pagamento, não pela entrega. */
  async function mudarStatus(p: Pedido, novo: string) {
    if (novo === p.status) return
    setPedidos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: novo } : x))) // otimista
    const { error } = await supabase.from('pedidos').update({ status: novo }).eq('id', p.id)
    if (error) { toast.error('Erro ao mudar a produção: ' + error.message); carregar() }
    else toast.success(`Produção: ${novo}.`)
  }

  const podeC = clientes.length > 0 && receitas.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Button onClick={() => setCriar(true)} disabled={!podeC}><Plus /> Novo pedido</Button>
      </div>

      {!podeC && !loading && (
        <p className="text-sm text-muted-foreground">Para criar pedidos, cadastre ao menos um cliente e uma receita primeiro.</p>
      )}

      {pedidos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por cliente ou receita..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead sortKey="cliente" sort={sort} onSort={toggle}>Cliente</SortHead>
              <TableHead>Itens</TableHead>
              <SortHead sortKey="valor_total" sort={sort} onSort={toggle} className="text-right">Valor</SortHead>
              <SortHead sortKey="status" sort={sort} onSort={toggle}>Produção</SortHead>
              <SortHead sortKey="status_pagamento" sort={sort} onSort={toggle}>Pagamento</SortHead>
              <SortHead sortKey="data_entrega" sort={sort} onSort={toggle}>Entrega</SortHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <ClipboardList className="size-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum pedido registrado ainda.</p>
                    {podeC && <Button onClick={() => setCriar(true)}><Plus /> Criar primeiro pedido</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={7}><p className="py-10 text-center text-sm text-muted-foreground">Nenhum pedido encontrado com esse filtro.</p></TableCell></TableRow>
            ) : (
              sorted.map((p) => {
                const pago = p.status_pagamento === 'pago'
                const itensTxt = p.itens.map((i) => `${i.receita?.nome ?? '?'} ×${i.quantidade}`).join(', ')
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.cliente?.nome ?? '—'}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground" title={itensTxt}>{itensTxt || '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        {p.flag_revisao && <AlertTriangle className="size-3.5 text-amber-500" aria-label="Valor precisa de revisão" />}
                        {formatBRL(p.valor_total)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => mudarStatus(p, v)}>
                        <SelectTrigger size="sm" className={`w-36 ${badgeStatus(p.status)}`} aria-label="Mudar produção"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={pago ? 'border-green-300 bg-green-50 text-green-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>
                        {pago ? 'Pago' : 'A Pagar'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatData(p.data_entrega)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!pago && (
                          <Button variant="outline" size="sm" onClick={() => setBaixa(p)}>
                            <HandCoins /> Dar baixa
                          </Button>
                        )}
                        {pago && (
                          <span className="mr-1 inline-flex items-center text-xs text-green-700"><CheckCircle2 className="mr-1 size-3.5" />pago</span>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setEditando(p)} aria-label="Editar"><Pencil className="text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluir(p)} aria-label="Excluir"><Trash2 className="text-muted-foreground" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={criar} onOpenChange={setCriar}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo pedido</DialogTitle>
            <DialogDescription>Adicione um ou mais itens. O valor de cada um vem sugerido pela receita.</DialogDescription>
          </DialogHeader>
          <PedidoForm clientes={clientes} receitas={receitas} formas={formas} pedidos={pedidos} onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>Editar pedido</SheetTitle><SheetDescription>Ajuste os itens e os dados do pedido.</SheetDescription></SheetHeader>
          <div className="px-4 pb-6">
            {editando && <PedidoForm pedido={editando} clientes={clientes} receitas={receitas} formas={formas} pedidos={pedidos} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <BaixaDialog pedido={baixa} formas={formas} onClose={() => setBaixa(null)} onDone={carregar} />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>O pedido e seus itens serão removidos. Se já havia lançamento financeiro, ele deixará de ficar vinculado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------- Baixa (A Pagar -> Pago) ----------------
function BaixaDialog({ pedido, formas, onClose, onDone }: { pedido: Pedido | null; formas: Forma[]; onClose: () => void; onDone: () => void }) {
  const [forma, setForma] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (pedido) setForma(pedido.forma_pagamento_prevista ?? formas[0]?.id ?? '')
  }, [pedido, formas])

  async function confirmar() {
    if (!pedido) return
    setEnviando(true)
    const { data, error } = await supabase.rpc('confirmar_pedido', { p_pedido_id: pedido.id, p_forma_pagamento: forma || null })
    setEnviando(false)
    if (error) return toast.error('Erro ao dar baixa: ' + error.message)
    if (!data?.ok) return toast.error(data?.erro ?? 'Não foi possível dar baixa.')
    if (data.ja_confirmado) toast.info('Este pedido já estava pago.')
    else toast.success(`Baixa registrada! Entrada de ${formatBRL(data.valor)} no financeiro.`)
    onDone()
    onClose()
  }

  return (
    <Dialog open={!!pedido} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dar baixa no pagamento</DialogTitle>
          <DialogDescription>
            Confirmar o recebimento de {pedido ? formatBRL(pedido.valor_total) : ''}. Como o cliente pagou?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Forma de pagamento</Label>
          <Select value={forma} onValueChange={setForma}>
            <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
            <SelectContent>
              {formas.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : <HandCoins />} Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Form de pedido (itens) ----------------
type ItemForm = { receita_id: string; quantidade: string; preco_unitario: string }

function PedidoForm({
  pedido, clientes, receitas, formas, pedidos, onSaved, onClose,
}: {
  pedido?: Pedido
  clientes: Cliente[]
  receitas: Receita[]
  formas: Forma[]
  pedidos: Pedido[]
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? '')
  const [status, setStatus] = useState(pedido?.status ?? 'novo')
  const [dataEntrega, setDataEntrega] = useState(pedido?.data_entrega ?? '')
  const [formaPrevista, setFormaPrevista] = useState(pedido?.forma_pagamento_prevista ?? '')
  const [itens, setItens] = useState<ItemForm[]>([{ receita_id: '', quantidade: '1', preco_unitario: '' }])
  const [salvando, setSalvando] = useState(false)

  // Ao editar, carrega os itens do pedido.
  useEffect(() => {
    if (!pedido) return
    supabase.from('pedido_itens').select('receita_id, quantidade, preco_unitario').eq('pedido_id', pedido.id)
      .then(({ data }) => {
        const rows = (data ?? []).map((r) => ({
          receita_id: r.receita_id as string,
          quantidade: String(r.quantidade),
          preco_unitario: String(r.preco_unitario),
        }))
        setItens(rows.length ? rows : [{ receita_id: '', quantidade: '1', preco_unitario: '' }])
      })
  }, [pedido])

  function setItem(i: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  // Ao escolher receita, pré-preenche o preço com o sugerido (se ainda vazio).
  function escolherReceita(i: number, receitaId: string) {
    const rec = receitas.find((r) => r.id === receitaId)
    setItens((prev) => prev.map((it, idx) => {
      if (idx !== i) return it
      const preco = !it.preco_unitario && rec?.preco_sugerido != null ? rec.preco_sugerido.toFixed(2) : it.preco_unitario
      return { ...it, receita_id: receitaId, preco_unitario: preco }
    }))
  }
  function addItem() { setItens((p) => [...p, { receita_id: '', quantidade: '1', preco_unitario: '' }]) }
  function removeItem(i: number) { setItens((p) => p.filter((_, idx) => idx !== i)) }

  const validos = itens.filter((it) => it.receita_id && Number.isFinite(parseNum(it.quantidade)) && parseNum(it.quantidade) > 0)
  const valorTotal = validos.reduce((s, it) => s + parseNum(it.quantidade) * (parseNum(it.preco_unitario) || 0), 0)
  const sugeridoTotal = validos.reduce((s, it) => {
    const rec = receitas.find((r) => r.id === it.receita_id)
    return s + parseNum(it.quantidade) * (rec?.preco_sugerido ?? 0)
  }, 0)

  const historico = useMemo(() => {
    if (!clienteId) return null
    const doCliente = pedidos.filter((p) => p.cliente_id === clienteId && p.id !== pedido?.id)
    const total = doCliente.reduce((s, p) => s + Number(p.valor_total), 0)
    return { qtd: doCliente.length, total }
  }, [clienteId, pedidos, pedido?.id])

  async function salvar() {
    if (!user) return
    if (!clienteId) return toast.error('Escolha o cliente.')
    if (validos.length === 0) return toast.error('Adicione ao menos um item válido (receita + quantidade).')

    const flag = sugeridoTotal > 0 && Math.abs(valorTotal - sugeridoTotal) / sugeridoTotal > LIMITE_DIVERGENCIA

    setSalvando(true)
    const cabecalho = {
      cliente_id: clienteId,
      status,
      data_entrega: dataEntrega || null,
      forma_pagamento_prevista: formaPrevista || null,
      flag_revisao: flag,
      valor_total: Math.round(valorTotal * 100) / 100,
    }

    let pedidoId = pedido?.id ?? null
    if (pedidoId) {
      const { error } = await supabase.from('pedidos').update(cabecalho).eq('id', pedidoId)
      if (error) { setSalvando(false); return toast.error('Erro ao salvar: ' + error.message) }
    } else {
      const { data, error } = await supabase.from('pedidos').insert({ ...cabecalho, user_id: user.id }).select('id').single()
      if (error || !data) { setSalvando(false); return toast.error('Erro ao salvar: ' + (error?.message ?? '')) }
      pedidoId = data.id
    }

    // sincroniza itens (apaga e reinsere)
    await supabase.from('pedido_itens').delete().eq('pedido_id', pedidoId)
    const linhas = validos.map((it) => ({
      user_id: user.id,
      pedido_id: pedidoId,
      receita_id: it.receita_id,
      quantidade: Math.round(parseNum(it.quantidade)),
      preco_unitario: parseNum(it.preco_unitario) || 0,
    }))
    const { error: errItens } = await supabase.from('pedido_itens').insert(linhas)
    setSalvando(false)
    if (errItens) return toast.error('Erro ao salvar itens: ' + errItens.message)
    if (flag) toast.warning('Valor diverge mais de 20% do sugerido — marcado para revisão.')
    toast.success(pedido ? 'Pedido salvo!' : 'Pedido criado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select value={clienteId} onValueChange={setClienteId}>
          <SelectTrigger><SelectValue placeholder="Escolha o cliente" /></SelectTrigger>
          <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {historico && historico.qtd > 0 && (
        <p className="rounded-md border bg-muted/30 p-2 text-sm text-muted-foreground">
          Este cliente já fez <span className="font-medium text-foreground">{historico.qtd}</span> pedido(s), total {formatBRL(historico.total)}.
        </p>
      )}

      <div className="space-y-2">
        <Label>Itens</Label>
        {receitas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre receitas primeiro para montar o pedido.</p>
        ) : (
          <div className="space-y-2">
            {itens.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={it.receita_id} onValueChange={(v) => escolherReceita(i, v)}>
                    <SelectTrigger><SelectValue placeholder="Receita" /></SelectTrigger>
                    <SelectContent>{receitas.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-16">
                  <Input inputMode="decimal" value={it.quantidade} onChange={(e) => setItem(i, { quantidade: e.target.value })} placeholder="Qtd" />
                </div>
                <div className="w-24">
                  <Input inputMode="decimal" value={it.preco_unitario} onChange={(e) => setItem(i, { preco_unitario: e.target.value })} placeholder="Preço un." />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} aria-label="Remover item"><Trash2 className="text-muted-foreground" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus /> Adicionar item</Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total do pedido</span>
        <span className="text-lg font-bold">{formatBRL(valorTotal)}</span>
      </div>
      {sugeridoTotal > 0 && Math.abs(valorTotal - sugeridoTotal) / sugeridoTotal > LIMITE_DIVERGENCIA && (
        <p className="-mt-2 text-xs text-amber-600">Diverge mais de 20% do sugerido ({formatBRL(sugeridoTotal)}) — será marcado para revisão.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ped-entrega">Data de entrega</Label>
          <Input id="ped-entrega" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Forma de pagamento prevista</Label>
        <Select value={formaPrevista} onValueChange={setFormaPrevista}>
          <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
          <SelectContent>{formas.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {pedido ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  )
}
