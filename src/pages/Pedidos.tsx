import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
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

type Cliente = { id: string; nome: string }
type Receita = { id: string; nome: string; preco_sugerido: number | null }
type Pedido = {
  id: string
  cliente_id: string | null
  receita_id: string | null
  quantidade: number
  valor_total: number
  status: string
  data_entrega: string | null
  flag_revisao: boolean
  cliente: { nome: string } | null
  receita: { nome: string } | null
}

const STATUS = ['novo', 'em produção', 'entregue']
const LIMITE_DIVERGENCIA = 0.2 // 20%

function badgeStatus(status: string) {
  if (status === 'entregue') return 'border-green-300 bg-green-50 text-green-700'
  if (status === 'em produção') return 'border-amber-300 bg-amber-50 text-amber-700'
  return 'border-blue-300 bg-blue-50 text-blue-700'
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Pedido | null>(null)
  const [excluir, setExcluir] = useState<Pedido | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [p, c, r, l] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, cliente:clientes(nome), receita:receitas(nome)')
        .order('data_entrega', { ascending: false, nullsFirst: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('receitas').select('id, nome, preco_sugerido').order('nome'),
      supabase.from('lancamentos').select('pedido_id').eq('tipo', 'entrada').not('pedido_id', 'is', null),
    ])
    if (p.error) toast.error('Erro ao carregar pedidos: ' + p.error.message)
    setPedidos((p.data as unknown as Pedido[]) ?? [])
    setClientes((c.data as Cliente[]) ?? [])
    setReceitas((r.data as Receita[]) ?? [])
    setConfirmados(new Set(((l.data as { pedido_id: string }[]) ?? []).map((x) => x.pedido_id)))
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function confirmar(pedido: Pedido) {
    setConfirmandoId(pedido.id)
    const { data, error } = await supabase.rpc('confirmar_pedido', { p_pedido_id: pedido.id })
    setConfirmandoId(null)
    if (error) return toast.error('Erro ao confirmar: ' + error.message)
    if (!data?.ok) return toast.error(data?.erro ?? 'Não foi possível confirmar.')
    if (data.ja_confirmado) toast.info('Este pedido já estava confirmado.')
    else toast.success(`Pedido confirmado! Entrada de ${formatBRL(data.valor)} no financeiro.`)
    carregar()
  }

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('pedidos').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Pedido excluído.')
      carregar()
    }
    setExcluir(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Button onClick={() => setCriar(true)} disabled={clientes.length === 0 || receitas.length === 0}>
          <Plus /> Novo pedido
        </Button>
      </div>

      {(clientes.length === 0 || receitas.length === 0) && !loading && (
        <p className="text-sm text-muted-foreground">
          Para criar pedidos, cadastre ao menos um cliente e uma receita primeiro.
        </p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Receita</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entrega</TableHead>
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
                    {clientes.length > 0 && receitas.length > 0 && (
                      <Button onClick={() => setCriar(true)}><Plus /> Criar primeiro pedido</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((p) => {
                const confirmado = confirmados.has(p.id)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.cliente?.nome ?? '—'}</TableCell>
                    <TableCell>{p.receita?.nome ?? '—'}</TableCell>
                    <TableCell className="text-right">{p.quantidade}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        {p.flag_revisao && <AlertTriangle className="size-3.5 text-amber-500" aria-label="Valor precisa de revisão" />}
                        {formatBRL(p.valor_total)}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={badgeStatus(p.status)}>{p.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatData(p.data_entrega)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {confirmado ? (
                          <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                            <CheckCircle2 className="mr-1 size-3" /> Confirmado
                          </Badge>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => confirmar(p)} disabled={confirmandoId === p.id}>
                            {confirmandoId === p.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                            Confirmar
                          </Button>
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
            <DialogDescription>O valor é sugerido pela receita, mas você pode ajustar.</DialogDescription>
          </DialogHeader>
          <PedidoForm clientes={clientes} receitas={receitas} pedidos={pedidos} onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar pedido</SheetTitle>
            <SheetDescription>Ajuste os dados do pedido.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && (
              <PedidoForm pedido={editando} clientes={clientes} receitas={receitas} pedidos={pedidos} onSaved={carregar} onClose={() => setEditando(null)} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido será removido. Se já havia lançamento financeiro, ele deixará de ficar vinculado.
            </AlertDialogDescription>
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

function PedidoForm({
  pedido, clientes, receitas, pedidos, onSaved, onClose,
}: {
  pedido?: Pedido
  clientes: Cliente[]
  receitas: Receita[]
  pedidos: Pedido[]
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? '')
  const [receitaId, setReceitaId] = useState(pedido?.receita_id ?? '')
  const [quantidade, setQuantidade] = useState(pedido?.quantidade?.toString() ?? '1')
  const [valor, setValor] = useState(pedido?.valor_total?.toString() ?? '')
  const [valorManual, setValorManual] = useState(!!pedido) // ao editar, preserva o valor salvo
  const [status, setStatus] = useState(pedido?.status ?? 'novo')
  const [dataEntrega, setDataEntrega] = useState(pedido?.data_entrega ?? '')
  const [salvando, setSalvando] = useState(false)

  const receita = receitas.find((r) => r.id === receitaId)
  const qtd = parseNum(quantidade)
  const sugerido =
    receita?.preco_sugerido != null && Number.isFinite(qtd) ? receita.preco_sugerido * qtd : null

  // Preenche o valor com o sugerido enquanto o usuário não editar manualmente.
  useEffect(() => {
    if (!valorManual && sugerido != null) setValor(sugerido.toFixed(2))
  }, [sugerido, valorManual])

  const historico = useMemo(() => {
    if (!clienteId) return null
    const doCliente = pedidos.filter((p) => p.cliente_id === clienteId && p.id !== pedido?.id)
    if (doCliente.length === 0) return { qtd: 0, total: 0, top: null as string | null }
    const total = doCliente.reduce((s, p) => s + Number(p.valor_total), 0)
    const contagem = new Map<string, number>()
    for (const p of doCliente) {
      const nome = p.receita?.nome
      if (nome) contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
    }
    let top: string | null = null
    let max = 0
    for (const [nome, n] of contagem) if (n > max) { max = n; top = nome }
    return { qtd: doCliente.length, total, top }
  }, [clienteId, pedidos, pedido?.id])

  async function salvar() {
    if (!user) return
    if (!clienteId) return toast.error('Escolha o cliente.')
    if (!receitaId) return toast.error('Escolha a receita.')
    const q = parseNum(quantidade)
    if (!Number.isFinite(q) || q <= 0) return toast.error('Informe uma quantidade válida.')
    const v = parseNum(valor)
    if (!Number.isFinite(v) || v < 0) return toast.error('Informe um valor válido.')

    // flag_revisao: valor diverge mais de 20% do sugerido
    const flag = sugerido != null && sugerido > 0 && Math.abs(v - sugerido) / sugerido > LIMITE_DIVERGENCIA

    setSalvando(true)
    const base = {
      cliente_id: clienteId,
      receita_id: receitaId,
      quantidade: Math.round(q),
      valor_total: v,
      status,
      data_entrega: dataEntrega || null,
      flag_revisao: flag,
    }
    const { error } = pedido
      ? await supabase.from('pedidos').update(base).eq('id', pedido.id)
      : await supabase.from('pedidos').insert({ ...base, user_id: user.id })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
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
          <SelectContent>
            {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {historico && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Histórico deste cliente</p>
          {historico.qtd === 0 ? (
            <p className="text-muted-foreground">Primeiro pedido deste cliente. 🎉</p>
          ) : (
            <p className="text-muted-foreground">
              {historico.qtd} pedido(s) · total {formatBRL(historico.total)}
              {historico.top && <> · mais pedido: <span className="font-medium text-foreground">{historico.top}</span></>}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Receita</Label>
        <Select value={receitaId} onValueChange={setReceitaId}>
          <SelectTrigger><SelectValue placeholder="Escolha a receita" /></SelectTrigger>
          <SelectContent>
            {receitas.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ped-qtd">Quantidade</Label>
          <Input id="ped-qtd" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ped-valor">Valor total (R$)</Label>
          <Input
            id="ped-valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => { setValorManual(true); setValor(e.target.value) }}
          />
        </div>
      </div>
      {sugerido != null && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Sugerido: {formatBRL(sugerido)}{' '}
          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => { setValorManual(false); setValor(sugerido.toFixed(2)) }}>
            usar sugerido
          </button>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ped-entrega">Data de entrega</Label>
          <Input id="ped-entrega" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
        </div>
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
