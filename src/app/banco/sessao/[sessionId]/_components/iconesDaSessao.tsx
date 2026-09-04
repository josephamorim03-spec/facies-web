/**
 * Os icones desenhados a mao da sessao.
 *
 * Sao SVG proprios, e nao da biblioteca: o sistema pede tracado reto de 2px sem
 * ponta arredondada, e o `lucide-react` traz `strokeLinecap="round"` em tudo.
 * Icone arredondado no meio de uma tela de papel le como enfeite.
 *
 * Sairam de `FocusedQuestion.tsx` quando a catraca de tamanho reprovou o
 * arquivo (1.642 linhas contra o teto de 1.550). Sao a extracao mais barata que
 * havia ali: nao dependem de nenhum estado da sessao.
 */

export function IconGrid({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="5" height="5"/>
      <rect x="11.5" y="3.5" width="5" height="5"/>
      <rect x="3.5" y="11.5" width="5" height="5"/>
      <rect x="11.5" y="11.5" width="5" height="5"/>
    </svg>
  );
}

export function IconMinus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M4 10h12" />
    </svg>
  );
}

export function IconMaximize({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M7 3H3v4" />
      <path d="M13 3h4v4" />
      <path d="M7 17H3v-4" />
      <path d="M13 17h4v-4" />
    </svg>
  );
}

export function IconSettings({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <rect x="8" y="8" width="4" height="4" />
      <path d="M10 2.5v2" />
      <path d="M10 15.5v2" />
      <path d="m4.7 4.7 1.4 1.4" />
      <path d="m13.9 13.9 1.4 1.4" />
      <path d="M2.5 10h2" />
      <path d="M15.5 10h2" />
      <path d="m4.7 15.3 1.4-1.4" />
      <path d="m13.9 6.1 1.4-1.4" />
    </svg>
  );
}

export function IconFlag({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M5 17V4" />
      <path d="M5 4h8l-1 3 1 3H5" />
    </svg>
  );
}

export function IconStar({ filled, className = "h-4 w-4" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="m10 2.8 2.1 4.2 4.6.7-3.3 3.2.8 4.6-4.2-2.2-4.2 2.2.8-4.6-3.3-3.2 4.6-.7L10 2.8Z" />
    </svg>
  );
}
