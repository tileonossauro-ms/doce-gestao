import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { usePlano } from '@/components/Pro'
import { formatBRL, parseNum } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Ingrediente = { id: string; nome: string; unidade: string; custo_unitario: number | null }
export type Receita = {
  id: string
  nome: string
  rendimento: number | null
  custo_direto: number
  pct_indireto: number
  pct_margem: number
  pct_taxas: number
  pct_custo_fixo: number
  preco_sugerido: number | null
  status: string
}

type Item = { ingrediente_id: string; quantidade: string }
type Resultado = {
  custo_direto: number
  custo_por_unidade: number
  preco_sugerido: number
  lucro_unidade: number
  custo_fixo_unidade: number
}

export default function ReceitaForm({
  ingredientes,
  receita,
  onSaved,
  onClose,
  modo,
}: {
  ingredientes: Ingrediente[]
  receita: Receita | null
  onSaved: () => void
  onClose: () => void
  modo: 'criar' | 'editar'
}) {
  const { user, perfil } = useAuth()
  const { isPro } = usePlano()
  const [nome, setNome] = useState(receita?.nome ?? '')
  const [rendimento, setRendimento] = useState(receita?.rendimento?.toString() ?? '')
  const [itens, setItens] = useState<Item[]>([])
  const [pct, setPct] = useState(() => ({
    indireto: String(receita?.pct_indireto ?? perfil?.pct_indireto_padrao ?? 10),
    margem: String(receita?.pct_margem ?? perfil?.pct_margem_padrao ?? 30),
    taxas: String(receita?.pct_taxas ?? perfil?.pct_taxas_padrao ?? 5),
    custoFixo: String(receita?.pct_custo_fixo ?? perfil?.pct_custo_fixo_padrao ?? 0),
  }))
  const [salvando, setSalvando] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  // Ao editar, carrega os ingredientes já cadastrados na receita.
  useEffect(() => {
    if (!receita) {
      setItens([{ ingrediente_id: '', quantidade: '' }])
      return
    }
    supabase
      .from('receita_ingredientes')
      .select('ingrediente_id, quantidade')
      .eq('receita_id', receita.id)
      .then(({ data }) => {
        const rows = (data ?? []).map((r) => ({
          ingrediente_id: r.ingrediente_id as string,
          quantidade: String(r.quantidade),
        }))
        setItens(rows.length ? rows : [{ ingrediente_id: '', quantidade: '' }])
      })
  }, [receita])

  function setItem(i: number, patch: Partial<Item>) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItens((prev) => [...prev, { ingrediente_id: '', quantidade: '' }])
  }
  function removeItem(i: number) {
    setItens((prev) => prev.filter((_, idx) => idx !== i))
  }

  const unidadeDe = (id: string) => ingredientes.find((g) => g.id === id)?.unidade ?? ''

  /** Persiste receita + itens. Retorna o id, ou null em caso de erro. */
  async function salvar(): Promise<string | null> {
    if (!user) return null
    if (!nome.trim()) {
      toast.error('Dê um nome para a receita.')
      return null
    }
    const rend = parseNum(rendimento)
    const payload = {
      user_id: user.id,
      nome: nome.trim(),
      rendimento: Number.isFinite(rend) ? rend : null,
      pct_indireto: parseNum(pct.indireto) || 0,
      pct_margem: parseNum(pct.margem) || 0,
      pct_taxas: parseNum(pct.taxas) || 0,
      pct_custo_fixo: parseNum(pct.custoFixo) || 0,
    }

    let receitaId = receita?.id ?? null
    if (receitaId) {
      const { error } = await supabase.from('receitas').update(payload).eq('id', receitaId)
      if (error) {
        toast.error('Erro ao salvar: ' + error.message)
        return null
      }
    } else {
      const { data, error } = await supabase.from('receitas').insert(payload).select('id').single()
      if (error || !data) {
        toast.error('Erro ao salvar: ' + (error?.message ?? ''))
        return null
      }
      receitaId = data.id
    }

    // Sincroniza os itens: apaga os antigos e insere os atuais válidos.
    await supabase.from('receita_ingredientes').delete().eq('receita_id', receitaId)
    const validos = itens
      .filter((it) => it.ingrediente_id && Number.isFinite(parseNum(it.quantidade)))
      .map((it) => ({
        user_id: user.id,
        receita_id: receitaId,
        ingrediente_id: it.ingrediente_id,
        quantidade: parseNum(it.quantidade),
      }))
    if (validos.length) {
      const { error } = await supabase.from('receita_ingredientes').insert(validos)
      if (error) {
        toast.error('Erro ao salvar ingredientes: ' + error.message)
        return null
      }
    }
    return receitaId
  }

  async function handleSalvar() {
    setSalvando(true)
    const id = await salvar()
    setSalvando(false)
    if (id) {
      toast.success(modo === 'criar' ? 'Receita criada!' : 'Receita salva!')
      onSaved()
      onClose()
    }
  }

  async function handleCalcular() {
    setCalculando(true)
    const id = await salvar()
    if (!id) {
      setCalculando(false)
      return
    }
    const { data, error } = await supabase.rpc('calcular_preco', { p_receita_id: id })
    setCalculando(false)
    if (error) {
      toast.error('Erro ao calcular: ' + error.message)
      return
    }
    if (!data?.ok) {
      setResultado(null)
      toast.error(data?.erro ?? 'Não foi possível calcular.')
    } else {
      setResultado({
        custo_direto: data.custo_direto,
        custo_por_unidade: data.custo_por_unidade,
        preco_sugerido: data.preco_sugerido,
        lucro_unidade: data.lucro_unidade,
        custo_fixo_unidade: data.custo_fixo_unidade ?? 0,
      })
      toast.success('Preço calculado!')
      onSaved()
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="rec-nome">Nome da receita</Label>
        <Input
          id="rec-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Brigadeiro Gourmet"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-rend">Rendimento (quantas unidades a receita faz)</Label>
        <Input
          id="rec-rend"
          inputMode="decimal"
          value={rendimento}
          onChange={(e) => setRendimento(e.target.value)}
          placeholder="Ex.: 30"
        />
      </div>

      {/* Ingredientes */}
      <div className="space-y-2">
        <Label>Ingredientes</Label>
        {ingredientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre ingredientes primeiro (menu Ingredientes) para montar a receita.
          </p>
        ) : (
          <div className="space-y-2">
            {itens.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={it.ingrediente_id}
                    onValueChange={(v) => setItem(i, { ingrediente_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientes.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nome} ({g.unidade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Input
                    inputMode="decimal"
                    value={it.quantidade}
                    onChange={(e) => setItem(i, { quantidade: e.target.value })}
                    placeholder={`Qtd${it.ingrediente_id ? ' (' + unidadeDe(it.ingrediente_id) + ')' : ''}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(i)}
                  aria-label="Remover ingrediente"
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus /> Adicionar ingrediente
            </Button>
          </div>
        )}
      </div>

      {/* Calculadora: percentuais */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calculator className="size-4" /> Calculadora de preço
        </div>
        <div className={`grid grid-cols-2 gap-3 ${isPro ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <div className="space-y-1">
            <Label htmlFor="pct-ind" className="text-xs">Custo indireto %</Label>
            <Input id="pct-ind" inputMode="decimal" value={pct.indireto}
              onChange={(e) => setPct({ ...pct, indireto: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pct-mar" className="text-xs">Margem %</Label>
            <Input id="pct-mar" inputMode="decimal" value={pct.margem}
              onChange={(e) => setPct({ ...pct, margem: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pct-tax" className="text-xs">Taxas %</Label>
            <Input id="pct-tax" inputMode="decimal" value={pct.taxas}
              onChange={(e) => setPct({ ...pct, taxas: e.target.value })} />
          </div>
          {isPro && (
            <div className="space-y-1">
              <Label htmlFor="pct-cf" className="text-xs">Custo fixo %</Label>
              <Input id="pct-cf" inputMode="decimal" value={pct.custoFixo}
                onChange={(e) => setPct({ ...pct, custoFixo: e.target.value })} />
            </div>
          )}
        </div>
        {isPro && (
          <p className="text-xs text-muted-foreground">
            Custo fixo % é a fatia do preço que ajuda a pagar aluguel, energia e as outras contas do mês.
            O padrão vem de Configurações e você pode mudar receita a receita.
          </p>
        )}
        <Button type="button" onClick={handleCalcular} disabled={calculando} className="w-full">
          {calculando ? <Loader2 className="animate-spin" /> : <Calculator />}
          Calcular preço
        </Button>

        {resultado && (() => {
          const indPct = parseNum(pct.indireto) || 0
          const marPct = parseNum(pct.margem) || 0
          const taxPct = parseNum(pct.taxas) || 0
          const cfPct = parseNum(pct.custoFixo) || 0
          const cu = resultado.custo_por_unidade
          const indR = Math.round(cu * indPct) / 100          // custo indireto por unidade (R$)
          const custoComInd = Math.round((cu + indR) * 100) / 100
          const taxR = Math.round(resultado.preco_sugerido * taxPct) / 100
          const Linha = ({ rotulo, valor, forte, cor }: { rotulo: string; valor: number; forte?: boolean; cor?: string }) => (
            <div className={`flex items-center justify-between ${forte ? 'font-semibold' : ''}`}>
              <span className={cor ?? 'text-muted-foreground'}>{rotulo}</span>
              <span className={`tabular-nums ${cor ?? ''}`}>{formatBRL(valor)}</span>
            </div>
          )
          return (
            <div className="rounded-md border bg-background p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Preço sugerido por unidade</p>
                <p className="text-3xl font-bold text-primary">{formatBRL(resultado.preco_sugerido)}</p>
              </div>

              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Como esse preço é formado:</p>
                <Linha rotulo="Ingredientes por unidade" valor={cu} />
                <Linha rotulo={`+ Custo indireto (${indPct}%)`} valor={indR} />
                <Linha rotulo="= Custo por unidade" valor={custoComInd} forte />
                <div className="my-1 border-t" />
                <Linha rotulo={`+ Margem / seu lucro (${marPct}%)`} valor={resultado.lucro_unidade} cor="text-green-700" />
                <Linha rotulo={`+ Taxas (${taxPct}%)`} valor={taxR} />
                {isPro && <Linha rotulo={`+ Custo fixo (${cfPct}%)`} valor={resultado.custo_fixo_unidade} />}
                <div className="my-1 border-t" />
                <Linha rotulo="= Preço de venda" valor={resultado.preco_sugerido} forte cor="text-primary" />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Custo total dos ingredientes da receita: {formatBRL(resultado.custo_direto)}
                {rendimento ? ` (rende ${rendimento} un)` : ''}. Margem, taxas e custo fixo são fatias do preço final de venda.
              </p>
            </div>
          )
        })()}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSalvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          {modo === 'criar' ? 'Criar receita' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
