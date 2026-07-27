import { useState } from 'react'

/** Mascote do Doce Gestão — usa a imagem em public/cupcake.png (a arte enviada pela Waléria).
 *  Enquanto o arquivo não existir, não mostra nada (sem ícone quebrado). */
export default function Cupcake({ className = 'size-6' }: { className?: string }) {
  const [erro, setErro] = useState(false)
  if (erro) return null
  return (
    <img
      src="/cupcake.png"
      alt=""
      aria-hidden="true"
      className={`${className} object-contain`}
      onError={() => setErro(true)}
    />
  )
}
