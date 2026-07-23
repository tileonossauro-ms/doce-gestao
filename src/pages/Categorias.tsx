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
      ]}
    />
  )
}
