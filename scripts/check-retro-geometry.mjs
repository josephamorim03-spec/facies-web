import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = join(ROOT, "src");

/**
 * A geometria do sistema vive nos TOKENS. Este gate existe porque o valor solto
 * nao volta de uma vez — ele volta um componente por vez, e cada um parece
 * inofensivo sozinho.
 *
 * O alvo mudou com a identidade Facies; o mecanismo nao. Antes o sistema negava
 * a curva inteira (KROS/DOS: todos os --radius-* eram 0) e o gate proibia
 * strokeLinecap/Linejoin="round", <circle> e rx/ry em <rect>. Agora o sistema
 * TEM raio e TEM penumbra, os dois em token — entao o que o gate persegue e o
 * valor que escapa da escala, nao a curva em si. As quatro regras puramente
 * retro sairam; o historico do git as guarda se precisarem voltar.
 *
 * Duas regras sobreviveram inalteradas por coincidencia feliz: o §5.4 do
 * documento de design tambem proibe spinner generico e animacao decorativa.
 *
 * As isencoes sao nominais, nunca por padrao de caminho.
 */
const EXEMPT = new Map();

const RULES = [
  {
    label:
      "escala tipografica — o piso da Facies e 11px (`text-micro`); nano/pico/femto sao 10/9/8px",
    // Estas classes ja sairam do `tailwind.config.js` na varredura da tipografia,
    // e e' por isso que a regra importa: sem definicao, `text-nano` nao gera CSS
    // nenhum. O texto herda o tamanho do pai em silencio, e a tela fica "quase
    // certa" — o pior modo de falha, porque nao parece quebrada.
    pattern: /\btext-(?:nano|pico|femto)\b/,
    catches: 'className="text-nano text-muted"',
    ignores: 'className="text-micro text-muted"',
  },
  {
    label:
      "versal fora do rotulo — o versal desta identidade vive so em `.paper-eyebrow` (11px mono)",
    // O versal espacado e' idioma de console. Na Facies ele existe em um lugar
    // so: o rotulo de 11px em mono com tracking .08em, que e' exatamente o que
    // `.paper-eyebrow` ja e'. Eram 254 usos antes da varredura; sobraram os
    // isentos abaixo, que sao siglas.
    pattern: /(?<!to)(?<!\.to)\buppercase\b/,
    catches: 'className="text-xs font-semibold uppercase tracking-wide"',
    ignores: 'className="paper-eyebrow uppercase"',
    // Casos em que o versal e' ORTOGRAFIA e nao estilo: "CM" e a sigla de
    // Clinica Medica, e escreve-la em caixa baixa nao a torna mais sobria, torna
    // errada. Isencao nominal por arquivo, nunca por padrao de caminho.
    exempt: new Map([
      ["src/components/AreaIcon.tsx", "sigla de area: versal e ortografia, nao decoracao"],
      [
        "src/app/cronograma/_components/calendar/CalendarGrid.tsx",
        "sigla de area no chip do dia, mesma razao do AreaIcon",
      ],
    ]),
    // Linhas que carregam o rotulo canonico passam: a regra proibe o versal
    // AVULSO, nao o rotulo.
    allow: /paper-eyebrow/,
  },
  {
    label: "animate-pulse — carregamento tem uma linguagem so (LoadBar/paper-skeleton)",
    pattern: /animate-pulse/,
    catches: 'className="h-16 animate-pulse"',
    ignores: 'className="h-16 paper-skeleton"',
  },
  {
    label:
      "animate-spin — o §5.4 proibe spinner generico; carregamento usa LoadBar",
    pattern: /animate-spin/,
    catches: 'className="h-5 w-5 animate-spin"',
    ignores: '<LoadBar label="Carregando" />',
  },
  {
    label:
      "sombra fora da escala — a penumbra agora existe, mas mora em shadow-soft/shadow-overlay",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/,
    catches: 'className="border shadow-sm"',
    ignores: 'className="border shadow-overlay"',
  },
  {
    label:
      "raio fora da escala — use rounded-control/surface/hero, que leem os --radius-*",
    pattern: /\brounded-(?:[tblr]{1,2}-)?(?:none|sm|md|lg|xl|2xl|3xl|full)\b|\brounded-\[/,
    catches: 'className="px-2 rounded-lg"',
    ignores: 'className="px-2 rounded-control"',
  },
  {
    label:
      "drop-shadow(...) — penumbra fora do token; use var(--soft-shadow) ou var(--overlay-shadow)",
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
  {
    label:
      'branco/preto literal em style (color: "white") — escapa da classe E do gate de contraste',
    pattern: /:\s*["'](?:white|black|#fff{1,2}|#000{1,3})["']/i,
    catches: 'style={{ color: "white" }}',
    ignores: 'style={{ color: "var(--color-paper)" }}',
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
  const passaPeloAllow = rule.allow?.test(rule.ignores) ?? false;
  if (rule.pattern.test(rule.ignores) && !passaPeloAllow) {
    console.error(`Regra larga demais: pega o contraexemplo — ${rule.label}`);
    process.exit(1);
  }
}

/**
 * Isencao que aponta para arquivo inexistente e um buraco silencioso.
 *
 * Aconteceu: `KrosGlyph.tsx` ficou isento aqui depois de ser deletado, e a linha
 * final continuava anunciando "1 isencoes nominais" com confianca. Uma isencao
 * caduca nao protege nada e ainda mente sobre o tamanho da area descoberta.
 */
for (const [mapa, origem] of [
  [EXEMPT, "global"],
  ...RULES.filter((r) => r.exempt).map((r) => [r.exempt, r.label]),
]) {
  for (const rel of mapa.keys()) {
    if (!existsSync(join(ROOT, rel))) {
      console.error(`Isencao caduca (${origem}): ${rel} nao existe mais`);
      process.exit(1);
    }
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
      if (!rule.pattern.test(line)) continue;
      if (rule.exempt?.has(rel)) continue;
      if (rule.allow?.test(line)) continue;
      failures.push(`${rel}:${index + 1} ${rule.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Geometria do sistema violada:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(
  `Geometria do sistema: ${RULES.length} regras, nenhum valor fora da escala de token (${EXEMPT.size} isencoes nominais).`,
);
