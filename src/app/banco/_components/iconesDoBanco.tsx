/**
 * Os icones desenhados a mao do Banco.
 *
 * Sao SVG proprios, e nao da biblioteca: o sistema pede tracado reto de 2px sem
 * ponta arredondada, e o `lucide-react` traz `strokeLinecap="round"` em tudo.
 *
 * Sairam de `banco/page.tsx` quando a catraca de tamanho reprovou o arquivo. A
 * catraca so desce, entao a resposta certa a ela e extrair, nao subir o teto --
 * e icone sem estado e a extracao mais barata que havia ali.
 */

export function IconBookOpen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H7a3 3 0 0 0-3 3V5.5Z" />
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20" />
      <path d="M8 7h8" />
      <path d="M8 11h7" />
    </svg>
  );
}

export function IconTrophy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M5 5H3v2a4 4 0 0 0 4 4" />
      <path d="M19 5h2v2a4 4 0 0 1-4 4" />
    </svg>
  );
}

export function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}
