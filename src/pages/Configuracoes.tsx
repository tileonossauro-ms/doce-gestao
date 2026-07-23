import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { getJanelaAnalise, getPercentuaisPadrao, JANELAS_ANALISE, setJanelaAnalise, setPercentuaisPadrao } from '@/lib/config'
import { parseNum } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function Configuracoes() {
  const { user } = useAuth()
  const [nome, setNome] = useState((user?.user_metadata?.nome as string | undefined) ?? '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  const padrao = getPercentuaisPadrao()
  const [indireto, setIndireto] = useState(padrao.indireto.toString())
  const [margem, setMargem] = useState(padrao.margem.toString())
  const [taxas, setTaxas] = useState(padrao.taxas.toString())
  const [janela, setJanela] = useState(getJanelaAnalise().toString())

  async function salvarPerfil() {
    setSalvandoPerfil(true)
    const { error } = await supabase.auth.updateUser({ data: { nome: nome.trim() } })
    setSalvandoPerfil(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success('Perfil salvo!')
  }

  function salvarPercentuais() {
    setPercentuaisPadrao({
      indireto: parseNum(indireto) || 0,
      margem: parseNum(margem) || 0,
      taxas: parseNum(taxas) || 0,
    })
    toast.success('Percentuais padrão salvos! Serão usados em novas receitas.')
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
          <Button onClick={salvarPerfil} disabled={salvandoPerfil}>
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
          <div className="grid grid-cols-3 gap-3">
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
          </div>
          <Button onClick={salvarPercentuais}>
            <Save /> Salvar percentuais
          </Button>
        </CardContent>
      </Card>

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
            value={janela}
            onValueChange={(v) => { setJanela(v); setJanelaAnalise(Number(v)); toast.success('Janela de análise salva!') }}
          >
            <SelectTrigger id="cfg-janela" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JANELAS_ANALISE.map((d) => <SelectItem key={d} value={String(d)}>Últimos {d} dias</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}
