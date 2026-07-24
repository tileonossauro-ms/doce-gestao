import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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

export type Campo = {
  key: string
  label: string
  tipo?: 'text' | 'select' | 'boolean'
  opcoes?: { value: string; label: string }[]
  placeholder?: string
  obrigatorio?: boolean
  padrao?: string // valor inicial para registros novos (ex.: 'true' para booleano)
  ajuda?: string  // dica pequena abaixo do campo
}

type Registro = Record<string, unknown> & { id: string; ativo?: boolean }

export default function CadastroSimples({
  tabela, titulo, singular, campos, temAtivo = true, icone: Icone, ajuda,
}: {
  tabela: string
  titulo: string
  singular: string
  campos: Campo[]
  temAtivo?: boolean
  icone: LucideIcon
  ajuda?: React.ReactNode
}) {
  const [lista, setLista] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Registro | null>(null)
  const [excluir, setExcluir] = useState<Registro | null>(null)
  const primeiroCampo = campos[0]?.key ?? 'nome'

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from(tabela).select('*').order(primeiroCampo)
    if (error) toast.error('Erro ao carregar: ' + error.message)
    setLista((data as Registro[]) ?? [])
    setLoading(false)
  }, [tabela, primeiroCampo])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return lista
    return lista.filter((r) => String(r[primeiroCampo] ?? '').toLowerCase().includes(t))
  }, [lista, busca, primeiroCampo])

  const getVal = useCallback(
    (r: Registro, k: string) => (k === 'ativo' ? r.ativo !== false : r[k]),
    [],
  )
  const { sorted, sort, toggle } = useSort(filtrados, getVal, { key: primeiroCampo, dir: 'asc' })

  function rotuloOpcao(campo: Campo, valor: unknown) {
    if (campo.tipo === 'boolean') return valor === true ? 'Sim' : 'Não'
    if (campo.tipo === 'select') return campo.opcoes?.find((o) => o.value === valor)?.label ?? String(valor ?? '—')
    return String(valor ?? '—')
  }

  async function confirmarExclusao() {
    if (!excluir) return
    const { error } = await supabase.from(tabela).delete().eq('id', excluir.id)
    if (error) toast.error('Erro ao excluir: ' + error.message + ' (pode estar em uso em algum lançamento/pedido)')
    else {
      toast.success(`${singular} excluído(a).`)
      carregar()
    }
    setExcluir(null)
  }

  const colSpan = campos.length + (temAtivo ? 1 : 0) + 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <Button onClick={() => setCriar(true)}><Plus /> Novo(a) {singular.toLowerCase()}</Button>
      </div>

      {ajuda}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {campos.map((c) => <SortHead key={c.key} sortKey={c.key} sort={sort} onSort={toggle}>{c.label}</SortHead>)}
              {temAtivo && <SortHead sortKey="ativo" sort={sort} onSort={toggle}>Situação</SortHead>}
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={colSpan}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan}>
                  {lista.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <Icone className="size-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Nada cadastrado ainda.</p>
                      <Button onClick={() => setCriar(true)}><Plus /> Cadastrar {singular.toLowerCase()}</Button>
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">Nenhum resultado.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow key={r.id}>
                  {campos.map((c, i) => (
                    <TableCell key={c.key} className={i === 0 ? 'font-medium' : ''}>{rotuloOpcao(c, r[c.key])}</TableCell>
                  ))}
                  {temAtivo && (
                    <TableCell>
                      <Badge variant="outline" className={r.ativo === false
                        ? 'border-neutral-300 bg-neutral-50 text-neutral-500'
                        : 'border-green-300 bg-green-50 text-green-700'}>
                        {r.ativo === false ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(r)} aria-label="Editar"><Pencil className="text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(r)} aria-label="Excluir"><Trash2 className="text-muted-foreground" /></Button>
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
            <DialogTitle>Novo(a) {singular.toLowerCase()}</DialogTitle>
            <DialogDescription>Preencha os dados do cadastro.</DialogDescription>
          </DialogHeader>
          <Form tabela={tabela} campos={campos} temAtivo={temAtivo} registro={null} onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar {singular.toLowerCase()}</SheetTitle>
            <SheetDescription>Atualize os dados do cadastro.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <Form tabela={tabela} campos={campos} temAtivo={temAtivo} registro={editando} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              "{String(excluir?.[primeiroCampo] ?? '')}" será removido(a). Se estiver em uso, dê baixa/edite os registros que o utilizam antes.
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

function Form({
  tabela, campos, temAtivo, registro, onSaved, onClose,
}: {
  tabela: string
  campos: Campo[]
  temAtivo: boolean
  registro: Registro | null
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const c of campos) {
      const v = registro?.[c.key]
      if (v != null) init[c.key] = String(v)
      else if (c.tipo === 'boolean') init[c.key] = c.padrao ?? 'false'
      else if (c.tipo === 'select') init[c.key] = c.opcoes?.[0]?.value ?? ''
      else init[c.key] = ''
    }
    return init
  })
  const [ativo, setAtivo] = useState(registro?.ativo !== false)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!user) return
    for (const c of campos) {
      if (c.obrigatorio !== false && !valores[c.key]?.trim()) return toast.error(`Preencha: ${c.label}.`)
    }
    setSalvando(true)
    const payload: Record<string, unknown> = {}
    for (const c of campos) payload[c.key] = c.tipo === 'boolean' ? valores[c.key] === 'true' : (valores[c.key]?.trim() || null)
    if (temAtivo) payload.ativo = ativo
    const { error } = registro
      ? await supabase.from(tabela).update(payload).eq('id', registro.id)
      : await supabase.from(tabela).insert({ ...payload, user_id: user.id })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(registro ? 'Salvo!' : 'Criado!')
    onSaved()
    onClose()
  }

  return (
    <div className="space-y-4">
      {campos.map((c) => (
        <div key={c.key} className="space-y-2">
          <Label htmlFor={`f-${c.key}`}>{c.label}</Label>
          {c.tipo === 'select' ? (
            <Select value={valores[c.key]} onValueChange={(v) => setValores((s) => ({ ...s, [c.key]: v }))}>
              <SelectTrigger id={`f-${c.key}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {c.opcoes?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : c.tipo === 'boolean' ? (
            <Select value={valores[c.key]} onValueChange={(v) => setValores((s) => ({ ...s, [c.key]: v }))}>
              <SelectTrigger id={`f-${c.key}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`f-${c.key}`}
              value={valores[c.key]}
              onChange={(e) => setValores((s) => ({ ...s, [c.key]: e.target.value }))}
              placeholder={c.placeholder}
            />
          )}
          {c.ajuda && <p className="text-xs text-muted-foreground">{c.ajuda}</p>}
        </div>
      ))}
      {temAtivo && (
        <div className="space-y-2">
          <Label htmlFor="f-ativo">Situação</Label>
          <Select value={ativo ? 'sim' : 'nao'} onValueChange={(v) => setAtivo(v === 'sim')}>
            <SelectTrigger id="f-ativo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Ativo</SelectItem>
              <SelectItem value="nao">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {registro ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </div>
  )
}
