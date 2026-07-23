import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DollarSign, TrendingUp, ClipboardList, Receipt, AlertTriangle, Cake, Truck,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatBRL, formatData } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Lancamento = { id: string; tipo: string; descricao: string | null; valor: number; data: string }
type Pedido = {
  id: string; status: string; data_entrega: string | null; flag_revisao: boolean
  cliente: { nome: string } | null; receita: { nome: string } | null
}
type Cliente = { id: string; nome: string; telefone: string | null; aniversario: string | null }

const hoje = () => new Date().toISOString().slice(0, 10)
function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function diasAFrente(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function diffDias(aISO: string, bISO: string): number {
  const a = new Date(aISO + 'T00:00:00Z').getTime()
  const b = new Date(bISO + 'T00:00:00Z').getTime()
  return Math.floor((a - b) / 86_400_000)
}

export default function Painel() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')

  const carregar = useCallback(async () => {
    const [l, p, c] = await Promise.all([
      supabase.from('lancamentos').select('*').order('data', { ascending: false }),
      supabase.from('pedidos').select('id, status, data_entrega, flag_revisao, cliente:clientes(nome), receita:receitas(nome)'),
      supabase.from('clientes').select('id, nome, telefone, aniversario'),
    ])
    if (l.error) toast.error('Erro ao carregar painel: ' + l.error.message)
    setLancamentos(((l.data as Lancamento[]) ?? []).map((x) => ({ ...x, valor: Number(x.valor) })))
    setPedidos((p.data as unknown as Pedido[]) ?? [])
    setClientes((c.data as Cliente[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    const onFocus = () => carregar()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [carregar])

  const dias = Number(periodo)
  const inicio = diasAtras(dias - 1)
  const inicioAnterior = diasAtras(dias * 2 - 1) // janela imediatamente anterior, mesmo tamanho

  const kpis = useMemo(() => {
    // Calcula os 4 números para uma janela [de, ate).
    const janela = (de: string, ate: string) => {
      const lanc = lancamentos.filter((l) => l.data >= de && l.data < ate)
      const faturamento = lanc.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
      const saidas = lanc.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
      const nPedidos = pedidos.filter((p) => p.data_entrega && p.data_entrega >= de && p.data_entrega < ate).length
      return { faturamento, lucro: faturamento - saidas, nPedidos, ticket: nPedidos > 0 ? faturamento / nPedidos : 0 }
    }
    const amanha = diasAFrente(1)
    const atual = janela(inicio, amanha)
    const anterior = janela(inicioAnterior, inicio)
    // Variação % vs período anterior (null quando não há base de comparação).
    const varPct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null)
    return {
      ...atual,
      trend: {
        faturamento: varPct(atual.faturamento, anterior.faturamento),
        lucro: varPct(atual.lucro, anterior.lucro),
        nPedidos: varPct(atual.nPedidos, anterior.nPedidos),
        ticket: varPct(atual.ticket, anterior.ticket),
      },
    }
  }, [lancamentos, pedidos, inicio, inicioAnterior])

  // Gráfico 1: faturamento x lucro por semana
  const dadosSemana = useMemo(() => {
    const nSemanas = Math.ceil(dias / 7)
    const buckets = Array.from({ length: nSemanas }, (_, i) => ({
      semana: `Sem ${i + 1}`,
      faturamento: 0,
      lucro: 0,
    }))
    for (const l of lancamentos) {
      if (l.data < inicio) continue
      const idx = Math.min(Math.floor(diffDias(l.data, inicio) / 7), nSemanas - 1)
      if (idx < 0) continue
      if (l.tipo === 'entrada') {
        buckets[idx].faturamento += l.valor
        buckets[idx].lucro += l.valor
      } else {
        buckets[idx].lucro -= l.valor
      }
    }
    return buckets.map((b) => ({ ...b, faturamento: Math.round(b.faturamento * 100) / 100, lucro: Math.round(b.lucro * 100) / 100 }))
  }, [lancamentos, inicio, dias])

  // Gráfico 2: pedidos por status (no período)
  const dadosStatus = useMemo(() => {
    const cont: Record<string, number> = { novo: 0, 'em produção': 0, entregue: 0 }
    for (const p of pedidos) {
      if (p.data_entrega && p.data_entrega >= inicio && cont[p.status] != null) cont[p.status]++
    }
    return Object.entries(cont).map(([status, qtd]) => ({ status, qtd }))
  }, [pedidos, inicio])

  // Precisa de atenção
  const hojeMMDD = hoje().slice(5)
  const atencao = useMemo(() => {
    const revisar = pedidos.filter((p) => p.flag_revisao)
    const aniversariantes = clientes.filter((c) => c.aniversario && c.aniversario.slice(5) === hojeMMDD)
    const limite = diasAFrente(7)
    const entregas = pedidos
      .filter((p) => p.data_entrega && p.data_entrega >= hoje() && p.data_entrega <= limite && p.status !== 'entregue')
      .sort((a, b) => (a.data_entrega! < b.data_entrega! ? -1 : 1))
    return { revisar, aniversariantes, entregas }
  }, [pedidos, clientes, hojeMMDD])

  const atividade = useMemo(() => lancamentos.slice(0, 6), [lancamentos])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi destaque titulo="Faturamento" valor={formatBRL(kpis.faturamento)} trend={kpis.trend.faturamento} icone={<DollarSign className="size-5 text-primary" />} />
        <Kpi titulo="Lucro (entradas − saídas)" valor={formatBRL(kpis.lucro)} trend={kpis.trend.lucro} icone={<TrendingUp className="size-5 text-primary" />} cor={kpis.lucro < 0 ? 'text-red-600' : undefined} />
        <Kpi titulo="Pedidos" valor={String(kpis.nPedidos)} trend={kpis.trend.nPedidos} icone={<ClipboardList className="size-5 text-primary" />} />
        <Kpi titulo="Ticket médio" valor={formatBRL(kpis.ticket)} trend={kpis.trend.ticket} icone={<Receipt className="size-5 text-primary" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento × Lucro por semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosSemana}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="semana" fontSize={12} />
                <YAxis fontSize={12} width={40} />
                <Tooltip formatter={(v) => formatBRL(Number(v))} />
                <Legend />
                <Bar dataKey="faturamento" name="Faturamento" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pedidos por status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" fontSize={12} />
                <YAxis fontSize={12} width={30} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qtd" name="Pedidos" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Precisa de atenção</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Linha icone={<AlertTriangle className="size-4 text-amber-500" />} titulo="Pedidos para revisar (valor divergente)" vazio="Nenhum">
              {atencao.revisar.map((p) => (
                <li key={p.id}>{p.cliente?.nome ?? '—'} · {p.receita?.nome ?? '—'}</li>
              ))}
            </Linha>
            <Linha icone={<Cake className="size-4 text-pink-500" />} titulo="Aniversariantes de hoje" vazio="Ninguém hoje">
              {atencao.aniversariantes.map((c) => (
                <li key={c.id}>{c.nome}{c.telefone ? ` · ${c.telefone}` : ''}</li>
              ))}
            </Linha>
            <Linha icone={<Truck className="size-4 text-blue-500" />} titulo="Entregas nos próximos 7 dias" vazio="Nenhuma entrega próxima">
              {atencao.entregas.map((p) => (
                <li key={p.id}>{formatData(p.data_entrega)} · {p.cliente?.nome ?? '—'} ({p.receita?.nome ?? '—'})</li>
              ))}
            </Linha>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Atividade recente</CardTitle></CardHeader>
          <CardContent>
            {atividade.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentações ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {atividade.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{formatData(l.data)} · {l.descricao || (l.tipo === 'entrada' ? 'Entrada' : 'Saída')}</span>
                    <span className={l.tipo === 'entrada' ? 'font-medium text-green-700' : 'font-medium text-red-700'}>
                      {l.tipo === 'entrada' ? '+' : '−'} {formatBRL(l.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ titulo, valor, icone, cor, trend, destaque }: {
  titulo: string; valor: string; icone: React.ReactNode; cor?: string; trend?: number | null; destaque?: boolean
}) {
  return (
    <Card className={destaque ? 'border-primary/30 bg-primary/5' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <p className={`font-bold ${destaque ? 'text-3xl' : 'text-2xl'} ${cor ?? ''}`}>{valor}</p>
          <Tendencia pct={trend} />
        </div>
      </CardContent>
    </Card>
  )
}

/** Texto pequeno de variação vs período anterior: verde para alta, vermelho para queda. */
function Tendencia({ pct }: { pct?: number | null }) {
  if (pct == null || !Number.isFinite(pct)) return null
  const alta = pct >= 0
  const arred = Math.abs(Math.round(pct))
  if (arred === 0) return <span className="pb-1 text-xs text-muted-foreground">estável</span>
  return (
    <span className={`pb-1 text-xs font-medium ${alta ? 'text-green-600' : 'text-red-600'}`}>
      {alta ? '▲' : '▼'} {arred}%
    </span>
  )
}

function Linha({ icone, titulo, vazio, children }: { icone: React.ReactNode; titulo: string; vazio: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  const vazioReal = items.flat().filter(Boolean).length === 0
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 font-medium">{icone} {titulo}</p>
      {vazioReal ? (
        <p className="pl-6 text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="list-disc pl-8 text-muted-foreground">{children}</ul>
      )}
    </div>
  )
}
