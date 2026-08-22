/**
 * Contraste dos tokens de cor, por produto cartesiano.
 *
 * Existe porque a versao anterior disto era uma lista de pares escolhidos a
 * mao — e ela nao tinha `muted/paper`. O par passou, o axe reprovou 22 nos de
 * /hoje com 4.47:1, e o gate so pegou o problema depois do e2e.
 *
 * Agora todo token de TEXTO e cruzado com todo token de FUNDO. Nenhuma
 * combinacao depende de alguem lembrar de adiciona-la.
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(theme) {
  const re = theme === "light" ? /:root \{([\s\S]*?)\n\}/ : /\.dark \{([\s\S]*?)\n\}/;
  const body = css.match(re)?.[1] ?? "";
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];

  // Alias por `var()`: `--area-full-exam: var(--color-primary)`. Sem resolver,
  // o token some da tabela e o par nunca e' medido — em silencio, porque o
  // `continue` la embaixo trata "nao achei" e "nao precisa" do mesmo jeito.
  for (const m of body.matchAll(/(--[\w-]+):\s*var\((--[\w-]+)\)/g)) {
    const resolved = out[m[2]];
    if (resolved) out[m[1]] = resolved;
  }
  return out;
}

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Tokens que carregam TEXTO. */
const FOREGROUND = [
  "--color-ink",
  "--color-muted",
  "--color-primary",
  "--color-accent",
  "--color-success",
  "--color-danger",
  "--color-warning",
  "--color-info",

];

/**
 * Tokens usados como FUNDO de texto.
 *
 * Os dois washes entram porque texto de verdade cai sobre eles: o dia
 * selecionado no calendario, a linha de aviso, o alvo de arrastar. Eram um
 * token so (`--amber-tint`) servindo selecao E atencao — e um palido quente nao
 * consegue dizer as duas coisas, entao metade dos 27 call sites estava errada
 * em qualquer valor unico.
 */
const BACKGROUND = [
  "--color-paper",
  "--color-surface",
  "--color-surface-muted",
  "--wash-selecao",
  "--wash-atencao",
];

/** Pares invertidos: tinta clara sobre preenchimento forte. */
const INVERTED = [
  ["--color-primary-ink", "--color-primary"],
  ["--color-accent-ink", "--color-accent"],
  // Nao ha par "tinta sobre area": cor de area deixou de ser fundo de texto
  // quando `AREA_TEXT_CLASS` foi apagado. O bucket GRAPHICAL, abaixo, e' o que
  // vale para ela — e o porque esta escrito em `lib/areaIdentity.ts`.
];

/** Limite de componente (WCAG 1.4.11): borda contra o que ela separa. */
const COMPONENT = [
  ["--color-edge", "--color-surface"],
  ["--color-edge", "--color-paper"],
  ["--color-edge", "--color-surface-muted"],
];

/**
 * Cor de area — MARCA grafica, nunca texto.
 *
 * Ela vive em ponto, barra, faixa e celula, sempre ao lado de um rotulo em
 * tinta. O rotulo carrega a informacao; a cor e' o atalho. Por isso o minimo e'
 * o de limite grafico (3:1), e nao o de texto.
 *
 * A consequencia pratica, e ela e' uma REGRA: sigla de area se escreve em
 * `text-ink`, com a cor na barra ao lado. Escrever a sigla NA cor da area exige
 * 4.5:1, e nenhuma paleta segura para daltonismo entrega isso em sete tons
 * sobre papel claro — foi exatamente onde a Okabe-Ito reprovou 29 pares.
 */
const GRAPHICAL = [
  "--area-go",
  "--area-ob",
  "--area-ped",
  "--area-mp",
  "--area-cg",
  "--area-cm",
  "--area-ou",
  "--area-full-exam",
];

const TEXT_MIN = 4.5;
const COMPONENT_MIN = 3.0;

let failures = 0;
for (const theme of ["light", "dark"]) {
  const t = tokens(theme);
  const light = tokens("light");
  const get = (name) => t[name] ?? light[name];

  for (const fg of FOREGROUND) {
    for (const bg of BACKGROUND) {
      const a = get(fg);
      const b = get(bg);
      if (!a || !b) {
        // Nao medir e' um resultado, e precisa aparecer. Antes isto era um
        // `continue` mudo: um token renomeado saia da cobertura sem ninguem ver.
        failures += 1;
        console.error(
          `${theme}: ${!a ? fg : bg} nao resolveu para uma cor — par ${fg}/${bg} NAO foi medido.`,
        );
        continue;
      }
      const r = ratio(a, b);
      if (r < TEXT_MIN) {
        failures += 1;
        console.error(
          `${theme}: ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (min ${TEXT_MIN}) — ${a} / ${b}`,
        );
      }
    }
  }
  for (const [fg, bg] of INVERTED) {
    const r = ratio(get(fg), get(bg));
    if (r < TEXT_MIN) {
      failures += 1;
      console.error(`${theme}: ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (min ${TEXT_MIN})`);
    }
  }
  for (const [fg, bg] of COMPONENT) {
    const r = ratio(get(fg), get(bg));
    if (r < COMPONENT_MIN) {
      failures += 1;
      console.error(`${theme}: ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (min ${COMPONENT_MIN})`);
    }
  }
  for (const fg of GRAPHICAL) {
    for (const bg of BACKGROUND) {
      const a = get(fg);
      const b = get(bg);
      if (!a || !b) {
        failures += 1;
        console.error(
          `${theme}: ${!a ? fg : bg} nao resolveu para uma cor — par grafico ${fg}/${bg} NAO foi medido.`,
        );
        continue;
      }
      const r = ratio(a, b);
      if (r < COMPONENT_MIN) {
        failures += 1;
        console.error(
          `${theme}: marca ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (min ${COMPONENT_MIN}) — ${a} / ${b}`,
        );
      }
    }
  }
}

const combos =
  (FOREGROUND.length * BACKGROUND.length +
    INVERTED.length +
    COMPONENT.length +
    GRAPHICAL.length * BACKGROUND.length) *
  2;
if (failures > 0) {
  console.error(`\nContraste: ${failures} de ${combos} pares abaixo do minimo.`);
  process.exit(1);
}
console.log(`Contraste: ${combos} pares de token dentro do minimo.`);
