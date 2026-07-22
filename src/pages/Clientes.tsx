import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Users, Cake, Loader2 } from 'lucide-react'
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

type Cliente = {
  id: string
  nome: string
  telefone: string | null
  aniversario: string | null
  observacao: string | null
}

/** Mês (1-12) do aniversário, sem sofrer fuso (usa a string YYYY-MM-DD). */
function mesAniversario(aniversario: string | null): number | null {
  if (!aniversario) return null
  const m = aniversario.slice(5, 7)
  return m ? Number(m) : null
}

export default function Clientes() {
  const mesAtual = new Date().getMonth() + 1
  const [lista, setLista] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [excluir, setExcluir] = useState<Cliente | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('nome')
    if (error) toast.error('Erro ao carregar: ' + error.message)
    setLista((data as Cliente[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t
      ? lista.filter((c) => c.nome.toLowerCase().includes(t) || (c.telefone ?? '').includes(t))
      : lista
  }, [lista, busca])

  const aniversariantes = useMemo(
    () => lista.filter((c) => mesAniversario(c.aniversario) === mesAtual).length,
    [lista, mesAtual],
  )

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from('clientes').delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Cliente excluído.')
      carregar()
    }
    setExcluir(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Clientes</h1>
          {aniversariantes > 0 && (
            <Badge variant="outline" className="border-pink-300 bg-pink-50 text-pink-700">
              <Cake className="mr-1 size-3" /> {aniversariantes} fazem aniversário este mês
            </Badge>
          )}
        </div>
        <Button onClick={() => setCriar(true)}><Plus /> Novo cliente</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Aniversário</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
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
                  {lista.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <Users className="size-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
                      <Button onClick={() => setCriar(true)}><Plus /> Cadastrar primeiro cliente</Button>
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((c) => {
                const aniverEsteMes = mesAniversario(c.aniversario) === mesAtual
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {c.nome}
                        {aniverEsteMes && <Cake className="size-3.5 text-pink-500" aria-label="Aniversariante do mês" />}
                      </span>
                    </TableCell>
                    <TableCell>{c.telefone || '—'}</TableCell>
                    <TableCell>{formatData(c.aniversario)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{c.observacao || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditando(c)} aria-label="Editar"><Pencil className="text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluir(c)} aria-label="Excluir"><Trash2 className="text-muted-foreground" /></Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>Cadastre os dados de contato do cliente.</DialogDescription>
          </DialogHeader>
          <ClienteForm onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar cliente</SheetTitle>
            <SheetDescription>Atualize os dados do cliente.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <ClienteForm cliente={editando} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluir?.nome}" será removido. Os pedidos dele serão mantidos, mas sem cliente vinculado.
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

function ClienteForm({
  cliente, onSaved, onClose,
}: {
  cliente?: Cliente
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [nome, setNome] = useState(cliente?.nome ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')
  const [aniversario, setAniversario] = useState(cliente?.aniversario ?? '')
  const [observacao, setObservacao] = useState(cliente?.observacao ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!user) return
    if (!nome.trim()) return toast.error('Informe o nome do cliente.')
    setSalvando(true)
    const base = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      aniversario: aniversario || null,
      observacao: observacao.trim() || null,
    }
    const { error } = cliente
      ? await supabase.from('clientes').update(base).eq('id', cliente.id)
      : await supabase.from('clientes').insert({ ...base, user_id: user.id })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(cliente ? 'Cliente salvo!' : 'Cliente criado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cli-nome">Nome</Label>
        <Input id="cli-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Silva" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cli-tel">Telefone</Label>
          <Input id="cli-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cli-aniv">Aniversário</Label>
          <Input id="cli-aniv" type="date" value={aniversario} onChange={(e) => setAniversario(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cli-obs">Observação</Label>
        <Input id="cli-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: prefere pouco doce" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {cliente ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  )
}
