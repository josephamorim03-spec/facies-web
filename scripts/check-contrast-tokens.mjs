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
  "--area-go",
  "--area-ped",
  "--area-mp",
  "--area-cg",
  "--area-cm",
  "--area-ou",
  "--area-ob",
  "--area-full-exam",
];

/** Tokens usados como FUNDO de texto. */
const BACKGROUND = ["--color-paper", "--color-surface", "--color-surface-muted", "--amber-tint"];

/** Pares invertidos: tinta clara sobre preenchimento forte. */
const INVERTED = [
  ["--color-primary-ink", "--color-primary"],
  ["--color-accent-ink", "--color-accent"],
];

/** Limite de componente (WCAG 1.4.11): borda contra o que ela separa. */
const COMPONENT = [
  ["--color-edge", "--color-surface"],
  ["--color-edge", "--color-paper"],
  ["--color-edge", "--color-surface-muted"],
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
      if (!a || !b) continue;
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
}

const combos = (FOREGROUND.length * BACKGROUND.length + INVERTED.length + COMPONENT.length) * 2;
if (failures > 0) {
  console.error(`\nContraste: ${failures} de ${combos} pares abaixo do minimo.`);
  process.exit(1);
}
console.log(`Contraste: ${combos} pares de token dentro do minimo.`);
