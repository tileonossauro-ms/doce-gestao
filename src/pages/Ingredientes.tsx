import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, ShoppingBasket, Loader2, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatData, formatNum, parseNum } from '@/lib/format'
import DicaTermo from '@/components/DicaTermo'
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

type Ingrediente = {
  id: string
  nome: string
  unidade: string
  custo_unitario: number | null
  tamanho_embalagem: number | null
  preco_embalagem: number | null
  estoque_atual: number
  estoque_minimo: number
  marca_id: string | null
  fornecedor_id: string | null
  categoria_id: string | null
  atualizado_em: string
}
export type Opcao = { id: string; nome: string }

// A receita sempre usa a unidade-base do tipo. kg/L só existem como conveniência na compra.
const TIPOS = [
  { base: 'g', rotulo: 'Peso (em gramas)' },
  { base: 'ml', rotulo: 'Volume (em ml)' },
  { base: 'un', rotulo: 'Unidade (contável)' },
]
/** Como a pessoa pode comprar, por tipo: cada opção traz o fator p/ converter à unidade-base. */
function opcoesCompra(base: string): { u: string; f: number }[] {
  if (base === 'g') return [{ u: 'kg', f: 1000 }, { u: 'g', f: 1 }]
  if (base === 'ml') return [{ u: 'L', f: 1000 }, { u: 'ml', f: 1 }]
  return [{ u: 'un', f: 1 }]
}

