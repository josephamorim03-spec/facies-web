/**
 * Classe que aponta para token INEXISTENTE não gera CSS — e não falha em nada.
 *
 * ## O caso que motivou este arquivo
 *
 * Escrevi `hover:bg-primaryStrong` no botão da busca. O token
 * `--color-primary-strong` existe em `globals.css` desde sempre, mas
 * `primaryStrong` **não tinha entrada no `tailwind.config.js`** — e sem entrada
 * o Tailwind simplesmente não emite a regra. O botão não respondia ao ponteiro,
 * em silêncio, e passou por typecheck, 6 guards, 138 testes e um build.
 *
 * É a mesma família do que esta base já registrou em outros lugares: o
 * artefato existe, o caminho não executa. Aqui a forma é a mais traiçoeira,
 * porque o CSS ausente não deixa rastro nenhum — não há erro, não há aviso, e
 * a classe continua escrita no JSX parecendo correta para sempre.
 *
 * ## Por que a heurística é o camelCase
 *
 * Os tokens desta base são camelCase (`primaryStrong`, `marcaViva`,
 * `surfaceMuted`); os utilitários nativos do Tailwind não são (`text-sm`,
 * `border-2`, `bg-white`). Então `(bg|text|border|…)-<algo com maiúscula no
 * meio>` é, com altíssima confiança, uma tentativa de usar token nosso — e se
 * ele não está no config, é erro.
 *
 * A heurística NÃO tenta validar todo utilitário: fazer isso exigiria resolver
 * o Tailwind inteiro e produziria falso positivo em cada plugin ou valor
 * arbitrário. O alvo é estreito de propósito, e cobre exatamente o buraco que
 * custou caro.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));
const require_ = createRequire(import.meta.url);
const config = require_(join(RAIZ, "tailwind.config.js"));

/** Os nomes que o Tailwind vai realmente emitir. */
function tokensDeclarados() {
  const cores = config.theme?.extend?.colors ?? {};
  const nomes = new Set();
  for (const [chave, valor] of Object.entries(cores)) {
    if (valor && typeof valor === "object") {
      for (const sub of Object.keys(valor)) nomes.add(`${chave}-${sub}`);
    } else {
      nomes.add(chave);
    }
  }
  // Escalas fora de `colors` que usam o mesmo formato de utilitário.
  for (const grupo of ["fontSize", "borderRadius", "boxShadow", "fontFamily"]) {
    for (const nome of Object.keys(config.theme?.extend?.[grupo] ?? {})) nomes.add(nome);
  }
  return nomes;
}

const DECLARADOS = tokensDeclarados();

/** Prefixos de utilitário que aceitam nome de token. */
const PREFIXOS = "bg|text|border|ring|fill|stroke|from|via|to|divide|outline|accent|caret|shadow|rounded";

/**
 * Um utilitário com camelCase no nome do token. `[a-z]+[A-Z]` é a assinatura:
 * `primaryStrong`, `marcaViva`, `surfaceMuted`. Variantes (`hover:`, `sm:`,
 * `dark:`) entram porque o utilitário vem depois delas.
 */
const PADRAO = new RegExp(`\\b(?:${PREFIXOS})-([a-z]+[A-Z][A-Za-z0-9]*)\\b`, "g");

function varrer(dir) {
  return readdirSync(dir).flatMap((entrada) => {
    const cheio = join(dir, entrada);
    if (statSync(cheio).isDirectory()) {
      return entrada === "node_modules" || entrada === ".next" ? [] : varrer(cheio);
    }
    return /\.tsx?$/.test(cheio) ? [cheio] : [];
  });
}

/**
 * Autoteste, antes de varrer arquivo nenhum.
 *
 * Guard que não casa nada e guard que não acha nada imprimem a mesma linha
 * verde. Esta base já perdeu duas regras assim — um `\b` virou caractere de
 * controle e o regex passou a procurar o que não existe em código-fonte.
 */
const PEGA = 'className="hover:bg-primaryStrong"';
const IGNORA = 'className="hover:bg-primary"';
PADRAO.lastIndex = 0;
if (!PADRAO.test(PEGA)) {
  console.error("Regra inerte: nao pega o proprio exemplo.");
  process.exit(1);
}
PADRAO.lastIndex = 0;
if (PADRAO.test(IGNORA)) {
  console.error("Regra larga demais: pega o contraexemplo.");
  process.exit(1);
}

const falhas = [];
for (const arquivo of varrer(join(RAIZ, "src"))) {
  const rel = relative(RAIZ, arquivo).split("\\").join("/");
  const fonte = readFileSync(arquivo, "utf8");
  fonte.split(/\r?\n/).forEach((linha, indice) => {
    // Comentário não gera classe nenhuma, e vários explicam justamente o token
    // que saiu.
    if (/^\s*(\/\/|\*|\/\*)/.test(linha)) return;
    PADRAO.lastIndex = 0;
    let achado;
    while ((achado = PADRAO.exec(linha)) !== null) {
      const token = achado[1];
      if (!DECLARADOS.has(token)) {
        falhas.push({ arquivo: rel, linha: indice + 1, token, trecho: achado[0] });
      }
    }
  });
}

if (falhas.length > 0) {
  console.error("Utilitario aponta para token que o tailwind.config.js NAO declara.");
  console.error("Sem entrada no config o Tailwind nao emite a regra: a classe fica");
  console.error("escrita no JSX e nao gera CSS nenhum, em silencio.\n");
  for (const f of falhas) {
    console.error(`- ${f.arquivo}:${f.linha}  ${f.trecho}   (token "${f.token}" ausente)`);
  }
  process.exit(1);
}

console.log(
  `Tokens: ${DECLARADOS.size} declarados, nenhum utilitario apontando para token inexistente.`,
);
