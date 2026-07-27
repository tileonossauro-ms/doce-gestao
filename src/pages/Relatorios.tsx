import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AvisoPro, usePlano } from '@/components/Pro'
import { formatBRL, formatData, formatNum } from '@/lib/format'
import DicaTermo from '@/components/DicaTermo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/** Uma venda = pedido confirmado, datada pelo lançamento de entrada (regra 7 do CLAUDE.md).
 *  O custo vem sempre do snapshot gravado na baixa, nunca do custo atual do ingrediente (regra 6). */
type ItemVenda = {
  quantidade: number
  preco_unitario: number
  custo_unitario_snapshot: number | null
  receita: { id: string; nome: string } | null
}
type Venda = {
  id: string
  data: string
  pedido: {
    cliente_id: string | null
    cliente: { nome: string } | null
    itens: ItemVenda[]
  } | null
}
type Cliente = { id: string; nome: string }
type Ingrediente = { id: string; nome: string; unidade: string; estoque_atual: number; estoque_minimo: number }
type Receita = {
  id: string
  nome: string
  rendimento: number | null
  ingredientes: { ingrediente_id: string; quantidade: number }[]
}

const hoje = () => new Date().toISOString().slice(0, 10)
function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function diffDias(aISO: string, bISO: string): number {
  const a = new Date(aISO + 'T00:00:00Z').getTime()
  const b = new Date(bISO + 'T00:00:00Z').getTime()
  return Math.round((a - b) / 86_400_000)
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DIAS_SUMIDO = 30
const COBERTURA_DIAS = 30 // para quantos dias a sugestão de compra deve dar

export default function Relatorios() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')
  const [de, setDe] = useState(diasAtras(29))
  const [ate, setAte] = useState(hoje())

  const { perfil } = useAuth()
  const { isPro } = usePlano()
  const janela = perfil?.janela_analise_dias ?? 60

  const carregar = useCallback(async () => {
    // Carrega o histórico inteiro e filtra no cliente: o volume de um confeiteiro é pequeno
    // e a mesma lista serve ao filtro de período e à janela de análise.
    const [v, c, g, r] = await Promise.all([
      supabase
        .from('lancamentos')
        .select('id, data, pedido:pedidos(cliente_id, cliente:clientes(nome), itens:pedido_itens(quantidade, preco_unitario, custo_unitario_snapshot, receita:receitas(id, nome)))')
        .eq('tipo', 'entrada')
        .not('pedido_id', 'is', null)
        .order('data', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('ingredientes').select('id, nome, unidade, estoque_atual, estoque_minimo').order('nome'),
      supabase.from('receitas').select('id, nome, rendimento, ingredientes:receita_ingredientes(ingrediente_id, quantidade)'),
    ])
    if (v.error) toast.error('Erro ao carregar relatórios: ' + v.error.message)
    setVendas((v.data as unknown as Venda[]) ?? [])
    setClientes((c.data as Cliente[]) ?? [])
    setIngredientes(((g.data as Ingrediente[]) ?? []).map((x) => ({
      ...x, estoque_atual: Number(x.estoque_atual), estoque_minimo: Number(x.estoque_minimo),
    })))
    setReceitas((r.data as unknown as Receita[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Intervalo do filtro (inclusivo nas duas pontas).
  const intervalo = useMemo(() => {
    if (periodo === 'custom') return { de, ate }
    const n = Number(periodo)
    return { de: diasAtras(n - 1), ate: hoje() }
  }, [periodo, de, ate])

  const noPeriodo = useMemo(
    () => vendas.filter((v) => v.data >= intervalo.de && v.data <= intervalo.ate),
    [vendas, intervalo],
  )
  const naJanela = useMemo(() => {
    const inicio = diasAtras(janela - 1)
    return vendas.filter((v) => v.data >= inicio)
  }, [vendas, janela])

  // (1) Resumo do período
  const resumo = useMemo(() => {
    let faturamento = 0
    let custo = 0
    let semSnapshot = 0
    for (const v of noPeriodo) {
      for (const i of v.pedido?.itens ?? []) {
        faturamento += i.quantidade * Number(i.preco_unitario)
        // Sem custo (nulo ou zero) = receita sem ingredientes precificados: entra como 0 e infla a margem.
        if (!Number(i.custo_unitario_snapshot)) semSnapshot++
        else custo += i.quantidade * Number(i.custo_unitario_snapshot)
      }
    }
    const cli = new Set(noPeriodo.map((v) => v.pedido?.cliente_id).filter(Boolean))
    const margem = faturamento - custo
    return {
      faturamento,
      custo,
      margem,
      margemPct: faturamento > 0 ? (margem / faturamento) * 100 : 0,
      pedidos: noPeriodo.length,
      clientes: cli.size,
      ticket: noPeriodo.length > 0 ? faturamento / noPeriodo.length : 0,
      semSnapshot,
    }
  }, [noPeriodo])

  // (2) e (3) Por produto: quantidade, faturamento, custo e margem
  const porProduto = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number; faturamento: number; custo: number }>()
    for (const v of noPeriodo) {
      for (const i of v.pedido?.itens ?? []) {
        const id = i.receita?.id ?? 'sem-receita'
        const linha = mapa.get(id) ?? { nome: i.receita?.nome ?? 'Receita excluída', qtd: 0, faturamento: 0, custo: 0 }
        linha.qtd += i.quantidade
        linha.faturamento += i.quantidade * Number(i.preco_unitario)
        linha.custo += i.quantidade * Number(i.custo_unitario_snapshot ?? 0)
        mapa.set(id, linha)
      }
    }
    return [...mapa.entries()]
      .map(([id, l]) => ({ id, ...l, margem: l.faturamento - l.custo, margemPct: l.faturamento > 0 ? ((l.faturamento - l.custo) / l.faturamento) * 100 : 0 }))
      .sort((a, b) => b.qtd - a.qtd)
  }, [noPeriodo])

  // (4) Sugestão de compra: consumo derivado das vendas da janela (funciona mesmo para
  // pedidos pagos antes da Fase 9, que não geraram movimentação de estoque).
  const sugestaoEstoque = useMemo(() => {
    const receitaPorId = new Map(receitas.map((r) => [r.id, r]))
    const consumo = new Map<string, number>()
    for (const v of naJanela) {
      for (const i of v.pedido?.itens ?? []) {
        const r = i.receita ? receitaPorId.get(i.receita.id) : undefined
        if (!r?.rendimento) continue
        for (const ri of r.ingredientes ?? []) {
          consumo.set(ri.ingrediente_id, (consumo.get(ri.ingrediente_id) ?? 0) + (Number(ri.quantidade) / r.rendimento) * i.quantidade)
        }
      }
    }
    return ingredientes
      .map((g) => {
        const total = consumo.get(g.id) ?? 0
        const porDia = total / janela
        const comprar = Math.max(0, porDia * COBERTURA_DIAS + g.estoque_minimo - g.estoque_atual)
        return { ...g, total, porDia, comprar }
      })
      .filter((g) => g.comprar > 0 || g.estoque_atual < 0)
      .sort((a, b) => b.comprar - a.comprar)
  }, [naJanela, receitas, ingredientes, janela])

  // (5) Sugestão de produção: média vendida por semana dentro da janela
  const sugestaoProducao = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number }>()
    for (const v of naJanela) {
      for (const i of v.pedido?.itens ?? []) {
        if (!i.receita) continue
        const linha = mapa.get(i.receita.id) ?? { nome: i.receita.nome, qtd: 0 }
        linha.qtd += i.quantidade
        mapa.set(i.receita.id, linha)
      }
    }
    const semanas = janela / 7
    return [...mapa.entries()]
      .map(([id, l]) => ({ id, ...l, porSemana: l.qtd / semanas }))
      .sort((a, b) => b.porSemana - a.porSemana)
  }, [naJanela, janela])

  // (6) Melhores clientes do período
  const melhoresClientes = useMemo(() => {
    const mapa = new Map<string, { nome: string; pedidos: number; total: number }>()
    for (const v of noPeriodo) {
      const id = v.pedido?.cliente_id
      if (!id) continue
      const linha = mapa.get(id) ?? { nome: v.pedido?.cliente?.nome ?? 'Cliente removido', pedidos: 0, total: 0 }
      linha.pedidos++
      linha.total += (v.pedido?.itens ?? []).reduce((s, i) => s + i.quantidade * Number(i.preco_unitario), 0)
      mapa.set(id, linha)
    }
    return [...mapa.entries()]
      .map(([id, l]) => ({ id, ...l, ticket: l.pedidos > 0 ? l.total / l.pedidos : 0 }))
      .sort((a, b) => b.total - a.total)
  }, [noPeriodo])

  // (7) Clientes sumidos: usa TODO o histórico, não o filtro de período (senão "sumido" não faz sentido)
  const sumidos = useMemo(() => {
    const ultima = new Map<string, string>()
    for (const v of vendas) {
      const id = v.pedido?.cliente_id
      if (!id) continue
      const atual = ultima.get(id)
      if (!atual || v.data > atual) ultima.set(id, v.data)
    }
    return clientes
      .map((c) => {
        const u = ultima.get(c.id) ?? null
        return { ...c, ultima: u, dias: u ? diffDias(hoje(), u) : null }
      })
      .filter((c) => c.dias == null || c.dias >= DIAS_SUMIDO)
      .sort((a, b) => (b.dias ?? Infinity) - (a.dias ?? Infinity))
  }, [vendas, clientes])

  // (8) Vendas por dia da semana (no período)
  const porDiaSemana = useMemo(() => {
    const base = DIAS_SEMANA.map((dia) => ({ dia, faturamento: 0, pedidos: 0 }))
    for (const v of noPeriodo) {
      const idx = new Date(v.data + 'T00:00:00').getDay()
      base[idx].faturamento += (v.pedido?.itens ?? []).reduce((s, i) => s + i.quantidade * Number(i.preco_unitario), 0)
      base[idx].pedidos++
    }
    return base.map((b) => ({ ...b, faturamento: Math.round(b.faturamento * 100) / 100 }))
  }, [noPeriodo])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Considera apenas pedidos já pagos, na data em que o dinheiro entrou. Vendas avulsas lançadas direto no Financeiro não aparecem aqui.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Escolher datas</SelectItem>
            </SelectContent>
          </Select>
          {periodo === 'custom' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="rel-de" className="text-xs">De</Label>
                <Input id="rel-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rel-ate" className="text-xs">Até</Label>
                <Input id="rel-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-40" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* (1) Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero destaque titulo="Faturamento" valor={formatBRL(resumo.faturamento)} nota={`${resumo.pedidos} pedido(s) pago(s)`} />
        <Numero titulo={<>Custo dos ingredientes <DicaTermo titulo="Custo dos ingredientes">Quanto os ingredientes das receitas vendidas custaram — travado no preço da época da venda, não no preço de hoje.</DicaTermo></>} valor={formatBRL(resumo.custo)} nota="Custo travado na data da venda" />
        <Numero
          titulo={<>Margem (lucro bruto) <DicaTermo titulo="Margem (lucro bruto)">O que sobra da venda depois de tirar só o custo dos ingredientes. Ainda não desconta as contas do mês (isso é o lucro líquido, no DRE).</DicaTermo></>}
          valor={formatBRL(resumo.margem)}
          nota={`${formatNum(resumo.margemPct, 1)}% do faturamento`}
          cor={resumo.margem < 0 ? 'text-red-600' : 'text-green-700'}
        />
        <Numero titulo="Clientes atendidos" valor={String(resumo.clientes)} nota={`Ticket médio ${formatBRL(resumo.ticket)}`} />
      </div>

      {resumo.semSnapshot > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {resumo.semSnapshot} item(ns) vendido(s) estão sem custo registrado (receita sem ingredientes ou sem preço).
          Eles entram como custo zero, então a margem acima está mais alta do que a real.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* (2) Produtos mais vendidos */}
        <Bloco titulo="Produtos mais vendidos" descricao="No período escolhido.">
          <Tabela
            cabecalho={['Produto', 'Qtd', 'Faturamento', '% do total']}
            vazio="Nenhuma venda no período."
            linhas={porProduto.map((p) => [
              p.nome,
              formatNum(p.qtd, 0),
              formatBRL(p.faturamento),
              resumo.faturamento > 0 ? `${formatNum((p.faturamento / resumo.faturamento) * 100, 1)}%` : '—',
            ])}
          />
        </Bloco>

        {/* (3) Margem por produto */}
        <Bloco titulo="Margem por produto" descricao="Faturamento menos o custo dos ingredientes da época da venda.">
          <Tabela
            cabecalho={['Produto', 'Faturamento', 'Custo', 'Margem']}
            vazio="Nenhuma venda no período."
            linhas={porProduto.map((p) => [
              p.nome,
              formatBRL(p.faturamento),
              // Custo zero significa receita sem ingredientes/custo — a margem "100%" seria mentira.
              p.custo > 0 ? formatBRL(p.custo) : (
                <Badge key={p.id + '-sc'} variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">sem custo</Badge>
              ),
              <span key={p.id} className={p.margem < 0 ? 'text-red-600' : ''}>
                {p.custo > 0 ? <>{formatBRL(p.margem)} <span className="text-muted-foreground">({formatNum(p.margemPct, 1)}%)</span></> : '—'}
              </span>,
            ])}
          />
        </Bloco>

        {/* (6) Melhores clientes */}
        <Bloco titulo="Melhores clientes" descricao="Quem mais gastou no período.">
          <Tabela
            cabecalho={['Cliente', 'Pedidos', 'Total', 'Ticket médio']}
            vazio="Nenhuma venda no período."
            linhas={melhoresClientes.map((c) => [c.nome, String(c.pedidos), formatBRL(c.total), formatBRL(c.ticket)])}
          />
        </Bloco>

        {/* (7) Clientes sumidos — Pró */}
        {isPro ? (
          <Bloco titulo={`Clientes sumidos (${DIAS_SUMIDO}+ dias)`} descricao="Olha todo o histórico, não só o período. Boa lista para uma mensagem de retomada.">
            <Tabela
              cabecalho={['Cliente', 'Última compra', 'Dias sem comprar']}
              vazio="Nenhum cliente sumido. 🎉"
              linhas={sumidos.map((c) => [
                c.nome,
                c.ultima ? formatData(c.ultima) : <Badge key={c.id} variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">nunca comprou</Badge>,
                c.dias == null ? '—' : formatNum(c.dias, 0),
              ])}
            />
          </Bloco>
        ) : (
          <AvisoPro recurso="Clientes sumidos" />
        )}
      </div>

      {/* (8) Vendas por dia da semana — Pró */}
      {isPro ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por dia da semana</CardTitle>
            <CardDescription>Em que dias o dinheiro entra — útil para escolher o dia de produzir e o de entregar.</CardDescription>
          </CardHeader>
          <CardContent>
            {resumo.pedidos === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porDiaSemana}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis fontSize={12} width={50} />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} />
                  <Bar dataKey="faturamento" name="Faturamento" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ) : (
        <AvisoPro recurso="Vendas por dia da semana" />
      )}

      {/* (4) e (5) Sugestões — Pró */}
      {isPro ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Bloco
            titulo="Sugestão de compra de ingredientes"
            descricao={`Baseado no consumo dos últimos ${janela} dias (muda em Configurações), para cobrir os próximos ${COBERTURA_DIAS} dias.`}
          >
            <Tabela
              cabecalho={['Ingrediente', 'Uso por dia', 'Estoque hoje', 'Comprar']}
              vazio="Sem consumo suficiente para sugerir compras ainda."
              linhas={sugestaoEstoque.map((g) => [
                g.nome,
                `${formatNum(g.porDia, 3)} ${g.unidade}`,
                <span key={g.id} className={g.estoque_atual < 0 ? 'text-red-600' : ''}>{formatNum(g.estoque_atual)} {g.unidade}</span>,
                <strong key={g.id + '-c'}>{formatNum(g.comprar)} {g.unidade}</strong>,
              ])}
            />
          </Bloco>

          <Bloco
            titulo="Sugestão de produção por semana"
            descricao={`Média vendida por semana nos últimos ${janela} dias.`}
          >
            <Tabela
              cabecalho={['Produto', `Vendidos em ${janela} dias`, 'Produzir por semana']}
              vazio="Sem vendas suficientes para sugerir produção ainda."
              linhas={sugestaoProducao.map((p) => [
                p.nome,
                formatNum(p.qtd, 0),
                <strong key={p.id}>{formatNum(Math.ceil(p.porSemana), 0)}</strong>,
              ])}
            />
          </Bloco>
        </div>
      ) : (
        <AvisoPro recurso="Sugestões de compra e produção" />
      )}
    </div>
  )
}

function Numero({ titulo, valor, nota, cor, destaque }: {
  titulo: React.ReactNode; valor: string; nota?: string; cor?: string; destaque?: boolean
}) {
  return (
    <Card className={destaque ? 'border-primary/30 bg-primary/5' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-bold ${destaque ? 'text-3xl' : 'text-2xl'} ${cor ?? ''}`}>{valor}</p>
        {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  )
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** Tabela simples e sem ações: a primeira coluna é texto, as demais alinhadas à direita. */
function Tabela({ cabecalho, linhas, vazio }: {
  cabecalho: string[]; linhas: React.ReactNode[][]; vazio: string
}) {
  if (linhas.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{vazio}</p>
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {cabecalho.map((c, i) => (
              <TableHead key={c} className={i === 0 ? undefined : 'text-right'}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha, i) => (
            <TableRow key={i}>
              {linha.map((celula, j) => (
                <TableCell key={j} className={j === 0 ? 'font-medium' : 'text-right tabular-nums'}>{celula}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
