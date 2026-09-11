#!/usr/bin/env node
/**
 * Módulo grande só pode ENCOLHER. Catraca, não teto fixo.
 *
 * ## Por que este arquivo existe aqui
 *
 * Esta catraca vivia em `scripts/check_architecture_invariants.py`, no repositório
 * do backend, cobrindo `app/` e `web/src`. Quando o frontend saiu para cá
 * (07/09/2026), a metade dele ficou **sem casa**: os seis tetos de `web/src`
 * foram removidos de lá e nada os substituía. Por alguns dias estes arquivos
 * puderam crescer sem que nada reclamasse — que é exatamente o que a catraca
 * existe para impedir.
 *
 * Está em Node, e não em Python, porque este repositório é Node: um passo de CI
 * que instalasse Python só para contar linhas seria custo sem retorno.
 *
 * ## Por que catraca e não teto redondo
 *
 * Um teto de mil linhas deixaria seis arquivos vermelhos no primeiro dia, e um
 * gate que nasce vermelho é um gate que as pessoas aprendem a ignorar. A catraca
 * congela a dívida no tamanho de HOJE e cobra só a direção: encolher passa,
 * crescer reprova.
 *
 * ⚠️ **Encolher também reprova**, pedindo que o número desça. Sem isso o espaço
 * reconquistado fica livre para ser reocupado depois, e a catraca vira enfeite.
 *
 * ## O segundo dente
 *
 * `TETO_DE_ARQUIVO_NOVO` impede a fuga óbvia: dividir 1.500 linhas em dois
 * arquivos de 750 não é refatorar, e sem ele a catraca premiaria isso.
 *
 * ## Como mexer nos números
 *
 * - encolheu? Baixe o valor aqui — o próprio guard diz o número novo na saída.
 * - precisa crescer? Não há allowlist, de propósito. Extraia módulo, ou mude a
 *   linha com justificativa no PR: o diff fica visível na revisão, que é o ponto.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/**
 * O tamanho congelado de cada módulo grande. Só desce.
 *
 * Estes seis vieram da catraca do backend, onde foram registrados em 31/08/2026
 * com esta justificativa: o frontend tinha 93k linhas, 40% da base, e podia
 * crescer sem limite. Não era falta de guard — `npm run lint` encadeia dez
 * verificadores de CONTEÚDO (mojibake, tokens, vocabulário, import de valor em
 * client). Nenhum deles olha TAMANHO.
 */
// ⚠️ ESTA TABELA E' A SEGUNDA COPIA. A primeira e'
// `_LINE_CEILINGS` em `krosmed/scripts/check_architecture_invariants.py`, no
// repositorio do backend, e as duas medem os MESMOS arquivos de `src/`.
//
// Enquanto o frontend viver nos dois lugares elas vao divergir -- foi o que
// aconteceu entre 08/09 e 11/09, com esta congelada e a outra a andar. Quando a
// Vercel apontar para ca' e o `krosmed/web` sair do faciesapp, a outra deixa de
// medir `web/src` e esta fica a unica. Ate' la', quem mexer num destes arquivos
// atualiza as DUAS.
const TETOS = {
  "src/app/admin/question-bank/_components/QuestionsManager.tsx": 1401,
  // 2026-09-11: 1217 -> 1053. DESCE 164 -- a diferenca entre o que este repo
  // congelou em 08/09 e o que o arquivo e' hoje. A `BottomActionBar` e a saida
  // de UI que nunca foi renderizada sairam nesse intervalo.
  "src/app/banco/page.tsx": 1048,
  // 2026-09-11: 1526 -> 1516. DESCE, e o teto tem de acompanhar: espaco
  // reconquistado que fica sem teto e' espaco que volta a ser ocupado. Saiu com
  // a troca dos botoes a mao pelo primitivo `Button` (faciesapp #90-#93).
  "src/app/banco/sessao/[sessionId]/_components/FocusedQuestion.tsx": 1516,
  // Entra na catraca em 2026-09-11, vindo de fora dela: as 40 linhas da barra
  // de acao no primitivo `Button` (alvo de 44px, onde o botao a mao dava ~38)
  // atravessaram o limite padrao de 1000. Registado em vez de dividido, pela
  // mesma razao que no backend: dividir um componente de mil linhas por causa
  // de quarenta seria divisao pelo NUMERO, nao por responsabilidade.
  "src/app/banco/sessao/[sessionId]/_components/PostExamReview.tsx": 997,
  // 2026-09-11: 1328 -> 1343. As 15 linhas sao a derivacao do item que o
  // modal de card passa a IA e a condicao que esconde o toggle de correcao
  // guiada quando ela nao existe (faciesapp #76).
  "src/app/banco/sessao/[sessionId]/page.tsx": 1343,
  "src/lib/api/domains/question-bank-admin.ts": 1885,
  // 2026-09-11: 1147 -> 1159. Campos novos do contrato da sessao, vindos da
  // leva do seletor de prova (faciesapp #82, #83, #87).
  "src/lib/api/domains/question-bank/types.ts": 1159,
};

