import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = join(ROOT, "src");

/**
 * A geometria do sistema e reta: 1px duro, ponta e junta em esquadria, forma
 * retangular. Este gate existe porque a curva nao volta de uma vez — ela volta
 * um icone por vez, e cada um parece inofensivo sozinho.
 *
 * As duas isencoes sao nominais, nunca por padrao de caminho: uma marca pode ter
 * curva (e o assunto dela), e a biblioteca de icones ja e pixelada na origem.
 */
const EXEMPT = new Map([
  ["src/components/KrosGlyph.tsx", "marca: a orbita E o desenho, nao um descuido herdado"],
]);

const RULES = [
  {
    label: 'strokeLinecap="round" — ponta arredondada e a assinatura do lucide',
    pattern: /strokeLinecap=["{]?["']?round/,
    catches: '<path strokeLinecap="round" />',
    ignores: '<path strokeLinecap="butt" />',
  },
  {
    label: 'strokeLinejoin="round" — junta arredondada idem',
    pattern: /strokeLinejoin=["{]?["']?round/,
    catches: '<path strokeLinejoin="round" />',
    ignores: '<path strokeLinejoin="miter" />',
  },
  {
    label: "<circle> — indicador vira <rect>; desenho redondo vira poligono em degraus",
    pattern: /<circle[\s>]/,
    catches: '<circle cx="12" cy="12" r="3" />',
    ignores: '<rect x="10" y="10" width="4" height="4" />',
  },
  {
    label: "rx/ry em <rect> — canto arredondado dentro de SVG escapa do --radius-*",
    pattern: /\br[xy]=["{]\s*["']?(?!0["'}\s])/,
    catches: '<rect rx="2" />',
    ignores: '<rect x="3" y="3" width="4" height="4" />',
  },
  {
    label: "animate-pulse — carregamento tem uma linguagem so (LoadBar/paper-skeleton)",
    pattern: /animate-pulse/,
    catches: 'className="h-16 animate-pulse"',
    ignores: 'className="h-16 paper-skeleton"',
  },
  {
    label: "animate-spin — nada girava em 1997; use LoadBar",
    pattern: /animate-spin/,
    catches: 'className="h-5 w-5 animate-spin"',
    ignores: '<LoadBar label="Carregando" />',
  },
  {
    label: "shadow-sm/md/lg/xl — penumbra borrada; a sobreposicao usa shadow-overlay (4px duros)",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/,
    catches: 'className="border shadow-sm"',
    ignores: 'className="border shadow-overlay"',
  },
  {
    label: "rounded-* — todos os --radius-* sao 0; a classe promete curva que o sistema negou",
    pattern: /\brounded-(?:[tblr]-)?(?:surface|control|hero|full|md|lg|xl)\b/,
    catches: 'className="px-2 rounded-control"',
    ignores: 'className="px-2 border border-edge"',
  },
  {
    label: "drop-shadow(...) — o sistema nao tem penumbra, tem borda",
    pattern: /drop-shadow\(/,
    catches: 'filter: drop-shadow(0 0 7px red)',
    ignores: 'boxShadow: var(--overlay-shadow)',
  },
  {
    label:
      "text-white/bg-white — cor fora do tema; o gate de contraste so mede token contra token",
    pattern: /\b(?:text|bg|border|ring)-white\b/,
    catches: 'className="bg-success text-white"',
    ignores: 'className="bg-success text-paper"',
  },
];

/**
 * Autoteste das regras, antes de varrer arquivo nenhum.
 *
 * Um guard que nao casa nada e um guard que nao acha nada imprimem a MESMA
 * linha verde. Foi assim que duas destas nove regras ficaram inertes sem que
 * ninguem visse: um `\\b` perdeu uma barra invertida no caminho e virou o
 * caractere de controle BACKSPACE, entao o regex passou a procurar algo que
 * nao existe em codigo-fonte.
 *
 * O par `catches`/`ignores` custa duas linhas por regra e transforma
 * "nao achei violacao" em "procurei de verdade e nao achei".
 */
for (const rule of RULES) {
  if (!rule.pattern.test(rule.catches)) {
    console.error(`Regra inerte: nao pega o proprio exemplo — ${rule.label}`);
    process.exit(1);
  }
  if (rule.pattern.test(rule.ignores)) {
    console.error(`Regra larga demais: pega o contraexemplo — ${rule.label}`);
    process.exit(1);
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(full) ? [full] : [];
  });
}

const failures = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split("\\").join("/");
  if (EXEMPT.has(rel)) continue;
  const source = readFileSync(file, "utf8");
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    // Comentario nao desenha nada, e varios explicam justamente o que saiu.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    for (const rule of RULES) {
      if (rule.pattern.test(line)) failures.push(`${rel}:${index + 1} ${rule.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Geometria retro violada:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(
  `Geometria retro: sem curva, giro ou penumbra fora das ${EXEMPT.size} isencoes nominais.`,
);
