import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Crown, CalendarClock, DollarSign, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatBRL, formatData } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Preços mensais estimados por plano (só para o MRR do painel). AJUSTAR quando definir os valores reais.
const PRECO = { basico: 29.9, pro: 49.9 }
const DIAS_ASSINATURA = 30

type Conta = {
  user_id: string
  nome: string | null
  email: string | null
  plano: 'basico' | 'pro'
  acesso_ate: string | null
  ultima_atividade: string | null
  criado_em: string
}

const hoje = () => new Date().toISOString().slice(0, 10)
function somaDias(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
/** Situação da assinatura a partir da data paga. */
function situacao(acesso_ate: string | null): { txt: string; cor: string } {
  if (!acesso_ate) return { txt: 'Sem cobrança', cor: 'border-neutral-300 bg-neutral-50 text-neutral-600' }
  if (acesso_ate >= hoje()) return { txt: `Em dia até ${formatData(acesso_ate)}`, cor: 'border-green-300 bg-green-50 text-green-700' }
  return { txt: `Vencida em ${formatData(acesso_ate)}`, cor: 'border-red-300 bg-red-50 text-red-700' }
}

export default function Admin() {
  const { user } = useAuth()
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [excluir, setExcluir] = useState<Conta | null>(null)
  const [apagando, setApagando] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('perfis')
      .select('user_id, nome, email, plano, acesso_ate, ultima_atividade, criado_em')
      .order('criado_em')
    if (error) toast.error('Erro ao carregar contas: ' + error.message)
    setContas((data as Conta[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const metricas = useMemo(() => {
    const pro = contas.filter((c) => c.plano === 'pro').length
    const basico = contas.length - pro
    const pendentes = contas.filter((c) => c.acesso_ate && c.acesso_ate < hoje()).length
    const mrr = pro * PRECO.pro + basico * PRECO.basico
    return { total: contas.length, pro, basico, pendentes, mrr }
  }, [contas])

  async function trocarPlano(c: Conta, plano: 'basico' | 'pro') {
    if (plano === c.plano) return
    setContas((prev) => prev.map((x) => (x.user_id === c.user_id ? { ...x, plano } : x)))
    const { error } = await supabase.from('perfis').update({ plano }).eq('user_id', c.user_id)
    if (error) { toast.error('Erro: ' + error.message); carregar() }
    else toast.success(`${c.nome ?? c.email}: plano ${plano}.`)
  }

  async function registrarPagamento(c: Conta) {
    // renova a assinatura por mais 30 dias a partir de hoje (ou do vencimento, se ainda futuro).
    const base = c.acesso_ate && c.acesso_ate > hoje() ? c.acesso_ate : hoje()
    const novo = somaDias(base, DIAS_ASSINATURA)
    const { error } = await supabase.from('perfis').update({ acesso_ate: novo, pagamento_em_dia: true }).eq('user_id', c.user_id)
    if (error) return toast.error('Erro: ' + error.message)
    toast.success(`Pagamento registrado. Acesso até ${formatData(novo)}.`)
    carregar()
  }

  async function definirVencimento(c: Conta, data: string) {
    const { error } = await supabase.from('perfis').update({ acesso_ate: data || null }).eq('user_id', c.user_id)
    if (error) return toast.error('Erro: ' + error.message)
    carregar()
  }

  async function confirmarExclusao() {
    if (!excluir) return
    setApagando(true)
    const { error } = await supabase.rpc('admin_apagar_usuario', { p_uid: excluir.user_id })
    setApagando(false)
    if (error) return toast.error('Erro ao apagar: ' + error.message)
    toast.success(`Conta de ${excluir.nome ?? excluir.email} apagada.`)
    setExcluir(null)
    carregar()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Crown className="size-6 text-primary" /> Painel do administrador</h1>
        <p className="text-sm text-muted-foreground">Gestão manual das contas. Você vê metadados de assinatura — nunca os dados de negócio de cada confeiteira.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica titulo="Contas" valor={String(metricas.total)} icone={<Users className="size-5 text-primary" />} loading={loading} />
        <Metrica titulo="Pró / Básico" valor={`${metricas.pro} / ${metricas.basico}`} icone={<Crown className="size-5 text-primary" />} loading={loading} />
        <Metrica titulo="MRR estimado" valor={formatBRL(metricas.mrr)} nota="por mês" icone={<DollarSign className="size-5 text-primary" />} loading={loading} />
        <Metrica titulo="Assinaturas vencidas" valor={String(metricas.pendentes)} icone={<CalendarClock className="size-5 text-primary" />} cor={metricas.pendentes > 0 ? 'text-red-600' : undefined} loading={loading} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead>Vence em</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead className="text-right">Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : contas.length === 0 ? (
              <TableRow><TableCell colSpan={6}><p className="py-10 text-center text-sm text-muted-foreground">Nenhuma conta.</p></TableCell></TableRow>
            ) : (
              contas.map((c) => {
                const s = situacao(c.acesso_ate)
                return (
                  <TableRow key={c.user_id}>
                    <TableCell>
                      <div className="font-medium">{c.nome ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{c.email ?? c.user_id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={c.plano} onValueChange={(v) => trocarPlano(c, v as 'basico' | 'pro')}>
                        <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basico">Básico</SelectItem>
                          <SelectItem value="pro">Pró</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={s.cor}>{s.txt}</Badge></TableCell>
                    <TableCell>
                      <Input type="date" value={c.acesso_ate ?? ''} onChange={(e) => definirVencimento(c, e.target.value)} className="h-8 w-40" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.ultima_atividade ? formatData(c.ultima_atividade) : <span className="text-amber-600">nunca usou</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => registrarPagamento(c)}>
                          <RefreshCw /> Registrar pagamento (+{DIAS_ASSINATURA}d)
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setExcluir(c)}
                          disabled={c.user_id === user?.id}
                          title={c.user_id === user?.id ? 'Você não pode apagar a própria conta' : 'Apagar conta'}
                          aria-label="Apagar conta"
                        >
                          <Trash2 className="text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        MRR estimado usa preços de referência (Básico {formatBRL(PRECO.basico)}, Pró {formatBRL(PRECO.pro)}) —
        me diga os valores reais que eu ajusto. "Registrar pagamento" renova a assinatura por {DIAS_ASSINATURA} dias.
        Quando a data vence e não é renovada, a confeiteira perde o acesso automaticamente.
      </p>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que quer apagar esta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de <strong>{excluir?.nome ?? excluir?.email}</strong> e <strong>todos os dados dela</strong>
              {' '}(receitas, pedidos, financeiro, estoque, cadastros) serão apagados para sempre. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} disabled={apagando} className="bg-red-600 hover:bg-red-700">
              {apagando ? 'Apagando…' : 'Apagar conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Metrica({ titulo, valor, nota, icone, cor, loading }: {
  titulo: string; valor: string; nota?: string; icone: React.ReactNode; cor?: string; loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : (
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-bold ${cor ?? ''}`}>{valor}</p>
            {nota && <span className="pb-1 text-xs text-muted-foreground">{nota}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
