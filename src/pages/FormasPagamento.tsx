import { CreditCard } from 'lucide-react'
import CadastroSimples from '@/components/CadastroSimples'

export default function FormasPagamento() {
  return (
    <CadastroSimples
      tabela="formas_pagamento"
      titulo="Formas de pagamento"
      singular="Forma de pagamento"
      icone={CreditCard}
      campos={[{ key: 'nome', label: 'Nome', tipo: 'text', placeholder: 'Ex.: Pix' }]}
    />
  )
}
