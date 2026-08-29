import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NAV_GROUPS_CONFIG,
  NAV_ITEMS,
  getActiveChildLabel,
  getIntentChildren,
  getStudentPageTitle,
  getStudentRoute,
  isNavChildActive,
  isNavItemActive,
} from "../../src/lib/navConfig.ts";

function findItem(href) {
  return NAV_ITEMS.find((candidate) => candidate.href === href) ?? null;
}

function childOf(pathname, href) {
  return getIntentChildren(pathname).find((child) => child.href === href) ?? null;
}

test("a navegacao e tres destinos, na ordem da barra", () => {
  // Eram cinco. A Rota saiu porque a tela dela era uma PERGUNTA — quanto tempo
  // voce tem, com que energia — e a pergunta morreu: o tamanho do dia agora vem
  // do calendario e do comportamento observado, e aparece como contexto da
  // proxima acao no Hoje.
  // Os flashcards saíram da barra em 2026-08-29 — a feature ficou de molho,
  // atrás de `NEXT_PUBLIC_FLASHCARDS` (default "0"). A rota `/cards` continua
  // existindo e redirecionando; o que sumiu foi o caminho até ela.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/hoje", "/banco", "/evolucao"],
  );
  // Uma barra so: no mobile e a barra inferior, no desktop o menu bar. Sem
  // divisorias, porque nao ha mais agrupamento por pergunta.
  assert.equal(NAV_GROUPS_CONFIG.length, 1);
});

test("nem Kros nem Rota sobrevivem como rotulo de menu", () => {
  // "Kros" saiu primeiro (virou nome interno do motor); "Rota" saiu depois, com
  // a propria aba. Os dois enderecos continuam 308 para o Hoje, entao ninguem
  // que os tenha salvos cai em 404 — mas nenhum dos dois volta ao menu.
  const labels = NAV_ITEMS.map((item) => item.shortLabel);
  assert.deepEqual(labels, ["Início", "Banco", "Perfil"]);
  assert.equal(findItem("/kros"), null);
  assert.equal(findItem("/rota"), null);
});

test("each tab owns its children", () => {
  assert.deepEqual(
    getIntentChildren("/hoje").map((child) => child.href),
    ["/hoje", "/cronograma"],
  );
  assert.deepEqual(
    getIntentChildren("/banco").map((child) => child.href),
    ["/banco", "/banco/historico"],
  );
  assert.deepEqual(
    getIntentChildren("/cards").map((child) => child.href),
    ["/cards", "/cards/registros"],
  );
  assert.deepEqual(
    getIntentChildren("/evolucao").map((child) => child.href),
    ["/evolucao", "/preferencias"],
  );
  // `/rota` nao e mais destino nenhum: sem intencao, sem filhos.
  assert.deepEqual(getIntentChildren("/rota"), []);
});

test("a child route lights its parent tab", () => {
  assert.equal(isNavItemActive("/cronograma", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/banco/historico", findItem("/banco")), true);
  // A linha de `/cards/registros` saiu com a aba: `findItem("/cards")` devolve
  // `null` agora, e o teste passaria a afirmar sobre um item que nao existe.
  // Volta junto com a feature, quando `NEXT_PUBLIC_FLASHCARDS` voltar a "1".
  assert.equal(isNavItemActive("/preferencias", findItem("/evolucao")), true);
  assert.equal(isNavItemActive("/banco/sessao/abc", findItem("/banco")), true);
});

test("the deeper child wins over its prefix sibling", () => {
  // Casamento por prefixo simples acenderia as DUAS abas em `/banco/historico`,
  // porque ele tambem casa com `/banco`. Vence o alvo mais longo.
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco/historico")), true);
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco")), false);
  assert.equal(isNavChildActive("/cards/registros", childOf("/cards/registros", "/cards/registros")), true);
  assert.equal(isNavChildActive("/cards/registros", childOf("/cards/registros", "/cards")), false);
  // E o pai continua ganhando quando a rota e' exatamente ele.
  assert.equal(isNavChildActive("/banco", childOf("/banco", "/banco")), true);
});

test("page titles come from the child, not from the parent tab", () => {
  // Com o Cronograma morando sob INICIO, herdar o rotulo do pai chamaria a tela
  // de "Inicio" — que e exatamente o problema que o programa de design existe
  // para resolver: menu, titulo e URL dizendo a mesma coisa.
  assert.equal(getStudentPageTitle("/hoje"), "Hoje");
  assert.equal(getStudentPageTitle("/cronograma"), "Cronograma");
  assert.equal(getStudentPageTitle("/banco/historico"), "Histórico");
  assert.equal(getStudentPageTitle("/cards/registros"), "Pesquisar");
  assert.equal(getStudentPageTitle("/preferencias"), "Preferências");
});

test("renderable legacy routes keep activating their canonical destination", () => {
  assert.equal(isNavItemActive("/today", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/semana", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/desempenho", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/estatisticas/relatorio", findItem("/evolucao")), true);
  assert.equal(isNavItemActive("/rotina-e-metas", findItem("/evolucao")), true);
});

test("unreachable 308 aliases are deliberately absent from the nav registry", () => {
  // Guarda contra a regressao inversa. Estes caminhos sao `permanent: true` em
  // next.config.js e nao tem diretorio em src/app: o 308 resolve ANTES do
  // roteamento de arquivos, entao o aluno nunca para neles. Readiciona-los faz
  // o menu carregar estado ativo para URL que ninguem alcanca.
  //
  // `/kros` entrou nesta lista quando a tela virou `/rota`; `/rota` entrou
  // quando a propria aba morreu junto com a pergunta de tempo e energia.
  for (const path of [
    "/praticar",
    "/revisar",
    "/acompanhar",
    "/planejamento",
    "/caderno",
    "/kros",
    "/rota",
  ]) {
    assert.equal(getStudentRoute(path), null, `${path} deveria ser 308, nao rota do registro`);
  }
});

test("the active child label names the current section", () => {
  assert.equal(getActiveChildLabel("/cronograma"), "Cronograma");
  assert.equal(getActiveChildLabel("/banco/historico"), "Histórico");
  assert.equal(getActiveChildLabel("/rota"), null);
});

test("the route registry owns canonical bank sessions", () => {
  const route = getStudentRoute("/banco/sessao/abc");
  assert.equal(route?.intent, "bank");
  assert.equal(route?.icon, "bank");
  assert.equal(route?.warmup, "bank");
});
