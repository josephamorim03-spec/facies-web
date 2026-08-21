export function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function IconGear({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* Engrenagem em degraus de 2px: nucleo quadrado e quatro dentes retos.
          O path anterior era o do lucide — oito curvas de Bezier num icone de
          16px, que o navegador resolve em cinza borrado. */}
      <rect x="9" y="9" width="6" height="6" />
      <path d="M10 3h4v3h-4zM10 18h4v3h-4zM3 10h3v4H3zM18 10h3v4h-3z" fill="currentColor" stroke="none" />
      <path d="M6 6h3v3H6zM15 6h3v3h-3zM6 15h3v3H6zM15 15h3v3h-3z" />
    </svg>
  );
}

export function IconChart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="7" y1="20" x2="7" y2="12" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="17" y1="20" x2="17" y2="5" />
    </svg>
  );
}

export function IconRoutine({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* Mostrador QUADRADO. O circulo era o mesmo do lucide, e num icone de
          24px ele e a unica curva suave da barra inteira. */}
      <rect x="3" y="3" width="18" height="18" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  );
}

export function IconMenu({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
