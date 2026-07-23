import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, ArrowUpCircle, ArrowDownCircle, Wallet, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatData, parseNum } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

type Lancamento = {
  id: string
  tipo: 'entrada' | 'saida'
  descricao: string | null
  valor: number
  pedido_id: string | null
  data: string
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

/** Primeiro dia do mês atual em ISO (YYYY-MM-01). */
function inicioDoMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Data ISO de N dias atrás. */
function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function Financeiro() {
  const [lista, setLista] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const [excluir, setExcluir] = useState<Lancamento | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('lancamentos').select('*').order('data', { ascending: false })
    if (error) toast.error('Erro ao carregar: ' + error.message)
    setLista(((data as Lancamento[]) ?? []).map((l) => ({ ...l, valor: Number(l.valor) })))
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('lancamentos').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Lançamento excluído.')
      carregar()
    }
    setExcluir(null)
  }

  // Cards: sempre o mês-calendário atual.
  const doMes = useMemo(() => {
    const ini = inicioDoMes()
    const m = lista.filter((l) => l.data >= ini)
    const entradas = m.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
    const saidas = m.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
    return { entradas, saidas, saldo: entradas - saidas }
  }, [lista])

  const filtrados = useMemo(() => {
    const limite =
      filtroPeriodo === 'mes' ? inicioDoMes()
      : filtroPeriodo === '30' ? diasAtras(30)
      : filtroPeriodo === '90' ? diasAtras(90)
      : '0000-01-01'
    return lista.filter((l) => l.data >= limite && (filtroTipo === 'todos' || l.tipo === filtroTipo))
  }, [lista, filtroTipo, filtroPeriodo])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <Button onClick={() => setCriar(true)}><Plus /> Novo lançamento</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CardKpi titulo="Entradas do mês" valor={doMes.entradas} icone={<ArrowUpCircle className="size-5 text-green-600" />} cor="text-green-600" loading={loading} />
        <CardKpi titulo="Saídas do mês" valor={doMes.saidas} icone={<ArrowDownCircle className="size-5 text-red-600" />} cor="text-red-600" loading={loading} />
        <CardKpi titulo="Saldo do mês" valor={doMes.saldo} icone={<Wallet className="size-5 text-primary" />} cor={doMes.saldo >= 0 ? 'text-foreground' : 'text-red-600'} loading={loading} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="tudo">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum lançamento neste filtro. Use "Novo lançamento" para registrar entradas e saídas.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{formatData(l.data)}</TableCell>
                  <TableCell className="font-medium">{l.descricao || '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={l.tipo === 'entrada' ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}
                    >
                      {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${l.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
                    {l.tipo === 'entrada' ? '+' : '−'} {formatBRL(l.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setEditando(l)}
                        disabled={!!l.pedido_id}
                        title={l.pedido_id ? 'Lançamento gerado por um pedido — edite pelo pedido' : 'Editar'}
                        aria-label="Editar"
                      >
                        <Pencil className="text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setExcluir(l)}
                        disabled={!!l.pedido_id}
                        title={l.pedido_id ? 'Lançamento gerado por um pedido — não pode excluir aqui' : 'Excluir'}
                        aria-label="Excluir"
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={criar} onOpenChange={setCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>Registre uma entrada (recebimento) ou saída (gasto).</DialogDescription>
          </DialogHeader>
          <LancamentoForm onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar lançamento</SheetTitle>
            <SheetDescription>Corrija os dados do lançamento.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <LancamentoForm lancamento={editando} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluir?.descricao || (excluir?.tipo === 'entrada' ? 'Entrada' : 'Saída')}" no valor de {excluir ? formatBRL(excluir.valor) : ''} será removido. Esta ação não pode ser desfeita.
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

function CardKpi({ titulo, valor, icone, cor, loading }: { titulo: string; valor: number; icone: React.ReactNode; cor: string; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-28" /> : <p className={`text-2xl font-bold ${cor}`}>{formatBRL(valor)}</p>}
      </CardContent>
    </Card>
  )
}

function LancamentoForm({ lancamento, onSaved, onClose }: { lancamento?: Lancamento; onSaved: () => void; onClose: () => void }) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState<'entrada' | 'saida'>(lancamento?.tipo ?? 'saida')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [valor, setValor] = useState(lancamento?.valor?.toString() ?? '')
  const [data, setData] = useState(lancamento?.data ?? hojeISO())
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!user) return
    const v = parseNum(valor)
    if (!Number.isFinite(v) || v <= 0) return toast.error('Informe um valor maior que zero.')
    if (!data) return toast.error('Informe a data.')
    setSalvando(true)
    const base = { tipo, descricao: descricao.trim() || null, valor: v, data }
    const { error } = lancamento
      ? await supabase.from('lancamentos').update(base).eq('id', lancamento.id)
      : await supabase.from('lancamentos').insert({ ...base, user_id: user.id })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(lancamento ? 'Lançamento atualizado!' : 'Lançamento registrado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as 'entrada' | 'saida')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada (recebimento)</SelectItem>
              <SelectItem value="saida">Saída (gasto)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lan-valor">Valor (R$)</Label>
          <Input id="lan-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 45,00" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lan-desc">Descrição</Label>
        <Input id="lan-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Compra de embalagens" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lan-data">Data</Label>
        <Input id="lan-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {lancamento ? 'Salvar' : 'Registrar'}
        </Button>
      </div>
    </div>
  )
}
