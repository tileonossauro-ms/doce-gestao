import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/format'
import DicaTermo from '@/components/DicaTermo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type ItemVenda = { quantidade: number; custo_unitario_snapshot: number | null }
type Entrada = { valor: number; pedido_id: string | null; pedido: { itens: ItemVenda[] } | null }
type Categoria = { nome: string; grupo_dre: string | null; conta_no_dre: boolean }
type Saida = { valor: number; categoria: Categoria | null }
type CustoFixo = { valor_mensal: number; inicio: string; fim: string | null; categoria: { nome: string } | null }

const mesAtual = () => new Date().toISOString().slice(0, 7)

/** Primeiro e último dia (ISO) do mês 'YYYY-MM'. */
function limitesDoMes(ym: string): { de: string; ate: string } {
  const [y, m] = ym.split('-').map(Number)
  const ultimo = new Date(y, m, 0).getDate()
  return { de: `${ym}-01`, ate: `${ym}-${String(ultimo).padStart(2, '0')}` }
}

/** Soma valores agrupando por nome, ordenado do maior para o menor. */
function agrupar(itens: { nome: string; valor: number }[]) {
  const m = new Map<string, number>()
  for (const i of itens) m.set(i.nome, (m.get(i.nome) ?? 0) + i.valor)
  return [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)
}

