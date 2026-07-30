"use client";

/**
 * Ícone da Kros: um núcleo com cinco conexões irradiando.
 *
 * Os raios e os ângulos dos nós são deliberadamente irregulares — uma estrela
 * simétrica leria como algo fixo, e o que a Kros faz é se ajustar ao aluno.
 *
 * A animação não percorre os traços: um arco circunda o ícone e cada nó
 * responde no instante em que ele passa, o que mantém o movimento na borda,
 * longe do texto que está sendo lido. Toda ela é CSS (keyframes em
 * `globals.css` + `pathLength="100"` nos traços), então o bloco global de
 * `prefers-reduced-motion` desliga tudo sem precisar de gate em JS.
 */

export type KrosGlyphMotion =
  /** Loop ambiente: uma volta do arco a cada 24s. */
  | "ambient"
  /** Uma volta única, de apresentação (abertura do menu). */
  | "wake"
  /** Arco contínuo, enquanto algo é montado. */
  | "busy"
  /** Sem movimento. */
  | "still";

type KrosGlyphProps = {
  className?: string;
  motion?: KrosGlyphMotion;
};

const CORE = { cx: 12.1, cy: 12.2, r: 2 };

const NODES = [
  { key: "a", cx: 4.7, cy: 8.5, r: 1.35 },
  { key: "b", cx: 11.3, cy: 4.3, r: 1.1 },
  { key: "c", cx: 19.3, cy: 8.1, r: 1.3 },
  { key: "d", cx: 6.7, cy: 18.7, r: 1.2 },
  { key: "e", cx: 18.5, cy: 17.9, r: 1.4 },
] as const;

export function KrosGlyph({ className = "", motion = "ambient" }: KrosGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`kros-glyph ${className}`}
      data-kros-motion={motion}
      aria-hidden="true"
      focusable="false"
    >
      {/* Elos definidos do núcleo para o nó, para crescerem de dentro para fora. */}
      {NODES.map((node, index) => (
        <path
          key={node.key}
          className={`kg-link kg-l${index + 1}`}
          pathLength="100"
          d={`M${CORE.cx} ${CORE.cy} L${node.cx} ${node.cy}`}
        />
      ))}
      {/* Uma corda entre dois nós periféricos: quebra a leitura de estrela. */}
      <path
        className="kg-link kg-chord"
        pathLength="100"
        d={`M${NODES[0].cx} ${NODES[0].cy} L${NODES[1].cx} ${NODES[1].cy}`}
      />
      <circle className="kg-orbit" cx="12" cy="12" r="10.5" pathLength="100" />
      {NODES.map((node) => (
        <circle
          key={node.key}
          className={`kg-node kg-n-${node.key}`}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
        />
      ))}
      <circle className="kg-core" cx={CORE.cx} cy={CORE.cy} r={CORE.r} />
    </svg>
  );
}
