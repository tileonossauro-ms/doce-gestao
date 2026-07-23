import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** true = conta Pró. Enquanto o perfil não carregou, devolve undefined (indefinido). */
export function usePlano() {
  const { perfil } = useAuth()
  return { carregado: !!perfil, isPro: perfil?.plano === 'pro' }
}

/** Aviso pequeno, para trechos dentro de uma página (bloco de relatório, etc.). */
export function AvisoPro({ recurso }: { recurso: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-sm">
      <Sparkles className="size-5 shrink-0 text-primary" />
      <div>
        <p className="font-medium">{recurso} faz parte do plano Pró</p>
        <p className="text-muted-foreground">Disponível em breve. Fale com a gente para liberar o plano Pró.</p>
      </div>
    </div>
  )
}

/** Bloqueio de página inteira, para rotas exclusivas do Pró. */
export function BloqueioPro({ recurso }: { recurso: string }) {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>
          <CardTitle>{recurso} é um recurso Pró</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Este recurso faz parte do plano Pró — disponível em breve.</p>
          <p className="mt-2">Fale com a gente para liberar o plano Pró e desbloquear relatórios avançados, DRE, controle de custos fixos, fornecedores e marcas.</p>
        </CardContent>
      </Card>
    </div>
  )
}

/** Guarda de rota: só deixa passar quem é Pró; senão mostra o bloqueio. */
export function RotaPro({ recurso, children }: { recurso: string; children: ReactNode }) {
  const { carregado, isPro } = usePlano()
  if (!carregado) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  return isPro ? <>{children}</> : <BloqueioPro recurso={recurso} />
}

/** Guarda de rota do superadmin: quem não é admin vai para o painel. */
export function RotaAdmin({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  if (!perfil) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  return perfil.is_superadmin ? <>{children}</> : <Navigate to="/painel" replace />
}
