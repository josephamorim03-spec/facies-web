#!/usr/bin/env node
/**
 * `if (!token)` no cliente é uma condição SEMPRE VERDADEIRA — e por isso mata a
 * função inteira.
 *
 * `lib/auth.ts:29` devolve string vazia **de propósito**, e o docstring dele
 * explica: a sessão vive num cookie httpOnly que o BFF lê e converte em
 * `Authorization`. O token nunca chega ao JavaScript, e nunca vai chegar.
 * `getAuthToken()` só existe para casar a assinatura de `authHeader()`.
 *
 * ## O que isso já custou, medido em 2026-09-05
 *
 * Quatro componentes estavam mortos em produção, cada um com um sintoma
 * diferente e nenhum deles um erro:
 *
 * - `preferencias/page.tsx` — CINCO guards. A tela não gravava nada: nem meta
 *   semanal, nem compromisso, nem a semana padrão.
 * - `QuickNoteModal` — respondia *"Faça login para salvar a nota"* a quem
 *   estava logado há horas.
 * - `AttemptHistoryModal` — o efeito nunca corria, e o histórico abria vazio.
 * - `RevisaoDiaLauncher` — `router.push("/login")` no botão da Semana Final,
 *   para todo mundo.
 *
 * Nenhum teste pegava, porque a falha não lança: ela RETORNA CEDO. A tela fica
 * exatamente igual, o clique não faz nada, e o console fica limpo.
 *
 * ## O que este guard permite
 *
 * Token que vem de OUTRO lugar — da URL (`reset-password`, `verify-email`,
 * `descadastrar`) ou do request no servidor (`app/api/**`) — é legítimo e pode
 * ser vazio de verdade. O guard só olha arquivos de cliente que tiram o token
 * de `getAuthToken()` ou de `useAuthToken()`.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZES = ["src/app", "src/components", "src/features"];
const EXTENSOES = new Set([".ts", ".tsx"]);
const IGNORAR = new Set(["node_modules", ".next", "generated", "api"]);

/** O token vem do cofre httpOnly? Só aí a condição é sempre verdadeira. */
const DO_COFRE = /\b(?:useAuthToken\(\)|getAuthToken\(\))/;

/**
 * `!token` em QUALQUER posicao, e nao so' logo depois do `if (`.
 *
 * ⚠️ A versao anterior exigia `if\s*\(\s*!\s*token` -- o `!token` tinha de
 * ser a PRIMEIRA condicao. Em 2026-09-10 isto passou verde por baixo dela:
 *
 *     if (!isError || !token || !stem || !alternatives) return;
 *
 * Era o efeito que chama a IA do `QuickNoteModal`. O guard imprimiu
 * "nenhum guard morto", o lint passou, a CI passou nos seis jobs, e o
 * recurso nascia morto -- o modal abria manual, exatamente como antes.
 * Guard que so' ve' a primeira condicao ve' uma fracao dos casos, e a
 * fracao que ele nao ve' e' a que ninguem revisa.
 *
 * O lookahead no fim e' o que separa `!token` de `!tokenResolved`, que e' o
 * padrao CERTO e nao pode reprovar.
 */
const GUARD_MORTO = /!\s*token(?![A-Za-z0-9_])/;

/**
 * A segunda forma, achada em 2026-09-10 pela PR #78: `token` como
 * OPERANDO de verdade, sem nenhum `!`.
 *
 *     const ativo = Boolean(ehModoProva && chave && token);
 *
 * Mata o efeito do mesmo jeito, e este guard nao via nada -- ele so'
 * procurava negacao. O hook das edicoes da prova ficou morto: medido no
 * log da API, a tela pediu `availability`, `topics` e `facets` e NENHUMA
 * vez `exam-editions`.
 *
 * ⚠️ Nao casa `token` passado como ARGUMENTO (`me(token)`,
 * `useEdicoesDaProva({ token, ... })`), que e' legitimo e esta' em toda a
 * base: o BFF poe o cookie e a chamada funciona. O que mata e' usar o
 * valor como CONDICAO.
 */
const OPERANDO_MORTO = /&&\s*token\s*[)&]|\btoken\s*&&/;

const FORMAS = [
  ["negacao", GUARD_MORTO],
  ["operando", OPERANDO_MORTO],
];

function arquivosSob(raiz) {
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz, { withFileTypes: true }).flatMap((entrada) => {
    const alvo = path.join(raiz, entrada.name);
    if (entrada.isDirectory()) return IGNORAR.has(entrada.name) ? [] : arquivosSob(alvo);
    return EXTENSOES.has(path.extname(entrada.name)) ? [alvo] : [];
  });
}

const reprovas = [];
for (const arquivo of RAIZES.flatMap(arquivosSob)) {
  const fonte = fs.readFileSync(arquivo, "utf8");
  if (!DO_COFRE.test(fonte)) continue;
  for (const [indice, linha] of fonte.split(/\r?\n/).entries()) {
    if (linha.trimStart().startsWith("//") || linha.trimStart().startsWith("*")) continue;
    for (const [forma, padrao] of FORMAS) {
      if (padrao.test(linha)) {
        reprovas.push(`${arquivo}:${indice + 1}  (${forma})`);
        break;
      }
    }
  }
}

// ⚠️ Autoteste antes do veredito: guard que itera precisa PROVAR que iterou,
// senao um regex quebrado imprime verde sobre uma arvore inteira.
const CASOS = [
  ["if (!token) return;", true],
  ["if (!token || !id) return;", true],
  ["if (!isError || !token || !stem) return;", true],
  ["  if (!a && !token) return;", true],
  ["if (!tokenResolved || !id) return;", false],
  ["if (!tokenResolved) return;", false],
  ["const cabecalho = bearer(token);", false],
  // A forma da #78, e as suas vizinhas.
  ["const ativo = Boolean(ehModoProva && chave && token);", true],
  ["  const ok = token && chave;", true],
  ["  if (a && token && b) return;", true],
  ["useEdicoesDaProva({ token, pronto: tokenResolved });", false],
  ["const r = await analyzeSimulationErrors(token, corpo);", false],
  ["const ativo = Boolean(ehModoProva && chave && pronto);", false],
];
const falhas = CASOS.filter(
  ([linha, esperado]) => FORMAS.some(([, padrao]) => padrao.test(linha)) !== esperado,
);
if (falhas.length) {
  console.error(
    "Autoteste do guard de token REPROVOU -- o regex nao ve o que diz ver:\n"
      + falhas.map(([linha]) => `  ${linha}`).join("\n"),
  );
  process.exit(1);
}

if (reprovas.length) {
  console.error(
    "Guard de token morto — a condicao e SEMPRE verdadeira e mata a funcao:\n"
      + reprovas.map((linha) => `  ${linha}`).join("\n")
      + "\n\n`getAuthToken()` retorna \"\" por desenho (lib/auth.ts:29): a sessao vai"
      + "\npor cookie httpOnly e o token nunca chega ao JavaScript. Tire a condicao."
      + "\nSe voce precisa esperar o cliente montar, use `tokenResolved`.",
  );
  process.exit(1);
}

console.log(
  `Token: nenhum guard morto em cliente que le do cofre httpOnly`
    + ` (${RAIZES.flatMap(arquivosSob).length} arquivos, ${CASOS.length} casos no autoteste).`,
);
