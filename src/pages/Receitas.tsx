import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, CookingPot } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/format'
import ReceitaForm, { type Ingrediente, type Receita } from '@/components/ReceitaForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function Receitas() {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Receita | null>(null)
  const [excluir, setExcluir] = useState<Receita | null>(null)

  const carregar = useCallback(async () => {
    const [r, g] = await Promise.all([
      supabase.from('receitas').select('*').order('nome'),
      supabase.from('ingredientes').select('id, nome, unidade, custo_unitario').order('nome'),
    ])
    if (r.error) toast.error('Erro ao carregar receitas: ' + r.error.message)
    setReceitas((r.data as Receita[]) ?? [])
    setIngredientes((g.data as Ingrediente[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return receitas.filter((r) => {
      const okBusca = !termo || r.nome.toLowerCase().includes(termo)
      const okStatus = filtroStatus === 'todos' || r.status === filtroStatus
      return okBusca && okStatus
    })
  }, [receitas, busca, filtroStatus])

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('receitas').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Receita excluída.')
      carregar()
    }
    setExcluir(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Receitas</h1>
        <Button onClick={() => setCriar(true)}>
          <Plus /> Nova receita
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar receita..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Rendimento</TableHead>
              <TableHead className="text-right">Custo direto</TableHead>
              <TableHead className="text-right">Preço sugerido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    temReceitas={receitas.length > 0}
                    onNova={() => setCriar(true)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-right">
                    {r.rendimento ? `${formatNum(r.rendimento)} un` : '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(r.custo_direto)}</TableCell>
                  <TableCell className="text-right">
                    {r.preco_sugerido != null ? formatBRL(r.preco_sugerido) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.status === 'ativo'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-amber-300 bg-amber-50 text-amber-700'
                      }
                    >
                      {r.status === 'ativo' ? 'Ativa' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(r)} aria-label="Editar">
                        <Pencil className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(r)} aria-label="Excluir">
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

      {/* Criar — Dialog */}
      <Dialog open={criar} onOpenChange={setCriar}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova receita</DialogTitle>
            <DialogDescription>
              Monte a receita com os ingredientes e calcule o preço sugerido.
            </DialogDescription>
          </DialogHeader>
          <ReceitaForm
            modo="criar"
            ingredientes={ingredientes}
            receita={null}
            onSaved={carregar}
            onClose={() => setCriar(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Editar — Sheet */}
      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar receita</SheetTitle>
            <SheetDescription>Ajuste os dados e recalcule o preço.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && (
              <ReceitaForm
                modo="editar"
                ingredientes={ingredientes}
                receita={editando}
                onSaved={carregar}
                onClose={() => setEditando(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Excluir — AlertDialog */}
      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              A receita "{excluir?.nome}" e seus ingredientes serão removidos. Esta ação não pode ser desfeita.
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

function EmptyState({ temReceitas, onNova }: { temReceitas: boolean; onNova: () => void }) {
  if (temReceitas) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma receita encontrada com esse filtro.
      </p>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <CookingPot className="size-8 text-muted-foreground" />
      <p className="text-muted-foreground">Você ainda não tem receitas cadastradas.</p>
      <Button onClick={onNova}>
        <Plus /> Criar primeira receita
      </Button>
    </div>
  )
}
