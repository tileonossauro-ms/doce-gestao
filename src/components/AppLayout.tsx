import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBasket,
  CookingPot,
  Users,
  ClipboardList,
  Wallet,
  BarChart3,
  Calendar,
  Truck,
  Tag,
  CreditCard,
  Tags,
  Receipt,
  Wand2,
  Settings,
  CakeSlice,
  LogOut,
  Crown,
  HelpCircle,
  ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth, nomeExibicao } from '@/lib/auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import Tour from '@/components/Tour'

const OPERACAO = [
  { titulo: 'Painel', url: '/painel', icone: LayoutDashboard },
  { titulo: 'Pedidos', url: '/pedidos', icone: ClipboardList },
  { titulo: 'Financeiro', url: '/financeiro', icone: Wallet },
  { titulo: 'Relatórios', url: '/relatorios', icone: BarChart3 },
  { titulo: 'Precificação', url: '/precificacao', icone: Wand2, pro: true },
  { titulo: 'Agenda', url: '/agenda', icone: Calendar },
]

const CADASTROS = [
  { titulo: 'Ingredientes', url: '/ingredientes', icone: ShoppingBasket },
  { titulo: 'Receitas', url: '/receitas', icone: CookingPot },
  { titulo: 'Clientes', url: '/clientes', icone: Users },
  { titulo: 'Fornecedores', url: '/fornecedores', icone: Truck, pro: true },
  { titulo: 'Marcas', url: '/marcas', icone: Tag, pro: true },
  { titulo: 'Formas de pagamento', url: '/formas-pagamento', icone: CreditCard },
  { titulo: 'Categorias', url: '/categorias', icone: Tags },
  { titulo: 'Custos fixos', url: '/custos-fixos', icone: Receipt, pro: true },
]

export default function AppLayout() {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const nome = nomeExibicao(user, perfil)
  const isPro = perfil?.plano === 'pro'
  // No plano Básico os itens marcados como Pró somem do menu (não vendem, só não aparecem).
  const operacao = OPERACAO.filter((item) => isPro || !item.pro)
  const cadastros = CADASTROS.filter((item) => isPro || !item.pro)

  async function sair() {
    await supabase.auth.signOut()
    toast.success('Você saiu da conta.')
    navigate('/login', { replace: true })
  }

  // Assinatura vencida bloqueia o app (superadmin nunca é bloqueado).
  const hoje = new Date().toISOString().slice(0, 10)
  const vencida = !!perfil && !perfil.is_superadmin && !!perfil.acesso_ate && perfil.acesso_ate < hoje
  if (vencida) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <div className="max-w-md rounded-lg border bg-background p-8 text-center">
          <h1 className="text-xl font-semibold">Sua assinatura venceu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O acesso ao Doce Gestão está pausado porque a assinatura não está em dia. Seus dados continuam guardados —
            assim que o pagamento for confirmado, tudo volta ao normal. Fale com a gente para renovar.
          </p>
          <button onClick={sair} className="mt-6 text-sm text-primary underline">Sair</button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
                <CakeSlice className="size-5 text-sidebar-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Doce Gestão
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Operação</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {operacao.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.titulo} isActive={pathname === item.url}>
                        <NavLink to={item.url}>
                          <item.icone />
                          <span>{item.titulo}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Cadastros</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {cadastros.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.titulo} isActive={pathname === item.url}>
                        <NavLink to={item.url}>
                          <item.icone />
                          <span>{item.titulo}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Configurações" isActive={pathname === '/configuracoes'}>
                      <NavLink to="/configuracoes">
                        <Settings />
                        <span>Configurações</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground uppercase">
                        {nome.charAt(0)}
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-medium">{nome}</span>
                        <span className="truncate text-xs text-sidebar-foreground/60">{user?.email}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <span className="block truncate text-sm font-medium">{nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {perfil?.is_superadmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Crown />
                        Painel admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={sair}>
                      <LogOut />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* min-w-0: sem isso o conteúdo empurra a largura e a página inteira rola na horizontal
            em telas estreitas, em vez de a tabela rolar dentro do próprio quadro. */}
        <SidebarInset className="min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{nome}</span> 🍰
            </span>
            <NavLink
              to="/como-usar"
              className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <HelpCircle className="size-4" /> Como usar
            </NavLink>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Tour key={String(perfil?.onboarding_visto)} />
    </TooltipProvider>
  )
}
