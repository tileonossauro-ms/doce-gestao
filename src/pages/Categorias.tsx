import { Tags } from 'lucide-react'
import CadastroSimples from '@/components/CadastroSimples'

export default function Categorias() {
  return (
    <CadastroSimples
      tabela="categorias_financeiras"
      titulo="Categorias"
      singular="Categoria"
      icone={Tags}
      campos={[
        { key: 'nome', label: 'Nome', tipo: 'text', placeholder: 'Ex.: Marketing' },
        {
          key: 'tipo',
          label: 'Tipo',
          tipo: 'select',
          opcoes: [
            { value: 'fixo', label: 'Fixo' },
            { value: 'variavel', label: 'Variável' },
            { value: 'ambos', label: 'Ambos' },
          ],
        },
        {
          key: 'grupo_dre',
          label: 'Onde entra no resultado (DRE)',
          tipo: 'select',
          opcoes: [
            { value: 'custo_variavel', label: 'Custo variável (muda conforme você vende)' },
            { value: 'custo_fixo', label: 'Custo fixo (paga todo mês)' },
            { value: 'deducao', label: 'Dedução da venda (taxa, imposto, comissão)' },
            { value: 'investimento', label: 'Investimento (equipamento, reforma)' },
          ],
          ajuda: 'Define em qual linha do relatório de resultado (DRE) esta categoria aparece.',
        },
        {
          key: 'conta_no_dre',
          label: 'Entra na conta do DRE?',
          tipo: 'boolean',
          padrao: 'true',
          ajuda: 'Deixe "Sim" na dúvida. Use "Não" só para não contar duas vezes (ex.: "Ingrediente" já entra pelo custo da receita).',
        },
      ]}
    />
  )
}
