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

/** `if (!token` / `if (!token ||` / `if (!token &&`. */
const GUARD_MORTO = /if\s*\(\s*!\s*token\s*[)|&]/;

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
    if (GUARD_MORTO.test(linha)) {
      reprovas.push(`${arquivo}:${indice + 1}`);
    }
  }
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

console.log("Token: nenhum guard morto em cliente que le do cofre httpOnly.");