export default function Ingredientes() {
  const [lista, setLista] = useState<Ingrediente[]>([])
  const [marcas, setMarcas] = useState<Opcao[]>([])
  const [fornecedores, setFornecedores] = useState<Opcao[]>([])
  const [categorias, setCategorias] = useState<Opcao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [criar, setCriar] = useState(false)
  const [editando, setEditando] = useState<Ingrediente | null>(null)
  const [excluir, setExcluir] = useState<Ingrediente | null>(null)
  const [movimentar, setMovimentar] = useState<Ingrediente | null>(null)

  const carregar = useCallback(async () => {
    const [g, m, f, c] = await Promise.all([
      supabase.from('ingredientes').select('*').order('nome'),
      supabase.from('marcas').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('categorias_ingredientes').select('id, nome').eq('ativo', true).order('nome'),
    ])
    if (g.error) toast.error('Erro ao carregar: ' + g.error.message)
    setLista(((g.data as Ingrediente[]) ?? []).map((i) => ({
      ...i, estoque_atual: Number(i.estoque_atual), estoque_minimo: Number(i.estoque_minimo),
    })))
    setMarcas((m.data as Opcao[]) ?? [])
    setFornecedores((f.data as Opcao[]) ?? [])
    setCategorias((c.data as Opcao[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t ? lista.filter((i) => i.nome.toLowerCase().includes(t)) : lista
  }, [lista, busca])

  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? '—'

  const { sorted, sort, toggle } = useSort(
    filtrados,
    (i, k) => (k === 'categoria' ? nomeCategoria(i.categoria_id) : (i as unknown as Record<string, unknown>)[k]),
    { key: 'nome', dir: 'asc' },
  )

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
              <SortHead sortKey="nome" sort={sort} onSort={toggle}>Nome</SortHead>
              <SortHead sortKey="categoria" sort={sort} onSort={toggle}>Categoria</SortHead>
              <SortHead sortKey="unidade" sort={sort} onSort={toggle}>Unidade</SortHead>
              <SortHead sortKey="custo_unitario" sort={sort} onSort={toggle} className="text-right" dica={<DicaTermo titulo="Custo unitário">Quanto custa cada unidade do ingrediente (por grama, ml ou unidade). Vem do preço da embalagem dividido pelo tamanho dela.</DicaTermo>}>Custo unitário</SortHead>
              <SortHead sortKey="estoque_atual" sort={sort} onSort={toggle} className="text-right" dica={<DicaTermo titulo="Estoque">Quanto você tem hoje desse ingrediente. Fica vermelho se negativo e amarelo se abaixo do estoque mínimo.</DicaTermo>}>Estoque</SortHead>
              <SortHead sortKey="atualizado_em" sort={sort} onSort={toggle}>Atualizado em</SortHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
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
              sorted.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{nomeCategoria(i.categoria_id)}</TableCell>
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
          <IngredienteForm marcas={marcas} fornecedores={fornecedores} categorias={categorias} onSaved={carregar} onClose={() => setCriar(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar ingrediente</SheetTitle>
            <SheetDescription>Ao mudar o custo, a data de atualização é registrada.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editando && <IngredienteForm ingrediente={editando} marcas={marcas} fornecedores={fornecedores} categorias={categorias} onSaved={carregar} onClose={() => setEditando(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <MovimentacaoDialog ingrediente={movimentar} marcas={marcas} fornecedores={fornecedores} onClose={() => setMovimentar(null)} onDone={carregar} />

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
  ingrediente, marcas, fornecedores, categorias, onSaved, onClose,
}: {
  ingrediente?: Ingrediente
  marcas: Opcao[]
  fornecedores: Opcao[]
  categorias: Opcao[]
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [nome, setNome] = useState(ingrediente?.nome ?? '')
  const [unidade, setUnidade] = useState(ingrediente?.unidade ?? 'g') // unidade-base (g/ml/un)
  // Compra: ela pode comprar em kg/L; guardamos o tamanho já convertido à base.
  const [unidadeCompra, setUnidadeCompra] = useState(() => opcoesCompra(ingrediente?.unidade ?? 'g')[0].u)
  const [tamanho, setTamanho] = useState(() => {
    const te = ingrediente?.tamanho_embalagem
    if (te == null) return ''
    const f = opcoesCompra(ingrediente?.unidade ?? 'g')[0].f
    return String(te / f)
  })
  const [preco, setPreco] = useState(ingrediente?.preco_embalagem?.toString() ?? '')
  const [minimo, setMinimo] = useState(ingrediente?.estoque_minimo?.toString() ?? '')
  const [marcaId, setMarcaId] = useState(ingrediente?.marca_id ?? 'nenhuma')
  const [fornecedorId, setFornecedorId] = useState(ingrediente?.fornecedor_id ?? 'nenhum')
  // Categoria: lista local (para poder anexar uma recém-criada sem recarregar a página).
  const [cats, setCats] = useState<Opcao[]>(categorias)
  const [categoriaId, setCategoriaId] = useState(ingrediente?.categoria_id ?? 'nenhuma')
  const [novaCatAberta, setNovaCatAberta] = useState(false)
  const [novaCatNome, setNovaCatNome] = useState('')
  const [salvandoCat, setSalvandoCat] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function criarCategoria() {
    if (!user) return
    const n = novaCatNome.trim()
    if (!n) return toast.error('Informe o nome da categoria.')
    setSalvandoCat(true)
    const { data, error } = await supabase.from('categorias_ingredientes')
      .insert({ user_id: user.id, nome: n }).select('id, nome').single()
    setSalvandoCat(false)
    if (error || !data) return toast.error('Erro ao criar categoria: ' + (error?.message ?? '') + ' (talvez já exista)')
    setCats((prev) => [...prev, data as Opcao].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
    setCategoriaId(data.id)          // já seleciona a nova
    setNovaCatNome('')
    setNovaCatAberta(false)
    toast.success('Categoria criada e selecionada!')
  }

  const opcoes = opcoesCompra(unidade)
  const fator = opcoes.find((o) => o.u === unidadeCompra)?.f ?? 1
  const t = parseNum(tamanho)
  const p = parseNum(preco)
  // tamanho convertido à unidade-base (ex.: 1 kg → 1000 g) e custo por unidade-base.
  const tamanhoBase = Number.isFinite(t) && t > 0 ? t * fator : null
  const custoUnit = tamanhoBase != null && Number.isFinite(p) ? p / tamanhoBase : null

  async function salvar() {
    if (!user) return
    if (!nome.trim()) return toast.error('Informe o nome do ingrediente.')
    const m = parseNum(minimo)
    setSalvando(true)
    const base = {
      nome: nome.trim(),
      unidade,
      tamanho_embalagem: tamanhoBase,
      preco_embalagem: Number.isFinite(p) ? p : null,
      custo_unitario: custoUnit,
      estoque_minimo: Number.isFinite(m) ? m : 0,
      marca_id: marcaId === 'nenhuma' ? null : marcaId,
      fornecedor_id: fornecedorId === 'nenhum' ? null : fornecedorId,
      categoria_id: categoriaId === 'nenhuma' ? null : categoriaId,
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

      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="flex items-center gap-2">
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Escolha a categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhuma">Sem categoria</SelectItem>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => setNovaCatAberta((v) => !v)}>
            <Plus /> Nova categoria
          </Button>
        </div>
        {novaCatAberta && (
          <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="nova-cat" className="text-xs">Nome da nova categoria</Label>
              <Input id="nova-cat" value={novaCatNome} onChange={(e) => setNovaCatNome(e.target.value)}
                placeholder="Ex.: Frutas secas" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); criarCategoria() } }} />
            </div>
            <Button type="button" size="sm" onClick={criarCategoria} disabled={salvandoCat}>
              {salvandoCat ? <Loader2 className="animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ing-uni" className="flex items-center gap-1">Tipo de medida
          <DicaTermo titulo="Tipo de medida">Como você mede esse item. <strong>Peso</strong> (chocolate, açúcar) → a receita usa em gramas. <strong>Volume</strong> (chantilly) → em ml. <strong>Unidade</strong> (ovo, caixa) → em unidades. Você compra em kg/L, mas na receita é sempre a medida pequena.</DicaTermo>
        </Label>
        <Select value={unidade} onValueChange={(v) => { setUnidade(v); setUnidadeCompra(opcoesCompra(v)[0].u) }}>
          <SelectTrigger id="ing-uni" className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{TIPOS.map((t2) => <SelectItem key={t2.base} value={t2.base}>{t2.rotulo}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Na receita, este ingrediente será sempre usado em <strong>{unidade}</strong>.</p>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 space-y-3">
        <p className="flex items-center gap-1 text-sm font-medium">Como você compra
          <DicaTermo titulo="Como você compra">Diga o tamanho do pacote e o preço que você pagou. O sistema divide um pelo outro e acha o custo por unidade sozinho — você não precisa fazer conta.</DicaTermo>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ing-tam" className="flex items-center gap-1">Tamanho da embalagem
              <DicaTermo titulo="Tamanho da embalagem">Quanto vem no pacote. Escolha kg ou g do lado. Ex.: um pacote de <strong>1 kg</strong> → digite 1 e deixe em kg.</DicaTermo>
            </Label>
            <div className="flex gap-2">
              <Input id="ing-tam" inputMode="decimal" value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex.: 1" />
              {opcoes.length > 1 ? (
                <Select value={unidadeCompra} onValueChange={setUnidadeCompra}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{opcoes.map((o) => <SelectItem key={o.u} value={o.u}>{o.u}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span className="flex items-center px-2 text-sm text-muted-foreground">{unidadeCompra}</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ing-preco">Preço da embalagem (R$)</Label>
            <Input id="ing-preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Ex.: 40,00" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ex.: um pacote de <strong>1 kg</strong> por <strong>R$ 40,00</strong>. Na receita você usa em <strong>{unidade}</strong> (ex.: 100 {unidade}).
        </p>
        {custoUnit != null && (
          <p className="text-sm">
            Custo por {unidade}:{' '}
            <strong className="text-primary">
              R$ {custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </strong>
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="ing-min" className="flex items-center gap-1">
          Estoque mínimo (aviso de baixo)
          <DicaTermo titulo="Estoque mínimo">A quantidade mínima que você quer sempre ter. Quando o estoque cai abaixo disso, o item fica amarelo pra você lembrar de comprar. Deixe 0 se não quiser aviso.</DicaTermo>
        </Label>
        <Input id="ing-min" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="0 = sem aviso" />
        <p className="text-xs text-muted-foreground">Abaixo desse valor, o estoque aparece em amarelo. O estoque em si você ajusta pelo botão de caixa (📦) na lista.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ing-marca">Marca preferida</Label>
          <Select value={marcaId} onValueChange={setMarcaId}>
            <SelectTrigger id="ing-marca"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhuma">Nenhuma</SelectItem>
              {marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ing-forn">Fornecedor preferido</Label>
          <Select value={fornecedorId} onValueChange={setFornecedorId}>
            <SelectTrigger id="ing-forn"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Nenhum</SelectItem>
              {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Marca e fornecedor apenas já vêm preenchidos ao lançar uma compra — você pode trocar na hora.</p>
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

/** Preço médio por marca de um ingrediente, das compras já lançadas.
 *  "Rende mais" no sentido mensurável = mais barato por unidade. */
type PrecoMarca = { marca: string; precoUnit: number; compras: number }

/** Lançar compra (entrada) ou ajuste manual de estoque. Na compra, captura marca/fornecedor/preço. */
function MovimentacaoDialog({ ingrediente, marcas, fornecedores, onClose, onDone }: {
  ingrediente: Ingrediente | null
  marcas: Opcao[]
  fornecedores: Opcao[]
  onClose: () => void
  onDone: () => void
}) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState<'entrada' | 'ajuste'>('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [preco, setPreco] = useState('')
  const [marcaId, setMarcaId] = useState('nenhuma')
  const [fornecedorId, setFornecedorId] = useState('nenhum')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [comparativo, setComparativo] = useState<PrecoMarca[]>([])

  // Ao abrir: reseta o form e já sugere a marca/fornecedor preferidos do ingrediente.
  useEffect(() => {
    if (!ingrediente) return
    setTipo('entrada'); setQuantidade(''); setPreco(''); setObservacao('')
    setMarcaId(ingrediente.marca_id ?? 'nenhuma')
    setFornecedorId(ingrediente.fornecedor_id ?? 'nenhum')

    // Carrega o comparativo de preço por marca das compras anteriores.
    supabase
      .from('movimentacoes_estoque')
      .select('quantidade, preco_total, marca_id')
      .eq('ingrediente_id', ingrediente.id).eq('tipo', 'entrada')
      .not('preco_total', 'is', null)
      .then(({ data }) => {
        const acc = new Map<string, { total: number; qtd: number; n: number }>()
        for (const r of (data as { quantidade: number; preco_total: number; marca_id: string | null }[]) ?? []) {
          const q = Number(r.quantidade)
          if (!q) continue
          const chave = r.marca_id ?? 'sem'
          const a = acc.get(chave) ?? { total: 0, qtd: 0, n: 0 }
          a.total += Number(r.preco_total); a.qtd += q; a.n++
          acc.set(chave, a)
        }
        const nomeMarca = (id: string) => id === 'sem' ? 'Sem marca' : (marcas.find((m) => m.id === id)?.nome ?? 'Marca removida')
        setComparativo([...acc.entries()]
          .map(([id, a]) => ({ marca: nomeMarca(id), precoUnit: a.total / a.qtd, compras: a.n }))
          .sort((x, y) => x.precoUnit - y.precoUnit))
      })
  }, [ingrediente, marcas])

  async function salvar() {
    if (!user || !ingrediente) return
    const q = parseNum(quantidade)
    if (!Number.isFinite(q) || q === 0) return toast.error('Informe uma quantidade (use negativo no ajuste para reduzir).')
    if (tipo === 'entrada' && q < 0) return toast.error('Compra não pode ser negativa. Para reduzir, escolha Ajuste.')
    const p = parseNum(preco)
    setSalvando(true)
    const { error } = await supabase.from('movimentacoes_estoque').insert({
      user_id: user.id, ingrediente_id: ingrediente.id, tipo, quantidade: q,
      observacao: observacao.trim() || null,
      // marca/fornecedor/preço só fazem sentido numa compra.
      marca_id: tipo === 'entrada' && marcaId !== 'nenhuma' ? marcaId : null,
      fornecedor_id: tipo === 'entrada' && fornecedorId !== 'nenhum' ? fornecedorId : null,
      preco_total: tipo === 'entrada' && Number.isFinite(p) && p > 0 ? p : null,
    })
    setSalvando(false)
    if (error) return toast.error('Erro: ' + error.message)
    toast.success('Estoque atualizado!')
    onDone()
    onClose()
  }

  const q = parseNum(quantidade)
  const p = parseNum(preco)
  const precoUnitAgora = tipo === 'entrada' && Number.isFinite(q) && q > 0 && Number.isFinite(p) && p > 0 ? p / q : null

  return (
    <Dialog open={!!ingrediente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mov-qtd">Quantidade ({ingrediente?.unidade})</Label>
              <Input id="mov-qtd" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
                placeholder={tipo === 'ajuste' ? 'Ex.: -2' : 'Ex.: 10'} />
            </div>
            {tipo === 'entrada' && (
              <div className="space-y-2">
                <Label htmlFor="mov-preco">Preço total pago (R$)</Label>
                <Input id="mov-preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Opcional" />
              </div>
            )}
          </div>

          {tipo === 'entrada' && (
            <>
              {precoUnitAgora != null && (
                <p className="text-xs text-muted-foreground">
                  Dá <strong className="text-foreground">{formatBRL(precoUnitAgora)}</strong> por {ingrediente?.unidade}.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="mov-marca">Marca</Label>
                  <Select value={marcaId} onValueChange={setMarcaId}>
                    <SelectTrigger id="mov-marca"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Sem marca</SelectItem>
                      {marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mov-forn">Fornecedor</Label>
                  <Select value={fornecedorId} onValueChange={setFornecedorId}>
                    <SelectTrigger id="mov-forn"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Sem fornecedor</SelectItem>
                      {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="mov-obs">Observação</Label>
            <Input id="mov-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: promoção no atacado" />
          </div>

          {tipo === 'entrada' && comparativo.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium">Preço médio por marca (compras anteriores)</p>
              <ul className="space-y-1 text-sm">
                {comparativo.map((c, i) => (
                  <li key={c.marca} className="flex items-baseline justify-between gap-2">
                    <span className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                      {c.marca}{i === 0 && comparativo.length > 1 ? ' · mais barata' : ''}
                    </span>
                    <span className="tabular-nums">{formatBRL(c.precoUnit)}/{ingrediente?.unidade} <span className="text-xs text-muted-foreground">({c.compras}x)</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="animate-spin" />} Lançar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
