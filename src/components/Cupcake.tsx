/** Mascote do Doce Gestão — cupcake sorridente, em SVG (sem imagem externa, nítido em qualquer tamanho).
 *  Inspirado na arte enviada pela Waléria: cobertura rosa, cereja com folha, granulado,
 *  forminha azul de bolinhas e carinha feliz. Usado como "personagem" das dicas. */
export default function Cupcake({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* forminha azul com bolinhas */}
      <path d="M17 37h30l-2.6 18.2A2.6 2.6 0 0 1 41.8 57.5H22.2a2.6 2.6 0 0 1-2.6-2.3z" fill="#a9cbe6" />
      <path d="M17 37h30l-.6 4H17.6z" fill="#8fb8db" />
      <g fill="#eaf3fb">
        <circle cx="24" cy="46" r="1.5" /><circle cx="32" cy="49" r="1.5" /><circle cx="40" cy="46" r="1.5" />
        <circle cx="28" cy="53" r="1.3" /><circle cx="37" cy="53" r="1.3" />
      </g>
      {/* bracinhos e perninhas */}
      <path d="M17 41c-4 1-6 4-6.5 6.5M47 41c4 1 6 4 6.5 6.5" stroke="#5b3a2e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M27 57v4M37 57v4" stroke="#5b3a2e" strokeWidth="2.6" strokeLinecap="round" />
      {/* cobertura rosa (3 rodadas de chantilly) */}
      <path d="M32 9c-6.5 0-11.5 4.3-11.9 9.6-2.9.5-5.1 2.7-5.1 5.6 0 2.6 1.8 4.8 4.3 5.5.5 2.6 3 4.6 6 4.6 1.6 0 3-.6 4.1-1.5 1.1.9 2.5 1.5 4.1 1.5 1.6 0 3-.6 4.1-1.5 1.1.9 2.5 1.5 4.1 1.5 3 0 5.5-2 6-4.6 2.5-.7 4.3-2.9 4.3-5.5 0-2.9-2.2-5.1-5.1-5.6C43.5 13.3 38.5 9 32 9z" fill="#f6a5c0" />
      <path d="M24 16.5c1.2-2.2 3.6-3.8 6.4-4.1M40 30.5c2 .1 3.7-.6 4.7-1.9" stroke="#fbc7db" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" />
      {/* granulado */}
      <g strokeWidth="2.2" strokeLinecap="round">
        <path d="M26 22l1.5 1.5" stroke="#7cc0f0" /><path d="M35 19l1.5-1" stroke="#f7c948" />
        <path d="M39 24l1.4 1.2" stroke="#7bd38b" /><path d="M30 26l-1.4 1.2" stroke="#f2915b" />
        <path d="M33 24.5l1 1.5" stroke="#c98be6" />
      </g>
      {/* cereja com cabinho e folha */}
      <circle cx="40" cy="11" r="4.2" fill="#d64157" />
      <circle cx="38.6" cy="9.7" r="1.2" fill="#f08a9b" opacity=".8" />
      <path d="M40 7c1-3.2 3.4-4.6 6-4.2" stroke="#7a4a2b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M45 3c2.4-.6 4.2.6 4.4 2.6-2 .8-3.8.2-4.4-2.6z" fill="#5aa84a" />
      {/* carinha */}
      <g fill="#4a2f26">
        <ellipse cx="26.5" cy="32" rx="1.9" ry="2.4" /><ellipse cx="37.5" cy="32" rx="1.9" ry="2.4" />
      </g>
      <circle cx="27.2" cy="31.2" r=".6" fill="#fff" /><circle cx="38.2" cy="31.2" r=".6" fill="#fff" />
      <circle cx="22.5" cy="35" r="2.2" fill="#f6a5c0" opacity=".7" /><circle cx="41.5" cy="35" r="2.2" fill="#f6a5c0" opacity=".7" />
      {/* boca sorrindo (de onde sai o balão) */}
      <path d="M28.5 35.5c1.2 2.2 5.8 2.2 7 0a3.6 3.6 0 0 1-7 0z" fill="#7a3b3b" />
      <path d="M29.5 36.2c1 .9 4 .9 5 0" fill="#e98aa0" />
    </svg>
  )
}
