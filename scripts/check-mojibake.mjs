#!/usr/bin/env node

/**
 * Guard de codificação: mojibake e pontuação de código que virou letra acentuada.
 *
 * ## Por que a regra de URL foi generalizada
 *
 * Este guard JÁ TINHA duas regras para "acento onde deveria haver `?`", escritas
 * depois de quatro URLs quebradas antes de 2026-08-03. As duas eram estreitas
 * demais e deixaram passar a quinta, que custou o cadastro por e-mail inteiro:
 *
 *   RecaptchaCheckbox.tsx: "https://www.google.com/recaptcha/api.js<acento>render=explicit"
 *
 * - a regra do `${...}` exigia interpolação logo depois do acento — não havia;
 * - a regra do `/api/...` exigia caminho começando em `/api/` — a URL era
 *   externa, do Google.
 *
 * O script nunca carregava, `window.grecaptcha` nunca existia, o widget nunca
 * renderizava, o token ficava vazio e o botão "Criar conta" não fazia nada, sem
 * nenhuma mensagem na tela. `tsc` e ESLint não pegam: é string válida.
 *
 * As duas regras estreitas foram substituídas por UMA propriedade verificável:
 * **URL em código-fonte é ASCII.** Domínio internacionalizado entra em punycode,
 * caminho e query entram percent-encoded. Não existe URL legítima com acento no
 * meio, então a regra não precisa adivinhar onde o `?` deveria estar.
 *
 * ## O autoteste roda SEMPRE, antes da varredura
 *
 * As regras estreitas passaram meses verdes sem nunca terem sido exercitadas
 * contra o caso que deveriam pegar — um guard exercitado só contra a árvore
 * limpa é indistinguível de um guard vazio. Aqui os casos `catches`/`ignores`
 * rodam a cada invocação (custa ~1ms) e derrubam o processo se alguma regra
 * deixar de morder. Não há como esvaziar este arquivo e continuar verde.
 *
 * ⚠️ Os exemplos ruins são escritos com escapes (`\u00F3`), nunca com o
 * caractere literal: este arquivo está dentro de `web/scripts`, que ele próprio
 * varre.
 */

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

/** Onde a regra de mojibake vale: código servido ao aluno. */
const ROOTS_MOJIBAKE = [
  path.join(cwd, "src"),
  path.join(cwd, "scripts"),
  path.join(cwd, "..", "app", "static"),
  path.join(cwd, "..", "app"),
];

/**
 * Onde a regra de URL vale: TUDO, inclusive `tests/`.
 *
 * A isenção de `tests/` existe só para mojibake, porque a Fácies tem código que
 * conserta mojibake e os testes dele precisam de texto corrompido de verdade
 * como fixture. Nenhum teste precisa de uma URL com acento.
 */
const ROOTS_URL = [
  ...ROOTS_MOJIBAKE,
  path.join(cwd, "tests"),
  path.join(cwd, "..", "scripts"),
  path.join(cwd, "..", "tests"),
];

const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".css", ".md", ".py"]);
const EXCLUDE_DIRS = new Set(["__pycache__", ".venv", "node_modules", ".next", "__snapshots__"]);
const EXCLUDE_DIRS_MOJIBAKE = new Set([...EXCLUDE_DIRS, "tests"]);

/** Escape deliberado, linha a linha, para fixture de corrupção proposital. */
const MARCADOR_FIXTURE = "mojibake-fixture";

const REGRAS_MOJIBAKE = [
  // C3 80-BF = bytes de continuação UTF-8 (mojibake); C3 C0-FF = acento legítimo.
  { label: "UTF-8/Latin-1 corruption (C3 range)", regex: /\u00C3[\u0080-\u00BF]/u },
  { label: "UTF-8/Latin-1 corruption (C2 range)", regex: /\u00C2[\u0080-\u00BF]/u },
  { label: "UTF-8/Latin-1 punctuation corruption", regex: /\u00E2[\u0080-\u00BF]/u },
  { label: "Emoji corruption", regex: /\u00F0\u0178/u },
  { label: "Unicode replacement character (U+FFFD)", regex: /\uFFFD/u },
];

/**
 * URL literal com caractere fora de ASCII.
 *
 * Substitui as duas regras estreitas anteriores (`...${`, `/api/...=`). Casa a
 * URL inteira e depois procura qualquer caractere > U+007F dentro dela, o que
 * dispensa adivinhar em que posição a pontuação foi corrompida.
 */