const TETO_DE_ARQUIVO_NOVO = 1000;

/** Onde a catraca mede, e o que conta como código escrito à mão. */
const RAIZES = [["src", [".ts", ".tsx"]]];

/**
 * ⚠️ `src/lib/api/generated/` é saída do `openapi-typescript`: 19 mil linhas que
 * ninguém escreveu e ninguém vai extrair. Medi-las faria a catraca reprovar por
 * um arquivo que só muda quando o backend muda.
 */
const PREFIXOS_EXCLUIDOS = ["src/lib/api/generated/"];

/**
 * `split` sobre o texto, e não contagem de `\n`: arquivo sem quebra final
 * contaria uma linha a menos e a catraca acusaria encolhimento que não houve.
 */
function contarLinhas(caminho) {
  const texto = readFileSync(caminho, "utf8");
  return texto.length === 0 ? 0 : texto.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").length;
}

function varrer(dir, sufixos, saida = []) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada === ".next") continue;
    const cheio = join(dir, entrada);
    if (statSync(cheio).isDirectory()) varrer(cheio, sufixos, saida);
    else if (sufixos.some((s) => entrada.endsWith(s))) saida.push(cheio);
  }
  return saida;
}

function modulosMedidos() {
  const encontrados = [];
  for (const [raiz, sufixos] of RAIZES) {
    let base;
    try {
      base = join(RAIZ, raiz);
      statSync(base);
    } catch {
      continue;
    }
    for (const caminho of varrer(base, sufixos)) {
      const rel = relative(RAIZ, caminho).split(sep).join("/");
      if (PREFIXOS_EXCLUIDOS.some((p) => rel.startsWith(p))) continue;
      encontrados.push(rel);
    }
  }
  return encontrados.sort();
}

const problemas = [];

for (const [rel, teto] of Object.entries(TETOS).sort()) {
  let atual;
  try {
    atual = contarLinhas(join(RAIZ, rel));
  } catch {
    problemas.push(
      `${rel} está na catraca e não existe mais — se foi removido ou renomeado, tire a linha de TETOS`,
    );
    continue;
  }
  if (atual > teto) {
    problemas.push(
      `${rel} cresceu para ${atual} linhas (teto ${teto}, +${atual - teto}). ` +
        "O teto só desce: extraia módulo em vez de subir o número",
    );
  } else if (atual < teto) {
    problemas.push(
      `${rel} encolheu para ${atual} linhas (teto ${teto}): ` +
        `baixe o teto em TETOS para ${atual} e trave o ganho`,
    );
  }
}

for (const rel of modulosMedidos()) {
  if (rel in TETOS) continue;
  const atual = contarLinhas(join(RAIZ, rel));
  if (atual > TETO_DE_ARQUIVO_NOVO) {
    problemas.push(
      `${rel} nasceu com ${atual} linhas, acima do limite de ${TETO_DE_ARQUIVO_NOVO} ` +
        "para módulo fora da catraca — divida por responsabilidade, ou registre o teto com justificativa no PR",
    );
  }
}

if (problemas.length > 0) {
  console.error("\n[catraca de tamanho] o módulo grande só pode encolher:\n");
  for (const p of problemas) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}
console.log(`[ok] catraca de tamanho: ${modulosMedidos().length} módulos medidos, nenhum cresceu.`);