export default function Dre() {
  const [mes, setMes] = useState(mesAtual())
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [saidas, setSaidas] = useState<Saida[]>([])
  const [fixos, setFixos] = useState<CustoFixo[]>([])
  const [loading, setLoading] = useState(true)

  const { de, ate } = useMemo(() => limitesDoMes(mes), [mes])

  const carregar = useCallback(async () => {
    setLoading(true)
    const [e, s, f] = await Promise.all([
      supabase
        .from('lancamentos')
        .select('valor, pedido_id, pedido:pedidos(itens:pedido_itens(quantidade, custo_unitario_snapshot))')
        .eq('tipo', 'entrada').gte('data', de).lte('data', ate),
      supabase
        .from('lancamentos')
        .select('valor, categoria:categorias_financeiras(nome, grupo_dre, conta_no_dre)')
        .eq('tipo', 'saida').gte('data', de).lte('data', ate),
      supabase.from('custos_fixos').select('valor_mensal, inicio, fim, categoria:categorias_financeiras(nome)'),
    ])
    if (e.error || s.error || f.error) toast.error('Erro ao montar o DRE: ' + (e.error ?? s.error ?? f.error)?.message)
    setEntradas(((e.data as unknown as Entrada[]) ?? []).map((x) => ({ ...x, valor: Number(x.valor) })))
    setSaidas(((s.data as unknown as Saida[]) ?? []).map((x) => ({ ...x, valor: Number(x.valor) })))
    setFixos(((f.data as unknown as CustoFixo[]) ?? []).map((x) => ({ ...x, valor_mensal: Number(x.valor_mensal) })))
    setLoading(false)
  }, [de, ate])

  useEffect(() => {
    carregar()
  }, [carregar])

  const dre = useMemo(() => {
    // 1) Receita
    let recEncomendas = 0, recAvulsas = 0, custoIngredientes = 0, semCusto = 0
    for (const e of entradas) {
      if (e.pedido_id) {
        recEncomendas += e.valor
        for (const i of e.pedido?.itens ?? []) {
          if (!Number(i.custo_unitario_snapshot)) semCusto++
          else custoIngredientes += i.quantidade * Number(i.custo_unitario_snapshot)
        }
      } else {
        recAvulsas += e.valor
      }
    }
    const receitaBruta = recEncomendas + recAvulsas

    // 2) Saídas por grupo do DRE
    const deducoesItens: { nome: string; valor: number }[] = []
    const variaveisItens: { nome: string; valor: number }[] = []
    let saidasFixasIgnoradas = 0        // fixo lançado como saída: já vem do cadastro
    let comprasIngredienteIgnoradas = 0 // já entra pelo custo da receita
    let investimentos = 0
    for (const s of saidas) {
      const g = s.categoria?.grupo_dre ?? null
      const nome = s.categoria?.nome ?? 'Sem categoria'
      if (s.categoria?.conta_no_dre === false) { comprasIngredienteIgnoradas += s.valor; continue }
      if (g === 'deducao') deducoesItens.push({ nome, valor: s.valor })
      else if (g === 'custo_fixo') saidasFixasIgnoradas += s.valor
      else if (g === 'investimento') investimentos += s.valor
      else variaveisItens.push({ nome, valor: s.valor }) // custo_variavel, sem categoria ou grupo nulo
    }
    const deducoes = deducoesItens.reduce((a, b) => a + b.valor, 0)
    const variaveisManuais = variaveisItens.reduce((a, b) => a + b.valor, 0)

    // 3) Custos fixos vigentes (do cadastro), agrupados por categoria
    const vigentes = fixos.filter((c) => c.inicio <= ate && (!c.fim || c.fim >= de))
    const fixosItens = agrupar(vigentes.map((c) => ({ nome: c.categoria?.nome ?? 'Sem categoria', valor: c.valor_mensal })))
    const totalFixos = vigentes.reduce((s, c) => s + c.valor_mensal, 0)

    const receitaLiquida = receitaBruta - deducoes
    const custosVariaveis = custoIngredientes + variaveisManuais
    const custosTotais = custosVariaveis + totalFixos
    const lucroOperacional = receitaLiquida - custosTotais
    const lucroLiquido = lucroOperacional - investimentos

    return {
      recEncomendas, recAvulsas, receitaBruta,
      deducoesItens: agrupar(deducoesItens), deducoes, receitaLiquida,
      custoIngredientes, variaveisItens: agrupar(variaveisItens), custosVariaveis,
      fixosItens, totalFixos, custosTotais,
      lucroOperacional, investimentos, lucroLiquido,
      pct: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
      semCusto, saidasFixasIgnoradas, comprasIngredienteIgnoradas,
    }
  }, [entradas, saidas, fixos, de, ate])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="dre-mes">Mês</Label>
          <Input id="dre-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Do que entrou até o que sobrou no bolso: receita, menos o que o cartão/app/imposto abate, menos ingredientes e contas do mês.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-[32rem]" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado de {mes.split('-').reverse().join('/')}</CardTitle>
            <CardDescription>Baseado no que entrou e saiu no mês. Custos fixos vêm do cadastro em Cadastros › Custos fixos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* 1. RECEITA */}
            <Secao titulo="1. Receita" />
            <Item nome="Vendas por encomenda (pedidos pagos)" valor={dre.recEncomendas} recuo />
            <Item nome="Vendas de balcão / avulsas" valor={dre.recAvulsas} recuo />
            <Total titulo={<>(=) Receita bruta <DicaTermo titulo="Receita bruta">Tudo que você vendeu no mês, sem tirar nada ainda: encomendas pagas + vendas de balcão.</DicaTermo></>} valor={dre.receitaBruta} />

            {/* 2. DEDUÇÕES */}
            <Secao titulo={<>2. Deduções da receita <DicaTermo titulo="Deduções">O que sai da venda antes de virar dinheiro seu: taxa do cartão/app, impostos e descontos dados ao cliente.</DicaTermo></>} />
            {dre.deducoesItens.length === 0
              ? <p className="py-1 pl-4 text-sm text-muted-foreground">Nenhuma dedução lançada no mês.</p>
              : dre.deducoesItens.map((d) => <Item key={d.nome} nome={d.nome} valor={-d.valor} recuo />)}
            <Total titulo={<>(=) Receita líquida <DicaTermo titulo="Receita líquida">O que realmente entrou no caixa depois de tirar as deduções (cartão, app, impostos). É a base pra calcular o lucro.</DicaTermo></>} valor={dre.receitaLiquida} />

            {/* 3. CUSTOS VARIÁVEIS */}
            <Secao titulo={<>3. Custos variáveis (produção) <DicaTermo titulo="Custos variáveis">Gastos que só existem quando você vende: ingredientes, embalagem, frete, gás. Vendeu mais, gastou mais.</DicaTermo></>} />
            <Item nome="Ingredientes das receitas vendidas" valor={-dre.custoIngredientes} recuo />
            {dre.variaveisItens.map((v) => <Item key={v.nome} nome={v.nome} valor={-v.valor} recuo />)}
            <Total titulo="(=) Subtotal de custos variáveis" valor={-dre.custosVariaveis} sub />

            {/* 4. CUSTOS FIXOS */}
            <Secao titulo={<>4. Custos fixos (estrutura) <DicaTermo titulo="Custos fixos">Contas que você paga todo mês mesmo sem vender: aluguel, luz, internet. Vêm do cadastro de Custos fixos.</DicaTermo></>} />
            {dre.fixosItens.length === 0
              ? <p className="py-1 pl-4 text-sm text-muted-foreground">Nenhum custo fixo vigente. Cadastre em Cadastros › Custos fixos.</p>
              : dre.fixosItens.map((c) => <Item key={c.nome} nome={c.nome} valor={-c.valor} recuo />)}
            <Total titulo="(=) Subtotal de custos fixos" valor={-dre.totalFixos} sub />

            {/* 5. RESULTADO */}
            <Secao titulo="5. Resultado" />
            <Item nome="Custos totais (variáveis + fixos)" valor={-dre.custosTotais} recuo />
            <Total titulo={<>(=) Lucro operacional <DicaTermo titulo="Lucro operacional">O que sobrou depois de pagar ingredientes e as contas do mês, mas antes de descontar investimentos (compra de equipamentos).</DicaTermo></>} valor={dre.lucroOperacional} />
            {dre.investimentos > 0 && <Item nome="(−) Investimentos em equipamentos" valor={-dre.investimentos} recuo />}
            <Total titulo={<>(=) Lucro líquido do mês <DicaTermo titulo="Lucro líquido">É o que realmente sobrou pra você no fim do mês, depois de TUDO: ingredientes, contas fixas e investimentos. O número que importa.</DicaTermo></>} valor={dre.lucroLiquido}
              nota={dre.receitaBruta > 0 ? `margem líquida de ${formatNum(dre.pct, 1)}%` : undefined} colorir />

            {dre.receitaBruta === 0 && <p className="pt-3 text-sm text-muted-foreground">Nenhuma receita neste mês.</p>}

            {dre.semCusto > 0 && (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {dre.semCusto} item(ns) vendido(s) sem custo de receita registrado — entram como custo zero e deixam o lucro
                parecer maior do que é.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && (dre.saidasFixasIgnoradas > 0 || dre.comprasIngredienteIgnoradas > 0) && (
        <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            {dre.saidasFixasIgnoradas > 0 && (
              <p>
                {formatBRL(dre.saidasFixasIgnoradas)} em saídas de categoria fixa ficaram de fora: os custos fixos vêm do
                cadastro, e somar os dois cobraria a mesma conta duas vezes.
              </p>
            )}
            {dre.comprasIngredienteIgnoradas > 0 && (
              <p>
                {formatBRL(dre.comprasIngredienteIgnoradas)} em compras de ingredientes ficaram de fora: o ingrediente já é
                cobrado pelo custo da receita a cada venda.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Secao({ titulo }: { titulo: React.ReactNode }) {
  return <p className="mt-3 flex items-center gap-1 border-b pb-1 text-sm font-semibold text-muted-foreground first:mt-0">{titulo}</p>
}

function Item({ nome, valor, recuo }: { nome: string; valor: number; recuo?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-0.5 text-sm ${recuo ? 'pl-4' : ''}`}>
      <span className="text-muted-foreground">{nome}</span>
      <span className={`tabular-nums ${valor < 0 ? 'text-red-600' : ''}`}>{formatBRL(valor)}</span>
    </div>
  )
}

function Total({ titulo, valor, nota, sub, colorir }: {
  titulo: React.ReactNode; valor: number; nota?: string; sub?: boolean; colorir?: boolean
}) {
  const cor = colorir ? (valor >= 0 ? 'text-green-700' : 'text-red-600') : valor < 0 ? 'text-red-600' : ''
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${sub ? '' : 'border-t'}`}>
      <span className="font-medium">
        {titulo}
        {nota && <span className="ml-2 text-xs text-muted-foreground">({nota})</span>}
      </span>
      <span className={`tabular-nums font-bold ${sub ? '' : 'text-lg'} ${cor}`}>{formatBRL(valor)}</span>
    </div>
  )
}
