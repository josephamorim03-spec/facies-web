/**
 * Faixa decorativa do topo da /kros. Substitui o retângulo `bg-surfaceMuted`
 * chapado por uma constelação na mesma linguagem de nós e ligações do ícone da
 * Kros, em opacidade de textura. Estilos e deriva ficam em `globals.css`
 * (`.kros-constellation`), então `prefers-reduced-motion` desliga o movimento
 * sem nenhum gate em JS.
 */
export function KrosConstellation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-52 overflow-hidden border-b border-edge bg-surfaceMuted"
    >
      <svg
        className="kros-constellation absolute inset-0 h-full w-full text-primary"
        viewBox="0 0 800 210"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g className="kc-far">
          <path className="kc-edge" d="M60 40 L180 96 L96 160 M180 96 L300 62 M300 62 L392 128" />
          <circle className="kc-node" cx="60" cy="40" r="3" />
          <circle className="kc-node" cx="180" cy="96" r="4.5" />
          <circle className="kc-node" cx="96" cy="160" r="3" />
          <circle className="kc-node" cx="300" cy="62" r="3.5" />
          <circle className="kc-node" cx="392" cy="128" r="3" />
        </g>
        <g>
          <path
            className="kc-edge"
            d="M470 46 L568 112 L500 172 M568 112 L676 70 M676 70 L752 140 M568 112 L660 178"
          />
          <circle className="kc-node" cx="470" cy="46" r="3" />
          <circle className="kc-node" cx="568" cy="112" r="5" />
          <circle className="kc-node" cx="500" cy="172" r="3" />
          <circle className="kc-node" cx="676" cy="70" r="3.5" />
          <circle className="kc-node" cx="752" cy="140" r="3" />
          <circle className="kc-node" cx="660" cy="178" r="3" />
        </g>
      </svg>
    </div>
  );
}
