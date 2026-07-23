import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wand2, Loader2, Check, TrendingUp, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, parseNum } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

type Receita = {
  id: string
  nome: string
  rendimento: number | null
  preco_sugerido: number | null
  pct_indireto: number
  pct_taxas: number
  pct_custo_fixo: number
}

type Linha = {
  r: Receita
  custoUnit: number | null      // custo por unidade com preços ATUAIS dos ingredientes
  incompleto: boolean           // algum ingrediente sem custo
  precoNovo: number | null
  variacao: number | null       // % vs preço atual
  invalido: string | null       // motivo de não conseguir precificar
}

export default function Precificacao() {
  const { perfil } = useAuth()
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [custoUnitPorReceita, setCustoUnit] = useState<Record<string, { custo: number; incompleto: boolean } | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [margem, setMargem] = useState('')
  const [previewMargem, setPreviewMargem] = useState<number | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [aplicando, setAplicando] = useState(false)

  // margem inicial = padrão do perfil
  useEffect(() => {
    if (perfil && margem === '') setMargem(String(perfil.pct_margem_padrao ?? 30))
  }, [perfil, margem])

  const carregar = useCallback(async () => {
    const [r, ri] = await Promise.all([
      supabase.from('receitas').select('id, nome, rendimento, preco_sugerido, pct_indireto, pct_taxas, pct_custo_fixo').order('nome'),
      supabase.from('receita_ingredientes').select('receita_id, quantidade, ingrediente:ingredientes(custo_unitario)'),
    ])
    setReceitas((r.data as Receita[]) ?? [])
    // custo direto atual por receita = soma(quantidade × custo_unitario atual)
    const mapa: Record<string, { custo: number; incompleto: boolean }> = {}
    for (const row of (ri.data as unknown as { receita_id: string; quantidade: number; ingrediente: { custo_unitario: number | null } | null }[]) ?? []) {
      const atual = mapa[row.receita_id] ?? { custo: 0, incompleto: false }
      const cu = row.ingrediente?.custo_unitario
      if (cu == null) atual.incompleto = true
      else atual.custo += Number(row.quantidade) * Number(cu)
      mapa[row.receita_id] = atual
    }
    setCustoUnit(mapa)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const linhas = useMemo<Linha[]>(() => {
    return receitas.map((r) => {
      const info = custoUnitPorReceita[r.id]
      const incompleto = info?.incompleto ?? false
      const custoDireto = info?.custo ?? 0
      const custoUnit = r.rendimento && r.rendimento > 0 ? custoDireto / r.rendimento : null
      let precoNovo: number | null = null
      let invalido: string | null = null
      if (previewMargem != null) {
        if (!r.rendimento || r.rendimento <= 0) invalido = 'Sem rendimento'
        else if (incompleto) invalido = 'Ingrediente sem custo'
        else {
          const denom = 1 - (previewMargem + r.pct_taxas + r.pct_custo_fixo) / 100
          if (denom <= 0) invalido = 'Margem + taxas + custo fixo ≥ 100%'
          else precoNovo = Math.round((custoUnit! * (1 + r.pct_indireto / 100) / denom) * 100) / 100
        }
      }
      const variacao =
        precoNovo != null && r.preco_sugerido && r.preco_sugerido > 0
          ? ((precoNovo - r.preco_sugerido) / r.preco_sugerido) * 100
          : null
      return { r, custoUnit, incompleto, precoNovo, variacao, invalido }
    })
  }, [receitas, custoUnitPorReceita, previewMargem])

  function otimizar() {
    const m = parseNum(margem)
    if (!Number.isFinite(m) || m < 0) return toast.error('Informe uma margem válida.')
    setPreviewMargem(m)
    // seleciona todas as que dá para precificar
    const validas = receitas.filter((r) => {
      const info = custoUnitPorReceita[r.id]
      return r.rendimento && r.rendimento > 0 && !(info?.incompleto) && (1 - (m + r.pct_taxas + r.pct_custo_fixo) / 100) > 0
    })
    setSelecionados(new Set(validas.map((r) => r.id)))
  }

  function toggleSel(id: string) {
    setSelecionados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function aplicar() {
    const m = previewMargem
    if (m == null) return
    const alvo = linhas.filter((l) => selecionados.has(l.r.id) && l.precoNovo != null)
    if (alvo.length === 0) return toast.error('Selecione ao menos uma receita válida.')
    setAplicando(true)
    let ok = 0
    for (const l of alvo) {
      const upd = await supabase.from('receitas').update({ pct_margem: m }).eq('id', l.r.id)
      if (upd.error) continue
      const { data } = await supabase.rpc('calcular_preco', { p_receita_id: l.r.id })
      if (data?.ok) ok++
    }
    setAplicando(false)
    toast.success(`${ok} preço(s) atualizado(s) com margem de ${m}%.`)
    setPreviewMargem(null)
    setSelecionados(new Set())
    carregar()
  }

  const nSelecionadas = linhas.filter((l) => selecionados.has(l.r.id) && l.precoNovo != null).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Precificação em massa</h1>
        <p className="text-sm text-muted-foreground">
          Atualiza o preço de várias receitas de uma vez, com os custos atuais dos ingredientes e a margem que você escolher.
          Você vê o antes e o depois e decide o que aplicar.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Escolha a margem de lucro</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="pm-margem">Margem de lucro (%)</Label>
            <Input id="pm-margem" inputMode="decimal" className="w-32" value={margem} onChange={(e) => setMargem(e.target.value)} />
          </div>
          <Button onClick={otimizar} disabled={loading}>
            <Wand2 /> Otimizar preços
          </Button>
          <p className="text-xs text-muted-foreground">Usa custo indireto, taxas e custo fixo já definidos em cada receita.</p>
        </CardContent>
      </Card>

      {previewMargem != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 p-3">
          <p className="text-sm">
            <strong>{nSelecionadas}</strong> receita(s) selecionada(s) para atualizar com margem de <strong>{previewMargem}%</strong>.
          </p>
          <Button onClick={aplicar} disabled={aplicando || nSelecionadas === 0}>
            {aplicando ? <Loader2 className="animate-spin" /> : <Check />} Aplicar preços selecionados
          </Button>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {previewMargem != null && <TableHead className="w-10"></TableHead>}
              <TableHead>Receita</TableHead>
              <TableHead className="text-right">Custo atual</TableHead>
              <TableHead className="text-right">Preço atual</TableHead>
              {previewMargem != null && <TableHead className="text-right">Preço novo</TableHead>}
              {previewMargem != null && <TableHead className="text-right">Variação</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : linhas.length === 0 ? (
              <TableRow><TableCell colSpan={6}><p className="py-10 text-center text-sm text-muted-foreground">Nenhuma receita cadastrada ainda.</p></TableCell></TableRow>
            ) : (
              linhas.map((l) => {
                const sel = selecionados.has(l.r.id)
                return (
                  <TableRow key={l.r.id} className={previewMargem != null && !l.precoNovo ? 'opacity-60' : ''}>
                    {previewMargem != null && (
                      <TableCell>
                        {l.precoNovo != null ? (
                          <input type="checkbox" checked={sel} onChange={() => toggleSel(l.r.id)} className="size-4 accent-[var(--primary)]" aria-label={`Selecionar ${l.r.nome}`} />
                        ) : null}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{l.r.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.custoUnit != null ? formatBRL(l.custoUnit) : '—'}
                      {l.incompleto && <AlertTriangle className="ml-1 inline size-3.5 text-amber-500" aria-label="Ingrediente sem custo" />}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.r.preco_sugerido != null ? formatBRL(l.r.preco_sugerido) : '—'}</TableCell>
                    {previewMargem != null && (
                      <TableCell className="text-right font-medium tabular-nums">
                        {l.precoNovo != null ? formatBRL(l.precoNovo) : <span className="text-xs text-muted-foreground">{l.invalido}</span>}
                      </TableCell>
                    )}
                    {previewMargem != null && (
                      <TableCell className="text-right tabular-nums">
                        {l.variacao != null ? (
                          <span className={l.variacao >= 0 ? 'text-green-700' : 'text-red-700'}>
                            {l.variacao >= 0 ? '▲' : '▼'} {Math.abs(l.variacao).toFixed(0)}%
                          </span>
                        ) : l.precoNovo != null ? <span className="text-xs text-muted-foreground">novo</span> : '—'}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {previewMargem == null && !loading && receitas.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="size-4" /> Defina a margem e clique em "Otimizar preços" para ver os preços sugeridos.
        </p>
      )}
    </div>
  )
}
