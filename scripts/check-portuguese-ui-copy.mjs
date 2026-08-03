#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const roots = [
  path.join(cwd, "src", "app"),
  path.join(cwd, "src", "components"),
  // `src/lib` inteiro, nao so `api/domains`: `guidanceCopy.ts` mora na raiz de
  // lib e e' a fonte UNICA do vocabulario do aluno -- ficava fora do checker,
  // que e' como "as duas finalistasó" chegou a producao sem ninguem reclamar.
  path.join(cwd, "src", "lib"),
  path.join(cwd, "scripts", "capture-design-redesign.mjs"),
];

const EXCLUDE_DIRS = new Set([
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const forbidden = [
  ["questoes", "questões"],
  ["questao", "questão"],
  ["sessoes", "sessões"],
  ["sessao", "sessão"],
  ["revisoes", "revisões"],
  ["revisao", "revisão"],
  ["analise", "análise"],
  ["correcao", "correção"],
  ["resolucao", "resolução"],
  ["proxima", "próxima"],
  ["acao", "ação"],
  ["pagina", "página"],
  ["historico", "histórico"],
  ["possivel", "possível"],
  ["voce", "você"],
  ["medico", "médico"],
  ["catalogo", "catálogo"],
  ["topico", "tópico"],
  ["nao", "não"],
];

const technicalExactValues = new Set([
  "Analise sua trajetória",
  "analise",
  "analise_questao",
  "correcao",
  "evolucao",
  "ingestao",
  "questoes",
  "resolucao-ia",
  "revisao-turbo",
  "sessao",
  "topicos",
]);

const skipLinePatterns = [
  /^\s*(\/\/|\/\*|\*|\*)/,
  /^\s*import\s/,
  /^\s*export\s+type\s/,
  /^\s*type\s/,
  /^\s*interface\s/,
];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return EXTENSIONS.has(path.extname(target)) ? [target] : [];

  const out = [];
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) stack.push(path.join(current, entry.name));
        continue;
      }
      const full = path.join(current, entry.name);
      if (EXTENSIONS.has(path.extname(full))) out.push(full);
    }
  }
  return out;
}

function candidatesFromLine(line) {
  const candidates = [];
  const literalRegex = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
  let match;
  while ((match = literalRegex.exec(line)) !== null) {
    candidates.push(match[2]);
  }

  const jsxTextRegex = />([^<>{}][^<]*?)</g;
  while ((match = jsxTextRegex.exec(line)) !== null) {
    candidates.push(match[1]);
  }

  return candidates;
}

function shouldSkipCandidate(value) {
  const text = value.trim();
  if (!text) return true;
  if (technicalExactValues.has(text)) return true;
  if (text.includes("${") && /(?:className|activeTab|question_patch|questao\.)/.test(text)) return true;
  if (/\b(border|bg|text|px|py|mt|flex|grid|rounded|hover|disabled):?-/.test(text)) return true;
  if (/[\\/]/.test(text)) return true;
  if (/_/.test(text)) return true;
  if (/\.(spec|test|tsx?|jsx?|mjs|css|png|jpg|jpeg|webp)$/i.test(text)) return true;
  if (/^[a-z0-9.-]+$/i.test(text) && !/\s/.test(text)) return true;
  return false;
}

function findTerms(text) {
  const hits = [];
  for (const [raw, replacement] of forbidden) {
    const regex = new RegExp(`(^|[^A-Za-zÀ-ÿ])(${raw})(?=$|[^A-Za-zÀ-ÿ])`, "iu");
    if (regex.test(text)) hits.push(`${raw} -> ${replacement}`);
  }
  return hits;
}

// Uma `forcingQuestion` que nao termina em `?` normalmente perdeu a pontuacao
// para uma letra -- foi assim que "separava as duas finalistasó" chegou ate a UI
// sem que lint, typecheck ou o checker de mojibake reclamassem.
const questionContract = [];
function checkQuestionContract(line, file, index) {
  const match = /forcingQuestion:\s*"([^"]*)"/.exec(line);
  if (match && !match[1].trimEnd().endsWith("?")) {
    questionContract.push({ file, line: index + 1, text: match[1] });
  }
}

const failures = [];
for (const file of roots.flatMap(walk)) {
  const relative = path.relative(cwd, file).replaceAll(path.sep, "/");
  if (relative.startsWith("src/lib/api/generated/")) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    checkQuestionContract(line, relative, index);
    if (skipLinePatterns.some((pattern) => pattern.test(line))) return;
    for (const candidate of candidatesFromLine(line)) {
      if (shouldSkipCandidate(candidate)) continue;
      const hits = findTerms(candidate);
      if (!hits.length) continue;
      failures.push({
        file: relative,
        line: index + 1,
        text: candidate.trim().replace(/\s+/g, " "),
        hits,
      });
    }
  });
}

if (questionContract.length > 0) {
  console.error("Found forcingQuestion copy that does not end with `?`:");
  for (const item of questionContract) {
    console.error(`- ${item.file}:${item.line}`);
    console.error(`  ${item.text}`);
  }
  process.exit(1);
}

if (failures.length > 0) {
  console.error("Found likely unaccented Portuguese UI copy:");
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} (${failure.hits.join(", ")})`);
    console.error(`  ${failure.text}`);
  }
  process.exit(1);
}

console.log("Portuguese UI copy check passed.");
