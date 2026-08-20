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

test("navigation is five destinations, in tab-bar order", () => {
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/hoje", "/banco", "/rota", "/cards", "/evolucao"],
  );
  // Uma barra so: no mobile e a barra inferior, no desktop o menu bar. Sem
  // divisorias, porque nao ha mais agrupamento por pergunta.
  assert.equal(NAV_GROUPS_CONFIG.length, 1);
});

test("Kros is no longer a menu label", () => {
  // Virou marca do motor (status bar, boot). O destino se chama Rota, que e o
  // que a tela entrega e o vocabulario que o backend ja usa.
  const labels = NAV_ITEMS.map((item) => item.shortLabel);
  assert.deepEqual(labels, ["Início", "Banco", "Rota", "Cards", "Perfil"]);
  assert.equal(findItem("/kros"), null);
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
  // A Rota nao tem filhos: e uma tela so.
  assert.deepEqual(getIntentChildren("/rota"), []);
});

test("a child route lights its parent tab", () => {
  assert.equal(isNavItemActive("/cronograma", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/banco/historico", findItem("/banco")), true);
  assert.equal(isNavItemActive("/cards/registros", findItem("/cards")), true);
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
  assert.equal(getStudentPageTitle("/rota"), "Rota");
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
  // `/kros` entrou nesta lista quando a tela virou `/rota`.
  for (const path of ["/praticar", "/revisar", "/acompanhar", "/planejamento", "/caderno", "/kros"]) {
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
