import { useState, type ReactNode } from 'react'
import {
  CakeSlice, ShoppingBasket, CookingPot, ClipboardList, Users, Wallet,
  Calendar, BarChart3, Sparkles, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { usePlano } from '@/components/Pro'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Passo = { icone: LucideIcon; titulo: string; texto: ReactNode; pro?: string }

/** Passos do tour. `pro` = o que esse recurso ganha no plano Pró (mostrado como gostinho). */
function montarPassos(isPro: boolean): Passo[] {
  const passos: Passo[] = [
    {
      icone: CakeSlice,
      titulo: 'Bem-vinda ao Doce Gestão! 🍰',
      texto: <>Um tour rápido de 1 minuto para você conhecer o sistema. Pode pular a qualquer momento — e rever depois em <strong>Configurações</strong>.</>,
    },
    {
      icone: ShoppingBasket,
      titulo: 'Ingredientes',
      texto: <>Comece cadastrando seus ingredientes e embalagens. Ao lançar uma compra (tamanho + preço), o sistema calcula sozinho o <strong>custo por unidade</strong> e controla seu estoque.</>,
    },
    {
      icone: CookingPot,
      titulo: 'Receitas e a Calculadora de preço',
      texto: <>Monte a receita com seus ingredientes e a <strong>calculadora sugere o preço de venda</strong> — mostrando a conta passo a passo. É o coração do sistema.</>,
    },
    {
      icone: ClipboardList,
      titulo: 'Pedidos',
      texto: <>Registre os pedidos e acompanhe a produção em <strong>Lista</strong> ou no <strong>Quadro</strong> (arrastando o card de "novo" até "entregue"). Quando o cliente pagar, é só clicar em <strong>Receber pagamento</strong>.</>,
    },
    {
      icone: Users,
      titulo: 'Clientes',
      texto: <>Guarde seus clientes e veja quem faz <strong>aniversário no mês</strong> — uma boa desculpa para uma venda.</>,
    },
    {
      icone: Wallet,
      titulo: 'Financeiro',
      texto: <>Todo pedido pago vira entrada automática. Você também lança gastos e vê o <strong>saldo do mês</strong>.</>,
      pro: 'No Pró, ganha a aba DRE: o resultado do mês (lucro de verdade, já descontando ingredientes e contas).',
    },
    {
      icone: Calendar,
      titulo: 'Agenda',
      texto: <>Os próximos 30 dias num lugar só: <strong>entregas</strong>, <strong>aniversários</strong> de clientes e seus <strong>compromissos</strong>.</>,
    },
    {
      icone: BarChart3,
      titulo: 'Relatórios',
      texto: <>Veja o que <strong>mais vende</strong>, sua <strong>margem por produto</strong> e os <strong>melhores clientes</strong>.</>,
      pro: 'No Pró, ganha sugestão de compra e de produção, clientes sumidos e vendas por dia da semana.',
    },
  ]

  if (!isPro) {
    passos.push({
      icone: Sparkles,
      titulo: 'Um gostinho do plano Pró ✨',
      texto: (
        <>
          Quando quiser ir além, o <strong>Pró</strong> desbloqueia:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>DRE completo (o resultado do mês)</li>
            <li>Custo fixo embutido no preço da receita</li>
            <li>Relatórios avançados (o que comprar e quanto produzir)</li>
            <li>Fornecedores e Marcas (comparar preço por marca)</li>
          </ul>
          <span className="mt-2 block text-muted-foreground">Fale com a gente para liberar quando fizer sentido.</span>
        </>
      ),
    })
  }

  passos.push({
    icone: CakeSlice,
    titulo: 'Pronto para começar! 🎉',
    texto: <>Uma boa ordem: cadastre <strong>ingredientes</strong> → monte uma <strong>receita</strong> → registre um <strong>pedido</strong>. Qualquer instrução na tela pode ser recolhida no ícone 💡. Bom trabalho!</>,
  })

  return passos
}

export default function Tour() {
  const { perfil, salvarPerfil } = useAuth()
  const { isPro } = usePlano()
  const [i, setI] = useState(0)
  const [fechado, setFechado] = useState(false) // fecho imediato (não depende do salvar)

  // Só aparece para quem ainda não viu. (O mount usa key p/ reiniciar quando reaberto.)
  if (!perfil || perfil.onboarding_visto || fechado) return null

  const passos = montarPassos(isPro)
  const passo = passos[i]
  const primeiro = i === 0
  const ultimo = i === passos.length - 1
  const Icone = passo.icone

  function encerrar() {
    setFechado(true)
    salvarPerfil({ onboarding_visto: true })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Icone className="size-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">{passo.titulo}</h2>
          <div className="text-sm text-muted-foreground">{passo.texto}</div>
          {passo.pro && (
            <div className="mt-1 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm">
              <Badge className="shrink-0">Pró</Badge>
              <span className="text-muted-foreground">{passo.pro}</span>
            </div>
          )}
        </div>

        {/* Progresso em bolinhas */}
        <div className="flex justify-center gap-1.5 py-5">
          {passos.map((_, idx) => (
            <span key={idx} className={`size-1.5 rounded-full ${idx === i ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button variant="ghost" size="sm" onClick={encerrar}>Pular</Button>
          <div className="flex gap-2">
            {!primeiro && <Button variant="outline" size="sm" onClick={() => setI((n) => n - 1)}>Voltar</Button>}
            {ultimo
              ? <Button size="sm" onClick={encerrar}>Começar a usar</Button>
              : <Button size="sm" onClick={() => setI((n) => n + 1)}>Próximo</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}
