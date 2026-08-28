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
    label:
      "text-marcaDisplay sem tamanho grande — o acento de display so vale a 24px+ (WCAG texto grande, piso 3:1)",
    // `--color-marca-display` compra ~50% mais separacao da tinta EM TROCA do
    // piso de 3:1, que so se aplica a texto grande. Em 14px ele vira uma
    // violacao de contraste que nenhum gate de token pega: o
    // `check-contrast-tokens` mede a COR, e a cor esta certa — quem erra e' o
    // tamanho em que ela foi escrita. Este e o unico lugar onde os dois se
    // encontram.
    //
    // O `allow` e' que carrega a regra: a linha passa se tiver um tamanho de
    // 2xl para cima, em qualquer breakpoint.
    pattern: /\btext-marcaDisplay\b/,
    allow: /text-(?:2xl|3xl|4xl|5xl|6xl|7xl)|(?:sm|md|lg|xl):text-(?:2xl|3xl|4xl|5xl|6xl|7xl)/,
    catches: 'className="text-sm text-marcaDisplay"',
    ignores: 'className="text-3xl text-marcaDisplay"',
    // O `allow` exige a cor e o tamanho na MESMA linha, e isso nao cobre os dois
    // sitios legitimos que existem hoje — em ambos o tamanho e' real, so' nao
    // esta' na mesma linha:
    //
    //   - no `h1` da home o tamanho vive no elemento PAI (`text-4xl/[1.45]`
    //     ... `sm:text-5xl/[1.45]`) e a cor num `<span>` interno;
    //   - no wordmark a cor sai de uma variavel escolhida pelo MESMO `size`
    //     que escolhe a escala, uma linha acima.
    //
    // Alargar o regex para "duas linhas acima" seria adivinhacao, e aceitar a
    // conjuncao no nivel do ARQUIVO seria pior: um arquivo que tem um titulo
    // grande em algum lugar passaria a poder usar a cor em 12px em qualquer
    // outro. Isencao nominal, com o tamanho conferido a mao, e' o que o resto
    // deste arquivo ja faz — e ela nao enfraquece a regra para os outros 300
    // arquivos, que e' de onde viria o uso acidental.
    exempt: new Map([
      ["src/app/page.tsx", "h1 da home: 36px/48px semibold, tamanho no elemento pai"],
      ["src/components/FaciesWordmark.tsx", "size=lg: 24/30px semibold, escolhido junto com a escala"],
    ]),
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
    // `full` SAIU desta alternacao e ganhou regra propria logo abaixo. Ele nao
    // e' "fora da escala": e' um valor que o sistema admite num caso nomeado.
    pattern: /\brounded-(?:[tblr]{1,2}-)?(?:none|sm|md|lg|xl|2xl|3xl)\b|\brounded-\[/,
    catches: 'className="px-2 rounded-lg"',
    ignores: 'className="px-2 rounded-control"',
  },
  {
    label:
      "pilula em elemento CLICAVEL — o handoff diz: pilula e rotulo, botao e retangulo; controle usa rounded-control",
    /**
     * A regra nova do handoff de design, e ela nao e' "raio cheio e proibido".
     * E' mais fina que isso:
     *
     *   > Pilula e rotulo, botao e retangulo. Raio cheio so em etiquetas NAO
     *   > clicaveis ("gratis · sem cadastro", economia no Pix). Todo controle
     *   > usa --raio de 3px, inclusive os atalhos de prova.
     *
     * Antes, `rounded-full` estava na mesma alternacao dos raios fora de escala
     * e era barrado em todo lugar — o que impedia a etiqueta que o proprio
     * design pede. Barrar o caso legitimo empurra quem escreve para a isencao
     * nominal, e isencao e o que este arquivo passa o tempo todo tentando nao
     * acumular.
     *
     * O `allow` deixa passar a linha que NAO tem marca de interatividade. E uma
     * heuristica de linha, nao analise de arvore: se o elemento e o `rounded-full`
     * moram na mesma linha — que e' o caso normal em JSX — ela acerta. Um botao
     * que quebre a tag e a classe em linhas diferentes escapa, e por isso a
     * regra e' um piso contra a reincidencia distraida, nao uma prova.
     */
    pattern: /\brounded-full\b/,
    allow: /^(?!.*(?:<button|<a[\s>]|<Link|onClick|role="button"|role='button')).*$/,
    catches: '<button className="rounded-full px-3">Filtrar</button>',
    ignores: '<span className="rounded-full px-3 py-1">gratis · sem cadastro</span>',
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

// Conta as isencoes POR REGRA junto com as globais. A linha dizia
// `EXEMPT.size`, que e' so' o mapa global — e ele esta vazio. Com quatro
// isencoes nominais vivas no arquivo (duas de versal, duas de acento de
// display), o resumo anunciava "0 isencoes" com toda a confianca. Guard que
// subnotifica a propria area descoberta e o mesmo defeito que a isencao caduca
// que este arquivo ja aprendeu a barrar logo acima.
const isencoes =
  EXEMPT.size + RULES.reduce((total, regra) => total + (regra.exempt?.size ?? 0), 0);

console.log(
  `Geometria do sistema: ${RULES.length} regras, nenhum valor fora da escala de token (${isencoes} isencoes nominais).`,
);
