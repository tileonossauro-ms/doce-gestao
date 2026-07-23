import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type ItemVenda = { quantidade: number; preco_unitario: number; custo_unitario_snapshot: number | null }
type Venda = { id: string; pedido: { itens: ItemVenda[] } | null }
type Saida = {
  id: string
  valor: number
  descricao: string | null
  categoria: { nome: string; tipo: string; conta_no_dre: boolean } | null
}
type CustoFixo = { id: string; nome: string; valor_mensal: number; inicio: string; fim: string | null }

const mesAtual = () => new Date().toISOString().slice(0, 7)

/** Primeiro e último dia (ISO) do mês 'YYYY-MM'. */
function limitesDoMes(ym: string): { de: string; ate: string } {
  const [y, m] = ym.split('-').map(Number)
  const ultimo = new Date(y, m, 0).getDate()
  return { de: `${ym}-01`, ate: `${ym}-${String(ultimo).padStart(2, '0')}` }
}

export default function Dre() {
  const [mes, setMes] = useState(mesAtual())
  const [vendas, setVendas] = useState<Venda[]>([])
  const [saidas, setSaidas] = useState<Saida[]>([])
  const [fixos, setFixos] = useState<CustoFixo[]>([])
  const [loading, setLoading] = useState(true)

  const { de, ate } = useMemo(() => limitesDoMes(mes), [mes])

  const carregar = useCallback(async () => {
    setLoading(true)
    const [v, s, f] = await Promise.all([
      supabase
        .from('lancamentos')
        .select('id, pedido:pedidos(itens:pedido_itens(quantidade, preco_unitario, custo_unitario_snapshot))')
        .eq('tipo', 'entrada').not('pedido_id', 'is', null)
        .gte('data', de).lte('data', ate),
      supabase
        .from('lancamentos')
        .select('id, valor, descricao, categoria:categorias_financeiras(nome, tipo, conta_no_dre)')
        .eq('tipo', 'saida')
        .gte('data', de).lte('data', ate),
      supabase.from('custos_fixos').select('id, nome, valor_mensal, inicio, fim'),
    ])
    if (v.error || s.error || f.error) toast.error('Erro ao montar o DRE: ' + (v.error ?? s.error ?? f.error)?.message)
    setVendas((v.data as unknown as Venda[]) ?? [])
    setSaidas(((s.data as unknown as Saida[]) ?? []).map((x) => ({ ...x, valor: Number(x.valor) })))
    setFixos(((f.data as CustoFixo[]) ?? []).map((x) => ({ ...x, valor_mensal: Number(x.valor_mensal) })))
    setLoading(false)
  }, [de, ate])

  useEffect(() => {
    carregar()
  }, [carregar])

  const dre = useMemo(() => {
    let receita = 0
    let ingredientes = 0
    let semCusto = 0
    for (const v of vendas) {
      for (const i of v.pedido?.itens ?? []) {
        receita += i.quantidade * Number(i.preco_unitario)
        if (!Number(i.custo_unitario_snapshot)) semCusto++
        else ingredientes += i.quantidade * Number(i.custo_unitario_snapshot)
      }
    }

    // Saídas de categoria fixa não entram: o custo fixo já vem do cadastro (senão contaria 2x).
    // Saídas sem categoria entram como variáveis, para nenhum gasto sumir do DRE.
    const variaveisPorCategoria = new Map<string, number>()
    let jaNosFixos = 0
    let ignoradas = 0
    for (const s of saidas) {
      const cat = s.categoria
      if (cat && cat.conta_no_dre === false) { ignoradas += s.valor; continue }
      if (cat?.tipo === 'fixo') { jaNosFixos += s.valor; continue }
      const nome = cat?.nome ?? 'Sem categoria'
      variaveisPorCategoria.set(nome, (variaveisPorCategoria.get(nome) ?? 0) + s.valor)
    }
    const outrosVariaveis = [...variaveisPorCategoria.values()].reduce((a, b) => a + b, 0)

    const vigentes = fixos.filter((c) => c.inicio <= ate && (!c.fim || c.fim >= de))
    const totalFixos = vigentes.reduce((s, c) => s + c.valor_mensal, 0)

    const variaveis = ingredientes + outrosVariaveis
    const margemContribuicao = receita - variaveis
    const lucro = margemContribuicao - totalFixos
    return {
      receita, ingredientes, outrosVariaveis, variaveis, margemContribuicao,
      totalFixos, lucro,
      margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
      contribuicaoPct: receita > 0 ? (margemContribuicao / receita) * 100 : 0,
      porCategoria: [...variaveisPorCategoria.entries()].sort((a, b) => b[1] - a[1]),
      vigentes: vigentes.sort((a, b) => b.valor_mensal - a.valor_mensal),
      semCusto, jaNosFixos, ignoradas,
    }
  }, [vendas, saidas, fixos, de, ate])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="dre-mes">Mês</Label>
          <Input id="dre-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          O DRE mostra o caminho do dinheiro: do que entrou até o que realmente sobrou no bolso, depois de pagar ingredientes e as contas do mês.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Resultado do mês</CardTitle>
              <CardDescription>Só pedidos pagos entram como receita, na data em que o dinheiro entrou.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <LinhaDre titulo="Receita bruta (vendas pagas)" valor={dre.receita} destaque />
              <LinhaDre titulo="(−) Ingredientes das vendas" valor={-dre.ingredientes} recuo />
              <LinhaDre titulo="(−) Outros custos variáveis" valor={-dre.outrosVariaveis} recuo />
              <Separadora />
              <LinhaDre
                titulo="(=) Margem de contribuição"
                valor={dre.margemContribuicao}
                nota={dre.receita > 0 ? `${formatNum(dre.contribuicaoPct, 1)}% da receita` : undefined}
                destaque
              />
              <LinhaDre titulo="(−) Custos fixos do mês" valor={-dre.totalFixos} recuo />
              <Separadora />
              <LinhaDre
                titulo="(=) Lucro líquido"
                valor={dre.lucro}
                nota={dre.receita > 0 ? `margem líquida de ${formatNum(dre.margemPct, 1)}%` : undefined}
                destaque
                colorir
              />

              {dre.receita === 0 && (
                <p className="pt-3 text-sm text-muted-foreground">Nenhuma venda paga neste mês.</p>
              )}
              {dre.semCusto > 0 && (
                <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {dre.semCusto} item(ns) vendido(s) sem custo de receita registrado — entram como custo zero e deixam o lucro
                  parecer maior do que é.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custos variáveis</CardTitle>
                <CardDescription>Só existem quando há venda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <ItemLista nome="Ingredientes (pelas receitas vendidas)" valor={dre.ingredientes} />
                {dre.porCategoria.map(([nome, valor]) => <ItemLista key={nome} nome={nome} valor={valor} />)}
                {dre.variaveis === 0 && <p className="text-muted-foreground">Nenhum custo variável no mês.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custos fixos vigentes</CardTitle>
                <CardDescription>Vêm do cadastro em Cadastros › Custos fixos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {dre.vigentes.map((c) => <ItemLista key={c.id} nome={c.nome} valor={c.valor_mensal} />)}
                {dre.vigentes.length === 0 && (
                  <p className="text-muted-foreground">Nenhum custo fixo vigente neste mês. Cadastre aluguel, energia e afins para o lucro líquido ficar real.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!loading && (dre.jaNosFixos > 0 || dre.ignoradas > 0) && (
        <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            {dre.jaNosFixos > 0 && (
              <p>
                {formatBRL(dre.jaNosFixos)} em saídas de categoria fixa ficaram de fora: esse valor já está contado no cadastro
                de custos fixos, e somar os dois cobraria a mesma conta duas vezes.
              </p>
            )}
            {dre.ignoradas > 0 && (
              <p>
                {formatBRL(dre.ignoradas)} em compras de ingredientes ficaram de fora: o ingrediente já é cobrado pelo custo da
                receita a cada venda. Comprar estoque não é gasto do mês, é troca de dinheiro por ingrediente.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LinhaDre({ titulo, valor, nota, destaque, recuo, colorir }: {
  titulo: string; valor: number; nota?: string; destaque?: boolean; recuo?: boolean; colorir?: boolean
}) {
  const cor = colorir ? (valor >= 0 ? 'text-green-700' : 'text-red-600') : valor < 0 ? 'text-red-600' : ''
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${recuo ? 'pl-4' : ''}`}>
      <span className={destaque ? 'font-medium' : 'text-muted-foreground'}>
        {titulo}
        {nota && <span className="ml-2 text-xs text-muted-foreground">({nota})</span>}
      </span>
      <span className={`tabular-nums ${destaque ? 'text-lg font-bold' : ''} ${cor}`}>{formatBRL(valor)}</span>
    </div>
  )
}

function Separadora() {
  return <div className="my-1 border-t" />
}

function ItemLista({ nome, valor }: { nome: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{nome}</span>
      <span className="tabular-nums">{formatBRL(valor)}</span>
    </div>
  )
}
