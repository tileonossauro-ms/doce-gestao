import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Configurações + dados de conta do usuário (tabela `perfis`, 1 linha por usuário). */
export type Perfil = {
  user_id: string
  nome: string | null
  pct_indireto_padrao: number
  pct_margem_padrao: number
  pct_taxas_padrao: number
  pct_custo_fixo_padrao: number
  modo_custo_fixo: 'manual' | 'automatico'
  estimativa_faturamento_mensal: number | null
  janela_analise_dias: number
  plano: 'basico' | 'pro'
}

type AuthContextType = {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  salvarPerfil: (patch: Partial<Perfil>) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, perfil: null, loading: true,
  salvarPerfil: async () => 'sem contexto',
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const userId = session?.user?.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) {
      setPerfil(null)
      return
    }
    supabase.from('perfis').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      setPerfil(data ? numerico(data as Perfil) : null)
    })
  }, [userId])

  /** Grava e atualiza o estado local. Devolve a mensagem de erro, ou null se deu certo. */
  const salvarPerfil = useCallback(async (patch: Partial<Perfil>) => {
    if (!userId) return 'Sem usuário logado.'
    const { data, error } = await supabase
      .from('perfis').update(patch).eq('user_id', userId).select('*').single()
    if (error) return error.message
    setPerfil(numerico(data as Perfil))
    return null
  }, [userId])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, perfil, loading, salvarPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Postgres devolve numeric como string; o app trabalha com número. */
function numerico(p: Perfil): Perfil {
  return {
    ...p,
    pct_indireto_padrao: Number(p.pct_indireto_padrao),
    pct_margem_padrao: Number(p.pct_margem_padrao),
    pct_taxas_padrao: Number(p.pct_taxas_padrao),
    pct_custo_fixo_padrao: Number(p.pct_custo_fixo_padrao),
    janela_analise_dias: Number(p.janela_analise_dias),
    estimativa_faturamento_mensal:
      p.estimativa_faturamento_mensal == null ? null : Number(p.estimativa_faturamento_mensal),
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

/** Nome de exibição do confeiteiro: perfil > metadata do cadastro > parte do e-mail. */
export function nomeExibicao(user: User | null, perfil?: Perfil | null): string {
  if (!user) return ''
  const nome = perfil?.nome?.trim() || (user.user_metadata?.nome as string | undefined)?.trim()
  return nome || user.email?.split('@')[0] || 'Confeiteiro(a)'
}
