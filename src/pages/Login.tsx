import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CakeSlice, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const { session, loading } = useAuth()
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Já logado? vai para o painel.
  if (!loading && session) return <Navigate to="/painel" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        toast.success('Bem-vindo(a) de volta!')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        })
        if (error) throw error
        toast.success('Conta criada! Você já pode usar o Doce Gestão.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Algo deu errado.'
      toast.error(traduzErro(msg))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CakeSlice className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Doce Gestão</CardTitle>
          <CardDescription>
            {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === 'registro' && (
              <div className="space-y-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como quer ser chamado(a)"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" />}
              {modo === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {modo === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
            >
              {modo === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/** Traduz as mensagens de erro mais comuns do Supabase para português simples. */
function traduzErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.'
  if (msg.includes('Password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.'
  if (msg.includes('Unable to validate email address')) return 'E-mail inválido.'
  if (msg.toLowerCase().includes('email')) return 'Verifique o e-mail informado.'
  return msg
}
