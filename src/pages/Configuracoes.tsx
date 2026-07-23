import { useEffect, useState } from 'react'
import { Loader2, Save, RefreshCw, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatNum, parseNum } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const JANELAS = [30, 60, 90]

/** Data ISO de N dias atrás. */
function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function Configuracoes() {
  const { user, perfil, salvarPerfil } = useAuth()

  const [nome, setNome] = useState('')
  const [indireto, setIndireto] = useState('')
  const [margem, setMargem] = useState('')
  const [taxas, setTaxas] = useState('')
  const [custoFixo, setCustoFixo] = useState('')
  const [estimativa, setEstimativa] = useState('')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [salvandoPct, setSalvandoPct] = useState(false)

  // Preenche os campos quando o perfil chega do banco.
  useEffect(() => {
    if (!perfil) return
    setNome(perfil.nome ?? '')
    setIndireto(String(perfil.pct_indireto_padrao))
    setMargem(String(perfil.pct_margem_padrao))
    setTaxas(String(perfil.pct_taxas_padrao))
    setCustoFixo(String(perfil.pct_custo_fixo_padrao))
    setEstimativa(perfil.estimativa_faturamento_mensal?.toString() ?? '')
  }, [perfil])

  async function salvarNome() {
    setSalvandoPerfil(true)
    const erro = await salvarPerfil({ nome: nome.trim() || null })
    setSalvandoPerfil(false)
    if (erro) return toast.error('Erro ao salvar: ' + erro)
    toast.success('Perfil salvo!')
  }

  async function salvarPercentuais() {
    const m = parseNum(margem) || 0
    const t = parseNum(taxas) || 0
    const cf = parseNum(custoFixo) || 0
    if (m + t + cf >= 100) {
      return toast.error('Margem + taxas + custo fixo precisam somar menos de 100%.')
    }
    setSalvandoPct(true)
    const erro = await salvarPerfil({
      pct_indireto_padrao: parseNum(indireto) || 0,
      pct_margem_padrao: m,
      pct_taxas_padrao: t,
      pct_custo_fixo_padrao: cf,
      estimativa_faturamento_mensal: parseNum(estimativa) || null,
    })
    setSalvandoPct(false)
    if (erro) return toast.error('Erro ao salvar: ' + erro)
    toast.success('Padrões salvos! Serão usados em novas receitas.')
  }

  if (!perfil) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Seu nome aparece no topo do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cfg-nome">Nome do confeiteiro(a)</Label>
            <Input id="cfg-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-email">E-mail</Label>
            <Input id="cfg-email" value={user?.email ?? ''} disabled />
            <p className="text-xs text-muted-foreground">O e-mail de acesso não pode ser alterado por aqui.</p>
          </div>
          <Button onClick={salvarNome} disabled={salvandoPerfil}>
            {salvandoPerfil ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar perfil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Percentuais padrão de precificação</CardTitle>
          <CardDescription>
            Já vêm preenchidos ao criar uma nova receita. Você pode ajustar caso a caso na própria receita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-ind">Custo indireto %</Label>
              <Input id="cfg-ind" inputMode="decimal" value={indireto} onChange={(e) => setIndireto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-mar">Margem %</Label>
              <Input id="cfg-mar" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-tax">Taxas %</Label>
              <Input id="cfg-tax" inputMode="decimal" value={taxas} onChange={(e) => setTaxas(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-cf">Custo fixo %</Label>
              <Input id="cfg-cf" inputMode="decimal" value={custoFixo} onChange={(e) => setCustoFixo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-est">Quanto você espera faturar por mês (R$)</Label>
            <Input id="cfg-est" inputMode="decimal" value={estimativa} onChange={(e) => setEstimativa(e.target.value)} placeholder="Opcional" />
            <p className="text-xs text-muted-foreground">
              Usado só no cálculo automático abaixo, quando ainda não há vendas suficientes para estimar.
            </p>
          </div>
          <Button onClick={salvarPercentuais} disabled={salvandoPct}>
            {salvandoPct ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar percentuais
          </Button>
        </CardContent>
      </Card>

      <CustoFixoAutomatico />

      <Card>
        <CardHeader>
          <CardTitle>Janela de análise</CardTitle>
          <CardDescription>
            Quantos dias de histórico os Relatórios olham para sugerir compra de ingredientes e quanto produzir por semana.
            Janela curta reage rápido a mudanças; janela longa é mais estável.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="cfg-janela">Período analisado</Label>
          <Select
            value={String(perfil.janela_analise_dias)}
            onValueChange={async (v) => {
              const erro = await salvarPerfil({ janela_analise_dias: Number(v) })
              toast[erro ? 'error' : 'success'](erro ? 'Erro: ' + erro : 'Janela de análise salva!')
            }}
          >
            <SelectTrigger id="cfg-janela" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JANELAS.map((d) => <SelectItem key={d} value={String(d)}>Últimos {d} dias</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}

/** Modo manual x automático do custo fixo %, com cálculo puxado sob demanda. */
function CustoFixoAutomatico() {
  const { perfil, salvarPerfil } = useAuth()
  const [calculando, setCalculando] = useState(false)
  const [calculo, setCalculo] = useState<{ fixos: number; faturamento: number; pct: number; fonte: string } | null>(null)

  if (!perfil) return null
  const automatico = perfil.modo_custo_fixo === 'automatico'

  async function calcular() {
    if (!perfil) return
    setCalculando(true)
    const janela = perfil.janela_analise_dias
    const [f, v] = await Promise.all([
      supabase.from('custos_fixos').select('valor_mensal, inicio, fim'),
      supabase
        .from('lancamentos')
        .select('pedido:pedidos(itens:pedido_itens(quantidade, preco_unitario))')
        .eq('tipo', 'entrada').not('pedido_id', 'is', null)
        .gte('data', diasAtras(janela - 1)),
    ])
    setCalculando(false)
    if (f.error || v.error) return toast.error('Erro ao calcular: ' + (f.error ?? v.error)?.message)

    const hoje = new Date().toISOString().slice(0, 10)
    const fixos = ((f.data as { valor_mensal: number; inicio: string; fim: string | null }[]) ?? [])
      .filter((c) => c.inicio <= hoje && (!c.fim || c.fim >= hoje))
      .reduce((s, c) => s + Number(c.valor_mensal), 0)

    type Linha = { pedido: { itens: { quantidade: number; preco_unitario: number }[] } | null }
    const vendido = ((v.data as unknown as Linha[]) ?? []).reduce(
      (s, l) => s + (l.pedido?.itens ?? []).reduce((a, i) => a + i.quantidade * Number(i.preco_unitario), 0), 0)
    const porMes = (vendido / janela) * 30

    const usaEstimativa = porMes <= 0 && !!perfil.estimativa_faturamento_mensal
    const faturamento = usaEstimativa ? Number(perfil.estimativa_faturamento_mensal) : porMes
    if (faturamento <= 0) {
      setCalculo(null)
      return toast.error('Sem vendas no período e sem estimativa de faturamento. Preencha a estimativa acima.')
    }
    setCalculo({
      fixos, faturamento,
      pct: Math.round((fixos / faturamento) * 1000) / 10,
      fonte: usaEstimativa ? 'sua estimativa mensal' : `vendas dos últimos ${janela} dias`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Como definir o custo fixo %</CardTitle>
        <CardDescription>
          É a fatia de cada venda que paga aluguel, energia e as outras contas do mês. No modo manual você escolhe o número;
          no automático o sistema calcula a partir dos seus custos fixos e do seu faturamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cfg-modo">Modo</Label>
          <Select
            value={perfil.modo_custo_fixo}
            onValueChange={async (v) => {
              const erro = await salvarPerfil({ modo_custo_fixo: v as 'manual' | 'automatico' })
              toast[erro ? 'error' : 'success'](erro ? 'Erro: ' + erro : 'Modo salvo!')
            }}
          >
            <SelectTrigger id="cfg-modo" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (eu escolho o %)</SelectItem>
              <SelectItem value="automatico">Automático (calcular pra mim)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {automatico && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={calcular} disabled={calculando}>
                {calculando ? <Loader2 className="animate-spin" /> : <RefreshCw />} Atualizar cálculo
              </Button>
              {calculo && (
                <Button
                  size="sm"
                  onClick={async () => {
                    const erro = await salvarPerfil({ pct_custo_fixo_padrao: calculo.pct })
                    toast[erro ? 'error' : 'success'](erro ? 'Erro: ' + erro : `Custo fixo padrão agora é ${formatNum(calculo.pct, 1)}%.`)
                  }}
                >
                  <Wand2 /> Usar este valor
                </Button>
              )}
            </div>
            {calculo ? (
              <div className="space-y-1 text-sm">
                <p>
                  Custos fixos de <strong>{formatBRL(calculo.fixos)}</strong> por mês ÷ faturamento de{' '}
                  <strong>{formatBRL(calculo.faturamento)}</strong> ({calculo.fonte}) ={' '}
                  <strong className="text-primary">{formatNum(calculo.pct, 1)}%</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Ou seja: de cada R$ 100 vendidos, {formatBRL(calculo.pct)} precisam ir para as contas fixas.
                  O cálculo só roda quando você clica — nada muda sozinho nas suas receitas.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Clique em "Atualizar cálculo" para ver o percentual sugerido.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
