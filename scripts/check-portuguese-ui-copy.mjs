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
  // O BACKEND tambem escreve texto que o aluno le: `title`, `rationale`,
  // `cta_label` e `priority_reason` sao renderizados como vieram. Este checker
  // vigiava so `web/src`, e por isso "Continuar sessao" chegou a tela — o
  // acento faltava do lado de fora do seu alcance.
  path.join(cwd, "..", "app", "services"),
];

// Módulos cujas strings são PADRÃO DE CASAMENTO, não copy: marcador lido de PDF
// ("QUESTAO ALTERNATIVA"), token de classificação ("nao usar"), lista de
// stopwords ("na questao"). Acentuá-los quebra o parser em silêncio — foi o que
// aconteceu na primeira passada deste checker sobre o backend, e o teste que
// pegou foi a leitura humana do diff, não a suíte.
const PATTERN_MODULES = [
  "exam_import_parser",
  "_question_analysis",
  "turbo_card_selection_strategy",
];

const EXCLUDE_DIRS = new Set([
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".py"]);

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
  // A lista era escolhida a dedo, e por isso so pegava o que alguem lembrou de
  // adicionar: "Comecar bloco curto" chegou a tela do aluno com o gate verde.
  // O criterio para entrar aqui e simples — palavra acentuada que aparece em
  // texto que o aluno LE. Nao entra jargao de codigo: o extrator ja descarta
  // token isolado sem espaco, entao `area` como identificador nao dispara.
  ["comecar", "começar"],
  ["comeca", "começa"],
  ["comecou", "começou"],
  ["inicio", "início"],
  ["ultimo", "último"],
  ["ultima", "última"],
  ["proximo", "próximo"],
  ["unico", "único"],
  ["unica", "única"],
  ["media", "média"],
  ["dificil", "difícil"],
  ["facil", "fácil"],
  ["rapido", "rápido"],
  ["grafico", "gráfico"],
  ["graficos", "gráficos"],
  ["relatorio", "relatório"],
  ["saude", "saúde"],
  ["clinico", "clínico"],
  ["clinica", "clínica"],
  ["numero", "número"],
  ["decisao", "decisão"],
  ["condicao", "condição"],
  ["atencao", "atenção"],
  ["periodo", "período"],
  ["nivel", "nível"],
  ["horario", "horário"],
  ["duvida", "dúvida"],
  ["memoria", "memória"],
  ["pratica", "prática"],
  ["disponivel", "disponível"],
  ["ultimos", "últimos"],
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
  // Chave de React montada por interpolacao (`relatorio-skeleton-${idx}`):
  // sem espaco, nunca aparece na tela, e nao e frase. A regra de
  // identificador logo abaixo nao a pegava so por causa do `${`.
  if (/^[a-z0-9.${}-]+$/i.test(text) && !/\s/.test(text)) return true;
  if (/[\\/]/.test(text)) return true;
  if (/_/.test(text)) return true;
  if (/\.(spec|test|tsx?|jsx?|mjs|css|png|jpg|jpeg|webp)$/i.test(text)) return true;
  if (/^[a-z0-9.-]+$/i.test(text) && !/\s/.test(text)) return true;
  return false;
}

// O QUE ESTA DENTRO DE `${...}` E EXPRESSAO, NUNCA TEXTO DE TELA.
//
// `calc(100% - ${pct(media + desvio)})` fazia o guard acusar `media -> media`
// apontando para um NOME DE VARIAVEL. E como a cadeia do `npm run lint` e
// `&&`, essa acusacao derrubava o eslint do repositorio inteiro por uma
// palavra que nenhum leitor ve.
//
// A lista de identificadores em `shouldSkipCandidate` (className, activeTab,
// question_patch) tratava o mesmo problema caso a caso, e por isso nunca
// terminava. Esta regra trata pela FORMA.
//
// A substituicao preserva as strings literais que existam dentro da
// interpolacao: em `${cond ? "media" : ""}` a copy continua sendo medida.
// Sem isso a correcao abriria um buraco em vez de fechar um.
function semExpressoes(text) {
  return text.replace(/\$\{[^}]*\}/g, (trecho) =>
    (trecho.match(/(["'])(?:\\.|(?!\1).)*\1/g) || []).join(" "));
}

function findTerms(text) {
  const hits = [];
  const limpo = semExpressoes(text);
  for (const [raw, replacement] of forbidden) {
    const regex = new RegExp(`(^|[^A-Za-zÀ-ÿ])(${raw})(?=$|[^A-Za-zÀ-ÿ])`, "iu");
    if (regex.test(limpo)) hits.push(`${raw} -> ${replacement}`);
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
  if (PATTERN_MODULES.some((mod) => relative.includes(mod))) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  // Docstring de Python e documentacao para QUEM MANTEM o codigo, nao copy
  // para o aluno — e ela cita nome de variavel (`Date.now() - inicio`) e nome
  // de heuristica ("comeca com o tema") que acentuar QUEBRARIA. Rastrear o
  // bloco inteiro importa: ignorar so a linha de abertura deixaria a prosa das
  // linhas seguintes disparando.
  const isPython = relative.endsWith(".py");
  let openDelimiter = null;
  lines.forEach((line, index) => {
    if (isPython) {
      if (openDelimiter) {
        if (line.includes(openDelimiter)) openDelimiter = null;
        return;
      }
      const opener = /("""|''')/.exec(line);
      if (opener) {
        const rest = line.slice(opener.index + opener[1].length);
        if (!rest.includes(opener[1])) openDelimiter = opener[1];
        return;
      }
    }
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
