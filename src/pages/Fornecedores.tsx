import { Truck } from 'lucide-react'
import CadastroSimples from '@/components/CadastroSimples'

export default function Fornecedores() {
  return (
    <CadastroSimples
      tabela="fornecedores"
      titulo="Fornecedores"
      singular="Fornecedor"
      icone={Truck}
      campos={[
        { key: 'nome', label: 'Nome', placeholder: 'Ex.: Atacadão' },
        { key: 'contato', label: 'Contato', placeholder: 'Telefone, WhatsApp...', obrigatorio: false },
        { key: 'observacao', label: 'Observação', placeholder: 'Opcional', obrigatorio: false },
      ]}
    />
  )
}
