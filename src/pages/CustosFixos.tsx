import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2, Receipt } from 'lucide-react'
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
import { useSort, SortHead } from '@/components/SortHead'
import Ajuda from '@/components/Ajuda'
import DicaTermo from '@/components/DicaTermo'

type Categoria = { id: string; nome: string; tipo: string }
type CustoFixo = {
  id: string
  nome: string
  valor_mensal: number
  categoria_id: string | null
  inicio: string
  fim: string | null
  categoria: { nome: string } | null
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function CustosFixos() {
  const [lista, setLista] = useState<CustoFixo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<CustoFixo | null>(null)
  const [excluir, setExcluir] = useState<CustoFixo | null>(null)

  const carregar = useCallback(async () => {
    const [c, k] = await Promise.all([
      supabase.from('custos_fixos').select('*, categoria:categorias_financeiras(nome)').order('nome'),
      supabase.from('categorias_financeiras').select('id, nome, tipo').eq('ativo', true).order('nome'),
    ])
    if (c.error) toast.error('Erro ao carregar: ' + c.error.message)
    setLista(((c.data as unknown as CustoFixo[]) ?? []).map((x) => ({ ...x, valor_mensal: Number(x.valor_mensal) })))
    setCategorias(((k.data as Categoria[]) ?? []).filter((x) => x.tipo !== 'variavel'))
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t ? lista.filter((c) => c.nome.toLowerCase().includes(t)) : lista
  }, [lista, busca])

  const totalAtivo = useMemo(
    () => lista.filter((c) => !c.fim).reduce((s, c) => s + c.valor_mensal, 0),
    [lista],
  )

  const { sorted, sort, toggle } = useSort(
    filtrados,
    (c, k) => (k === 'categoria' ? c.categoria?.nome : (c as unknown as Record<string, unknown>)[k]),
    { key: 'nome', dir: 'asc' },
  )

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('custos_fixos').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else { toast.success('Custo fixo excluído.'); carregar() }
    setExcluir(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Custos fixos</h1>
        <Button onClick={() => setCriar(true)}><Plus /> Novo custo fixo</Button>
      </div>

      <Ajuda id="custos-fixos-o-que-e" titulo="O que é custo fixo (e o que não é)" padrao="fechado">
        <p><strong>Custo fixo</strong> é o que você paga todo mês mesmo sem vender nada: aluguel, energia, internet, assinaturas.</p>
        <p><strong>Custo variável</strong> é o que só existe quando há venda: ingredientes, embalagem, taxa da maquininha — esses você lança no Financeiro, não aqui.</p>
        <p className="text-muted-foreground">O DRE usa esta lista para chegar no lucro líquido de verdade.</p>
      </Ajuda>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar custo fixo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">
          Total ativo por mês: <strong className="text-foreground">{formatBRL(totalAtivo)}</strong>
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead sortKey="nome" sort={sort} onSort={toggle}>Nome</SortHead>
              <SortHead sortKey="categoria" sort={sort} onSort={toggle}>Categoria</SortHead>
              <SortHead sortKey="valor_mensal" sort={sort} onSort={toggle} className="text-right" dica={<DicaTermo titulo="Valor por mês">Quanto essa conta custa por mês. É esse valor que o DRE desconta como custo fixo.</DicaTermo>}>Valor por mês</SortHead>
              <SortHead sortKey="inicio" sort={sort} onSort={toggle} dica={<DicaTermo titulo="Vigência">Desde quando (e até quando) você paga essa conta. Serve para o DRE de cada mês contar só os custos que valiam naquele mês.</DicaTermo>}>Vigência</SortHead>
              <SortHead sortKey="fim" sort={sort} onSort={toggle} dica={<DicaTermo titulo="Situação">"Ativo" = você ainda paga. "Encerrado" = você preencheu a data em que parou de pagar (o histórico dos meses anteriores não muda).</DicaTermo>}>Situação</SortHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  {lista.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <Receipt className="size-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Nenhum custo fixo cadastrado ainda.</p>
                      <Button onClick={() => setCriar(true)}><Plus /> Cadastrar primeiro custo fixo</Button>
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">Nenhum resultado.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.categoria?.nome ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(c.valor_mensal)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatData(c.inicio)} {c.fim ? `até ${formatData(c.fim)}` : '— sem fim'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.fim
                      ? 'border-neutral-300 bg-neutral-50 text-neutral-500'
                      : 'border-green-300 bg-green-50 text-green-700'}>
                      {c.fim ? 'Encerrado' : 'Ativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(c)} aria-label="Editar"><Pencil className="text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(c)} aria-label="Excluir"><Trash2 className="text-muted-foreground" /></Button>
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
            <DialogTitle>Novo custo fixo</DialogTitle>
            <DialogDescription>Uma conta que se repete todo mês.</DialogDescription>
          </DialogHeader>
          <CustoForm categorias={categorias} onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar custo fixo</SheetTitle>
            <SheetDescription>Para parar de contar este custo, preencha a data de encerramento — os meses anteriores continuam certos.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <CustoForm custo={editando} categorias={categorias} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir custo fixo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluir?.nome}" some de todos os DREs, inclusive dos meses passados.
              Se você apenas parou de pagar, prefira editar e preencher a data de encerramento.
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

function CustoForm({ custo, categorias, onSaved, onClose }: {
  custo?: CustoFixo
  categorias: Categoria[]
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [nome, setNome] = useState(custo?.nome ?? '')
  const [valor, setValor] = useState(custo?.valor_mensal?.toString() ?? '')
  const [categoriaId, setCategoriaId] = useState(custo?.categoria_id ?? 'nenhuma')
  const [inicio, setInicio] = useState(custo?.inicio ?? hojeISO())
  const [fim, setFim] = useState(custo?.fim ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!user) return
    if (!nome.trim()) return toast.error('Informe o nome do custo.')
    const v = parseNum(valor)
    if (!Number.isFinite(v) || v <= 0) return toast.error('Informe um valor maior que zero.')
    if (!inicio) return toast.error('Informe desde quando você paga este custo.')
    if (fim && fim < inicio) return toast.error('A data de encerramento não pode ser antes do início.')
    setSalvando(true)
    const base = {
      nome: nome.trim(),
      valor_mensal: v,
      categoria_id: categoriaId === 'nenhuma' ? null : categoriaId,
      inicio,
      fim: fim || null,
    }
    const { error } = custo
      ? await supabase.from('custos_fixos').update(base).eq('id', custo.id)
      : await supabase.from('custos_fixos').insert({ ...base, user_id: user.id })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(custo ? 'Custo fixo salvo!' : 'Custo fixo criado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cf-nome">Nome</Label>
        <Input id="cf-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aluguel do espaço" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-valor">Valor por mês (R$)</Label>
          <Input id="cf-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 800,00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-cat">Categoria</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger id="cf-cat"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhuma">Sem categoria</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-inicio">Paga desde</Label>
          <Input id="cf-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-fim">Parou de pagar em</Label>
          <Input id="cf-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          <p className="text-xs text-muted-foreground">Deixe vazio se ainda paga.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {custo ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  )
}
