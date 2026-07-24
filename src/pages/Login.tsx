import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CakeSlice, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Modo = 'login' | 'registro' | 'recuperar'

export default function Login() {
  const { session, loading } = useAuth()
  const [modo, setModo] = useState<Modo>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Já logado? vai para o painel.
  if (!loading && session) return <Navigate to="/painel" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      if (modo === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        toast.success('Se o e-mail existir, enviamos um link para redefinir a senha.')
        setModo('login')
      } else if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        toast.success('Bem-vindo(a) de volta!')
      } else {
        if (senha !== confirmarSenha) throw new Error('As senhas não coincidem.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        })
        if (error) throw error
        // Com "Confirmar e-mail" desligado no Supabase, o signUp já devolve sessão e a pessoa
        // entra direto. Com a confirmação ligada, não há sessão — aí avisamos pra checar o e-mail.
        if (data.session) toast.success('Conta criada! Bem-vindo(a) ao Doce Gestão. 🍰')
        else toast.success('Conta criada! Confirme pelo link enviado ao seu e-mail para entrar.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Algo deu errado.'
      toast.error(traduzErro(msg))
    } finally {
      setEnviando(false)
    }
  }

  const descricao =
    modo === 'login' ? 'Entre na sua conta'
    : modo === 'registro' ? 'Crie sua conta gratuita'
    : 'Recupere o acesso à sua conta'

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CakeSlice className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Doce Gestão</CardTitle>
          <CardDescription>{descricao}</CardDescription>
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

            {modo !== 'recuperar' && (
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {modo === 'registro' && (
              <div className="space-y-2">
                <Label htmlFor="confirmar">Confirmar senha</Label>
                <Input
                  id="confirmar"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  minLength={6}
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" />}
              {modo === 'login' ? 'Entrar' : modo === 'registro' ? 'Criar conta' : 'Enviar link de recuperação'}
            </Button>
          </form>

          {modo === 'login' && (
            <p className="mt-3 text-center text-sm">
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setModo('recuperar')}
              >
                Esqueci minha senha
              </button>
            </p>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {modo === 'login' ? (
              <>Ainda não tem conta?{' '}
                <BotaoLink onClick={() => setModo('registro')}>Criar conta</BotaoLink>
              </>
            ) : (
              <>Já tem conta?{' '}
                <BotaoLink onClick={() => setModo('login')}>Entrar</BotaoLink>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function BotaoLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="font-medium text-primary underline-offset-4 hover:underline"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Traduz as mensagens de erro mais comuns do Supabase para português simples. */
function traduzErro(msg: string): string {
  if (msg.includes('As senhas não coincidem')) return msg
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.'
  if (msg.includes('Password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.'
  if (msg.includes('Unable to validate email address')) return 'E-mail inválido.'
  if (msg.toLowerCase().includes('email')) return 'Verifique o e-mail informado.'
  return msg
}