const URL_REGEX = /(?:https?:)?\/\/[^\s"'`)\]}>,;]+|\/api\/[^\s"'`)\]}>,;]+/gu;

function urlComCaractereNaoAscii(linha) {
  for (const match of linha.matchAll(URL_REGEX)) {
    const url = match[0];
    for (const caractere of url) {
      if (caractere.codePointAt(0) > 0x7f) {
        return { url, caractere };
      }
    }
  }
  return null;
}

function problemasNaLinha(linha, { verificarMojibake }) {
  if (linha.includes(MARCADOR_FIXTURE)) return [];
  const achados = [];

  if (verificarMojibake) {
    for (const regra of REGRAS_MOJIBAKE) {
      if (regra.regex.test(linha)) {
        achados.push(regra.label);
        break;
      }
    }
  }

  const urlSuja = urlComCaractereNaoAscii(linha);
  if (urlSuja) {
    achados.push(
      `URL com caractere nao-ASCII ${JSON.stringify(urlSuja.caractere)} — ` +
        "URL em codigo e ASCII (punycode no dominio, percent-encoding no resto). " +
        "Quase sempre e' pontuacao de codigo que virou letra acentuada.",
    );
  }

  return achados;
}

// ── Autoteste: roda SEMPRE, antes de varrer ────────────────────────────────
// Cada regra com um caso que ela PRECISA reprovar e um que ela PRECISA liberar.

const DEVEM_REPROVAR = [
  // A linha exata que derrubou o cadastro por e-mail.
  '  script.src = "https://www.google.com/recaptcha/api.js\u00F3render=explicit";',
  // Os casos antigos, que as regras estreitas pegavam: continuam pegos.
  "  const u = `/api/items\u00F3${params}`;",
  '  const u = "/api/items\u00F3status=aberto";',
  // Acento no domínio.
  '  fetch("https://ex\u00E2mple.com/x");',
  // Mojibake clássico: `ç` UTF-8 lido como Latin-1.
  '  const t = "aten\u00C3\u00A7\u00C3\u00A3o";',
];

const DEVEM_PASSAR = [
  '  script.src = "https://www.google.com/recaptcha/api.js?render=explicit";',
  '  fetch("https://accounts.google.com/gsi/client");',
  "  const u = `/api/items?${params}`;",
  '  const u = "http://127.0.0.1:8000/auth/session?remember=1";',
  // A armadilha: `Ã` sozinho é português correto, não mojibake.
  "  // NÃO faça isso; AÇÃO é o PADRÃO",
  '  const rotulo = "Última revisão — informação, atenção e coração";',
  // URL ASCII com acento no comentário ao lado: só a URL é regra.
  '  fetch("https://api.exemplo.com/v1"); // configuração padrão',
  `  const t = "x";  // ${MARCADOR_FIXTURE}`,
];

function autoteste() {
  const falhas = [];
  for (const linha of DEVEM_REPROVAR) {
    if (problemasNaLinha(linha, { verificarMojibake: true }).length === 0) {
      falhas.push(`NAO PEGOU: ${linha.trim()}`);
    }
  }
  for (const linha of DEVEM_PASSAR) {
    const achados = problemasNaLinha(linha, { verificarMojibake: true });
    if (achados.length > 0) {
      falhas.push(`FALSO POSITIVO em ${linha.trim()} -> ${achados.join("; ")}`);
    }
  }
  if (falhas.length > 0) {
    console.error("Autoteste do guard de mojibake FALHOU — o guard nao morde:");
    for (const falha of falhas) console.error(`- ${falha}`);
    process.exit(1);
  }
}

// ── Varredura ──────────────────────────────────────────────────────────────

function walk(dir, excluir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (excluir.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (exts.has(path.extname(full).toLowerCase())) out.push(full);
    }
  }
  return out;
}

function coletar() {
  /** @type {Map<string, { verificarMojibake: boolean }>} */
  const arquivos = new Map();
  for (const root of ROOTS_URL) {
    for (const file of walk(root, EXCLUDE_DIRS)) {
      if (!arquivos.has(file)) arquivos.set(file, { verificarMojibake: false });
    }
  }
  for (const root of ROOTS_MOJIBAKE) {
    for (const file of walk(root, EXCLUDE_DIRS_MOJIBAKE)) {
      arquivos.set(file, { verificarMojibake: true });
    }
  }
  return arquivos;
}

autoteste();

const arquivos = coletar();
const findings = [];

for (const [filePath, opcoes] of arquivos) {
  const text = fs.readFileSync(filePath, "utf8");
  text.split(/\r?\n/).forEach((line, idx) => {
    for (const label of problemasNaLinha(line, opcoes)) {
      findings.push({
        file: path.relative(cwd, filePath).replaceAll(path.sep, "/"),
        line: idx + 1,
        label,
        text: line.trim(),
      });
    }
  });
}

if (findings.length > 0) {
  console.error("Found likely encoding corruption:");
  for (const hit of findings) {
    console.error(`- ${hit.file}:${hit.line} (${hit.label})`);
    console.error(`  ${hit.text}`);
  }
  process.exit(1);
}

console.log(
  `Mojibake check passed (${arquivos.size} arquivos; autoteste: ` +
    `${DEVEM_REPROVAR.length} reprovados, ${DEVEM_PASSAR.length} liberados).`,
);
