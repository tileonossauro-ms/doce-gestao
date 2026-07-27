import { Link } from 'react-router-dom'
import {
  ShoppingBasket, CookingPot, Users, ClipboardList, KanbanSquare, HandCoins,
  Wallet, BarChart3, ArrowRight, type LucideIcon,
} from 'lucide-react'
import Cupcake from '@/components/Cupcake'
import Ajuda from '@/components/Ajuda'
import { Card, CardContent } from '@/components/ui/card'

type Passo = { n: number; icone: LucideIcon; titulo: string; texto: string; link?: { para: string; rotulo: string } }

const JORNADA: Passo[] = [
  { n: 1, icone: ShoppingBasket, titulo: 'Cadastre seus ingredientes e embalagens', texto: 'Coloque o que você usa (leite condensado, chocolate, forminhas…). Ao lançar uma compra com o tamanho da embalagem e o preço, o sistema descobre sozinho o custo por unidade.', link: { para: '/ingredientes', rotulo: 'Ir para Ingredientes' } },
  { n: 2, icone: CookingPot, titulo: 'Monte suas receitas e calcule o preço', texto: 'Junte os ingredientes de cada receita e diga o rendimento (quantas unidades faz). A calculadora sugere o preço de venda e mostra a conta passo a passo. É o coração do sistema.', link: { para: '/receitas', rotulo: 'Ir para Receitas' } },
  { n: 3, icone: Users, titulo: 'Cadastre seus clientes', texto: 'Guarde nome, telefone e aniversário. O sistema avisa quem faz aniversário no mês — uma boa desculpa para uma venda.', link: { para: '/clientes', rotulo: 'Ir para Clientes' } },
  { n: 4, icone: ClipboardList, titulo: 'Registre os pedidos', texto: 'Escolha o cliente, adicione os itens (o preço vem sugerido pela receita) e a data de entrega. Pode marcar a forma de pagamento prevista.', link: { para: '/pedidos', rotulo: 'Ir para Pedidos' } },
  { n: 5, icone: KanbanSquare, titulo: 'Acompanhe a produção', texto: 'Em Pedidos, use a Lista ou o Quadro. No Quadro você arrasta cada pedido de "novo" → "em produção" → "entregue", como um mural de tarefas.', },
  { n: 6, icone: HandCoins, titulo: 'Receba o pagamento', texto: 'Quando o cliente pagar, clique em "Receber pagamento" e diga como pagou. Isso vira uma entrada automática no financeiro e dá baixa no estoque dos ingredientes usados.', },
  { n: 7, icone: Wallet, titulo: 'Veja o dinheiro no Financeiro', texto: 'Todas as entradas e saídas ficam aqui, com o saldo do mês. Você também lança gastos (compra de embalagem, gás, marketing…).', link: { para: '/financeiro', rotulo: 'Ir para Financeiro' } },
  { n: 8, icone: BarChart3, titulo: 'Acompanhe tudo no Painel e nos Relatórios', texto: 'O Painel mostra o resumo do período. Os Relatórios mostram o que mais vende, sua margem por produto e os melhores clientes.', link: { para: '/relatorios', rotulo: 'Ir para Relatórios' } },
]

const GLOSSARIO: { termo: string; def: string }[] = [
  { termo: 'Custo indireto', def: 'Gastos da produção que não estão nos ingredientes: gás, luz, água. Costuma ficar entre 5% e 15%.' },
  { termo: 'Margem', def: 'O seu lucro em cada venda — o que sobra pra você. Costuma ficar entre 30% e 60%.' },
  { termo: 'Taxas', def: 'O que a maquininha de cartão ou o app de entrega cobram de cada venda. Costuma ficar entre 2% e 6%.' },
  { termo: 'Custo fixo', def: 'A fatia que ajuda a pagar as contas do mês (aluguel, luz, internet) mesmo sem vender. (Recurso do plano Pró.)' },
  { termo: 'Rendimento', def: 'Quantas unidades saem de uma receita inteira. Ex.: se a massa faz 30 brigadeiros, o rendimento é 30.' },
  { termo: 'Ticket médio', def: 'Quanto cada pedido rende, em média. É o faturamento dividido pelo número de pedidos.' },
  { termo: 'Faturamento', def: 'Todo o dinheiro que entrou no período, antes de descontar qualquer custo.' },
  { termo: 'Lucro', def: 'O que sobrou: tudo que entrou menos tudo que saiu no período.' },
  { termo: 'Estoque mínimo', def: 'A quantidade mínima que você quer sempre ter. Abaixo disso, o item fica amarelo pra lembrar de comprar.' },
  { termo: 'Receita bruta', def: 'Tudo que você vendeu no mês, sem tirar nada ainda.' },
  { termo: 'Deduções', def: 'O que sai da venda antes de virar dinheiro seu: taxa do cartão/app, impostos e descontos.' },
  { termo: 'Receita líquida', def: 'O que realmente entrou no caixa depois de tirar as deduções.' },
  { termo: 'Lucro líquido', def: 'O que sobrou de verdade no fim do mês, depois de tudo: ingredientes, contas fixas e investimentos.' },
]

export default function ComoUsar() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Cupcake className="size-14 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold">Como usar o Doce Gestão</h1>
          <p className="text-sm text-muted-foreground">O caminho, do começo ao fim, do jeito que uma confeitaria funciona no dia a dia.</p>
        </div>
      </div>

      <div className="space-y-3">
        {JORNADA.map((p) => (
          <Card key={p.n}>
            <CardContent className="flex gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{p.n}</div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium"><p.icone className="size-4 text-muted-foreground" /> {p.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
                {p.link && (
                  <Link to={p.link.para} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    {p.link.rotulo} <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Ajuda id="glossario" titulo="Glossário — o que cada palavra significa" padrao="fechado">
        <dl className="space-y-2">
          {GLOSSARIO.map((g) => (
            <div key={g.termo}>
              <dt className="font-medium text-foreground">{g.termo}</dt>
              <dd className="text-muted-foreground">{g.def}</dd>
            </div>
          ))}
        </dl>
      </Ajuda>

      <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <Cupcake className="size-6 shrink-0" />
        Dica: em qualquer tela, passe o mouse no <strong>?</strong> ao lado de um termo — eu apareço explicando. 🧁
      </p>
    </div>
  )
}
