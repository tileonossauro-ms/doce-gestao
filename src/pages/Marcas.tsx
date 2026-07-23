import { Tag } from 'lucide-react'
import CadastroSimples from '@/components/CadastroSimples'

export default function Marcas() {
  return (
    <CadastroSimples
      tabela="marcas"
      titulo="Marcas"
      singular="Marca"
      icone={Tag}
      campos={[
        { key: 'nome', label: 'Nome', placeholder: 'Ex.: Itambé' },
        { key: 'observacao', label: 'Observação', placeholder: 'Opcional', obrigatorio: false },
      ]}
    />
  )
}
