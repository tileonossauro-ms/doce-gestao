/** Mascote do Doce Gestão — um cupcake parado, em SVG (sem imagem externa).
 *  Usado como "personagem" das dicas e da ajuda, para dar cara amigável. */
export default function Cupcake({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/* forminha */}
      <path d="M8.5 17h15l-1.6 10.4a1.6 1.6 0 0 1-1.6 1.35h-8.6a1.6 1.6 0 0 1-1.6-1.35z" fill="#e6b075" />
      <path d="M11.2 17l-1.3 11.5M16 17l-.2 11.7M20.8 17l1.3 11.5" stroke="#cf9457" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      {/* cobertura */}
      <path d="M16 4.2c-3.6 0-6.3 2.6-6.5 5.6-1.6.4-2.8 1.7-2.8 3.4C6.7 15 7.8 16.2 9.3 16.4c.5 1.3 1.8 2.2 3.3 2.2.9 0 1.7-.3 2.4-.9.6.6 1.5.9 2.4.9 1.5 0 2.8-.9 3.3-2.2 1.5-.2 2.6-1.4 2.6-3.2 0-1.7-1.2-3-2.8-3.4C22.3 6.8 19.6 4.2 16 4.2z" fill="#f7a8c4" />
      {/* brilho */}
      <path d="M12.5 9.2c.6-1 1.7-1.8 3-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
      {/* cereja */}
      <circle cx="16" cy="4.4" r="2.2" fill="#e0455e" />
      <path d="M16 2.3c.6-1 1.7-1.2 2.5-.8" stroke="#4a7c3f" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  )
}
