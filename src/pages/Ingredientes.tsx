import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, ShoppingBasket, Loader2, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatData, formatNum, parseNum } from '@/lib/format'
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

type Ingrediente = {
  id: string
  nome: string
  unidade: string
  custo_unitario: number | null
  estoque_atual: number
  estoque_minimo: number
  atualizado_em: string
}

const UNIDADES = ['g', 'ml', 'un', 'kg', 'L']

export default function Ingredientes() {
  const [lista, setLista] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Ingrediente | null>(null)
  const [excluir, setExcluir] = useState<Ingrediente | null>(null)
  const [movimentar, setMovimentar] = useState<Ingrediente | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('ingredientes').select('*').order('nome')
    if (error) toast.error('Erro ao carregar: ' + error.message)
    setLista(((data as Ingrediente[]) ?? []).map((i) => ({
      ...i, estoque_atual: Number(i.estoque_atual), estoque_minimo: Number(i.estoque_minimo),
    })))
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t ? lista.filter((i) => i.nome.toLowerCase().includes(t)) : lista
  }, [lista, busca])

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('ingredientes').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message + ' (o ingrediente pode estar em uma receita)')
    else { toast.success('Ingrediente excluído.'); carregar() }
    setExcluir(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ingredientes</h1>
        <Button onClick={() => setCriar(true)}><Plus /> Novo ingrediente</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar ingrediente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Custo unitário</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  {lista.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <ShoppingBasket className="size-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Nenhum ingrediente cadastrado ainda.</p>
                      <Button onClick={() => setCriar(true)}><Plus /> Cadastrar primeiro ingrediente</Button>
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">Nenhum ingrediente encontrado.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell>{i.unidade}</TableCell>
                  <TableCell className="text-right">
                    {i.custo_unitario != null ? formatBRL(i.custo_unitario) : <span className="text-amber-600">sem custo</span>}
                  </TableCell>
                  <TableCell className="text-right"><BadgeEstoque i={i} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatData(i.atualizado_em)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setMovimentar(i)} aria-label="Lançar compra/ajuste" title="Lançar compra/ajuste"><PackagePlus className="text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditando(i)} aria-label="Editar"><Pencil className="text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(i)} aria-label="Excluir"><Trash2 className="text-muted-foreground" /></Button>
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
            <DialogTitle>Novo ingrediente</DialogTitle>
            <DialogDescription>Cadastre um ingrediente com seu custo por unidade de medida.</DialogDescription>
          </DialogHeader>
          <IngredienteForm onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar ingrediente</SheetTitle>
            <SheetDescription>Ao mudar o custo, a data de atualização é registrada.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <IngredienteForm ingrediente={editando} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <MovimentacaoDialog ingrediente={movimentar} onClose={() => setMovimentar(null)} onDone={carregar} />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ingrediente?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluir?.nome}" será removido. Se ele estiver em alguma receita, a exclusão será bloqueada.
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

/** Estoque com cor: vermelho se negativo, amarelo se abaixo do mínimo. */
function BadgeEstoque({ i }: { i: Ingrediente }) {
  const txt = `${formatNum(i.estoque_atual)} ${i.unidade}`
  if (i.estoque_atual < 0) return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">{txt}</Badge>
  if (i.estoque_minimo > 0 && i.estoque_atual < i.estoque_minimo) return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">{txt}</Badge>
  return <span className="tabular-nums">{txt}</span>
}

function IngredienteForm({
  ingrediente, onSaved, onClose,
}: {
  ingrediente?: Ingrediente
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [nome, setNome] = useState(ingrediente?.nome ?? '')
  const [unidade, setUnidade] = useState(ingrediente?.unidade ?? 'un')
  const [custo, setCusto] = useState(ingrediente?.custo_unitario?.toString() ?? '')
  const [minimo, setMinimo] = useState(ingrediente?.estoque_minimo?.toString() ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!user) return
    if (!nome.trim()) return toast.error('Informe o nome do ingrediente.')
    const c = parseNum(custo)
    const m = parseNum(minimo)
    setSalvando(true)
    const base = {
      nome: nome.trim(),
      unidade,
      custo_unitario: Number.isFinite(c) ? c : null,
      estoque_minimo: Number.isFinite(m) ? m : 0,
    }
    let error
    if (ingrediente) {
      ;({ error } = await supabase.from('ingredientes').update({ ...base, atualizado_em: new Date().toISOString() }).eq('id', ingrediente.id))
    } else {
      ;({ error } = await supabase.from('ingredientes').insert({ ...base, user_id: user.id }))
    }
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(ingrediente ? 'Ingrediente salvo!' : 'Ingrediente criado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ing-nome">Nome</Label>
        <Input id="ing-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Leite condensado" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ing-uni">Unidade</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger id="ing-uni"><SelectValue /></SelectTrigger>
            <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ing-custo">Custo por unidade (R$)</Label>
          <Input id="ing-custo" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Ex.: 6,50" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ing-min">Estoque mínimo (aviso de baixo)</Label>
        <Input id="ing-min" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="0 = sem aviso" />
        <p className="text-xs text-muted-foreground">Abaixo desse valor, o estoque aparece em amarelo. O estoque em si você ajusta pelo botão de caixa (📦) na lista.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {ingrediente ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  )
}

/** Lançar compra (entrada) ou ajuste manual de estoque. */
function MovimentacaoDialog({ ingrediente, onClose, onDone }: { ingrediente: Ingrediente | null; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState<'entrada' | 'ajuste'>('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (ingrediente) { setTipo('entrada'); setQuantidade(''); setObservacao('') }
  }, [ingrediente])

  async function salvar() {
    if (!user || !ingrediente) return
    const q = parseNum(quantidade)
    if (!Number.isFinite(q) || q === 0) return toast.error('Informe uma quantidade (use negativo no ajuste para reduzir).')
    if (tipo === 'entrada' && q < 0) return toast.error('Compra não pode ser negativa. Para reduzir, escolha Ajuste.')
    setSalvando(true)
    const { error } = await supabase.from('movimentacoes_estoque').insert({
      user_id: user.id, ingrediente_id: ingrediente.id, tipo, quantidade: q, observacao: observacao.trim() || null,
    })
    setSalvando(false)
    if (error) return toast.error('Erro: ' + error.message)
    toast.success('Estoque atualizado!')
    onDone()
    onClose()
  }

  return (
    <Dialog open={!!ingrediente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>{ingrediente?.nome} — atual: {ingrediente ? `${formatNum(ingrediente.estoque_atual)} ${ingrediente.unidade}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'entrada' | 'ajuste')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Compra (adiciona ao estoque)</SelectItem>
                <SelectItem value="ajuste">Ajuste manual (+/−)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-qtd">Quantidade ({ingrediente?.unidade})</Label>
            <Input id="mov-qtd" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
              placeholder={tipo === 'ajuste' ? 'Ex.: -2 para reduzir' : 'Ex.: 10'} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-obs">Observação</Label>
            <Input id="mov-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: compra no atacado" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="animate-spin" />} Lançar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
