import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NAV_GROUPS_CONFIG,
  getActiveChildLabel,
  getIntentChildren,
  getStudentPageTitle,
  getStudentRoute,
  isNavItemActive,
} from "../../src/lib/navConfig.ts";

function findItem(href) {
  for (const group of NAV_GROUPS_CONFIG) {
    const item = group.items.find((candidate) => candidate.href === href);
    if (item) return item;
  }
  return null;
}

test("navigation exposes the five student intentions", () => {
  const hrefs = NAV_GROUPS_CONFIG.flatMap((group) => group.items.map((item) => item.href));
  assert.deepEqual(hrefs, ["/hoje", "/praticar", "/revisar", "/acompanhar", "/planejar"]);
});

test("legacy module routes activate their owning intention", () => {
  assert.equal(isNavItemActive("/banco-de-questoes", findItem("/praticar")), true);
  assert.equal(isNavItemActive("/caderno", findItem("/revisar")), true);
  assert.equal(isNavItemActive("/estatisticas", findItem("/acompanhar")), true);
  assert.equal(isNavItemActive("/cronograma", findItem("/planejar")), true);
});

// Sessões é onde se retoma uma sessão inacabada, então pertence a Praticar.
// Simulados continua sendo um filtro de Sessões (ver provas/page.tsx), não um
// destino irmão.
test("Praticar owns sessions and exam aliases", () => {
  const item = findItem("/praticar");
  assert.ok(item);
  assert.equal(isNavItemActive("/revisoes", item), true);
  assert.equal(isNavItemActive("/revisoes?tipo=provas", item), true);
  assert.equal(isNavItemActive("/provas", item), true);
  assert.equal(isNavItemActive("/estatisticas", item), false);
});

test("Revisar owns cards and caderno", () => {
  const item = findItem("/revisar");
  assert.ok(item);
  assert.equal(isNavItemActive("/cards-adaptativos", item), true);
  assert.equal(isNavItemActive("/caderno", item), true);
});

test("Planejar owns calendar views", () => {
  const item = findItem("/planejar");
  assert.ok(item);
  assert.equal(isNavItemActive("/calendario", item), true);
  assert.equal(isNavItemActive("/agenda-operacional", item), true);
});

test("planning children keep their own title and breadcrumb", () => {
  assert.equal(getStudentPageTitle("/cronograma"), "Cronograma");
  assert.equal(getStudentPageTitle("/calendario"), "Calendário");
  assert.equal(getStudentPageTitle("/agenda-operacional"), "Agenda");
  assert.deepEqual(getStudentRoute("/calendario")?.breadcrumb, ["Planejar", "Calendário"]);
});

// Subnavegação: sem ela, estes destinos reais ficam inalcançáveis pelo menu,
// que expõe apenas os 5 verbos.
test("every multi-destination intention exposes its sections", () => {
  const labels = (path) => getIntentChildren(path).map((item) => item.label);
  assert.deepEqual(labels("/praticar"), ["Banco", "Sessões"]);
  assert.deepEqual(labels("/revisar"), ["Fila", "Cards", "Caderno"]);
  assert.deepEqual(labels("/acompanhar"), ["Desempenho", "Gráficos", "Relatórios"]);
  assert.deepEqual(labels("/cronograma"), ["Calendário", "Metas", "Plano"]);
  // Hoje é tela única.
  assert.deepEqual(labels("/hoje"), []);
});

test("aliases highlight the section they belong to", () => {
  assert.equal(getActiveChildLabel("/banco-de-questoes"), "Banco");
  assert.equal(getActiveChildLabel("/estatisticas"), "Desempenho");
  assert.equal(getActiveChildLabel("/calendario"), "Calendário");
  assert.equal(getActiveChildLabel("/agenda-operacional"), "Calendário");
  assert.equal(getActiveChildLabel("/cards-adaptativos"), "Cards");
  assert.equal(getActiveChildLabel("/revisao-turbo"), "Cards");
  assert.equal(getActiveChildLabel("/provas"), "Sessões");
});

test("the route registry owns icon and warmup intent", () => {
  const route = getStudentRoute("/banco-de-questoes/sessao/abc");
  assert.equal(route?.intent, "practice");
  assert.equal(route?.icon, "practice");
  assert.equal(route?.warmup, "practice");
});
