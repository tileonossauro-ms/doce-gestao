import { useEffect, useState } from 'react'
import { Loader2, Save, RefreshCw, Wand2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatNum, parseNum } from '@/lib/format'
import { usePlano } from '@/components/Pro'
import Ajuda from '@/components/Ajuda'
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
  const { isPro } = usePlano()

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
          <div className={`grid grid-cols-2 gap-3 ${isPro ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
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
            {isPro && (
              <div className="space-y-2">
                <Label htmlFor="cfg-cf">Custo fixo %</Label>
                <Input id="cfg-cf" inputMode="decimal" value={custoFixo} onChange={(e) => setCustoFixo(e.target.value)} />
              </div>
            )}
          </div>
          {isPro && (
            <div className="space-y-2">
              <Label htmlFor="cfg-est">Quanto você espera faturar por mês (R$)</Label>
              <Input id="cfg-est" inputMode="decimal" value={estimativa} onChange={(e) => setEstimativa(e.target.value)} placeholder="Opcional" />
              <p className="text-xs text-muted-foreground">
                Usado só no cálculo automático abaixo, quando ainda não há vendas suficientes para estimar.
              </p>
            </div>
          )}
          <Button onClick={salvarPercentuais} disabled={salvandoPct}>
            {salvandoPct ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar percentuais
          </Button>
        </CardContent>
      </Card>

      <Seguranca />

      {isPro && <CustoFixoAutomatico />}

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

/** Troca de senha. Também é o destino do link de "esqueci minha senha". */
function Seguranca() {
  const veioDoEmail = new URLSearchParams(window.location.search).has('nova-senha')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function trocar() {
    if (senha.length < 6) return toast.error('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirmar) return toast.error('As duas senhas não são iguais.')
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)
    if (error) return toast.error('Erro ao trocar a senha: ' + error.message)
    setSenha('')
    setConfirmar('')
    toast.success('Senha alterada! Use a nova no próximo acesso.')
  }

  return (
    <Card className={veioDoEmail ? 'border-primary/40 bg-primary/5' : undefined}>
      <CardHeader>
        <CardTitle>Senha de acesso</CardTitle>
        <CardDescription>
          {veioDoEmail
            ? 'Você entrou pelo link do e-mail. Defina agora a sua nova senha, senão o acesso antigo continua valendo.'
            : 'Troque sua senha quando quiser. Mínimo de 6 caracteres.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cfg-senha">Nova senha</Label>
            <Input id="cfg-senha" type={mostrar ? 'text' : 'password'} value={senha}
              onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-senha2">Repita a nova senha</Label>
            <Input id="cfg-senha2" type={mostrar ? 'text' : 'password'} value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)} placeholder="Digite de novo" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={trocar} disabled={salvando || !senha}>
            {salvando ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Alterar senha
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMostrar((v) => !v)}>
            {mostrar ? 'Ocultar senha' : 'Mostrar senha'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Modo manual x automático do custo fixo %, com cálculo puxado sob demanda. */
function CustoFixoAutomatico() {
  const { perfil, salvarPerfil } = useAuth()
  const [calculando, setCalculando] = useState(false)
  const [calculo, setCalculo] = useState<{ fixos: number; faturamento: number; pct: number; fonte: string } | null>(null)

  if (!perfil) return null
  const automatico = perfil.modo_custo_fixo === 'automatico'
  // Margem + taxas + custo fixo têm que somar menos de 100%, senão nenhum preço fecha a conta.
  const teto = 100 - perfil.pct_margem_padrao - perfil.pct_taxas_padrao
  const inviavel = !!calculo && calculo.pct >= teto

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
        <Ajuda id="guia-custo-fixo" titulo="Entenda o custo fixo % (como escolher o número)">
          <p>Toda venda precisa ajudar a pagar as contas que existem <strong>mesmo quando você não vende</strong>: aluguel, luz, internet. O <strong>custo fixo %</strong> é a fatia de cada venda reservada para isso.</p>
          <p><strong>A conta é simples:</strong> pegue quanto você gasta de contas fixas por mês e divida pelo quanto você espera vender no mês.</p>
          <p className="rounded-md bg-background/70 px-3 py-2">
            Exemplo: contas fixas de <strong>R$ 1.000/mês</strong> ÷ vendas esperadas de <strong>R$ 5.000/mês</strong> = <strong>20%</strong>.<br />
            Então, de cada R$ 100 vendidos, R$ 20 vão para as contas do mês — e é esse 20% que entra no preço.
          </p>
          <p>Se você deixar no <strong>Automático</strong>, o sistema faz essa conta sozinho com os seus custos fixos cadastrados. Se o número der muito alto, é sinal de que as vendas ainda não cobrem as contas — aí o caminho é vender mais ou reduzir custo, não só subir o preço.</p>
        </Ajuda>

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
              {calculo && !inviavel && (
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
                {inviavel ? (
                  <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800">
                    <p className="font-medium">Esse percentual não cabe no preço.</p>
                    <p className="mt-1 text-xs">
                      Com margem de {formatNum(perfil.pct_margem_padrao, 1)}% e taxas de {formatNum(perfil.pct_taxas_padrao, 1)}%,
                      o custo fixo teria que ficar abaixo de {formatNum(teto, 1)}% — e o cálculo deu {formatNum(calculo.pct, 1)}%.
                      Traduzindo: o faturamento de hoje não paga as contas fixas, e nenhum preço resolve isso sozinho.
                      Os caminhos reais são vender mais, cortar custo fixo ou aceitar um custo fixo % menor e cobrir a diferença com volume.
                      Por segurança, não dá para aplicar esse valor.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ou seja: de cada R$ 100 vendidos, {formatBRL(calculo.pct)} precisam ir para as contas fixas.
                    O cálculo só roda quando você clica — nada muda sozinho nas suas receitas.
                  </p>
                )}
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
