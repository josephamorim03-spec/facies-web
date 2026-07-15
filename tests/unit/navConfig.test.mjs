import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NAV_GROUPS_CONFIG,
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

test("Acompanhar owns history and exam aliases", () => {
  const item = findItem("/acompanhar");
  assert.ok(item);
  assert.equal(isNavItemActive("/revisoes", item), true);
  assert.equal(isNavItemActive("/revisoes?tipo=provas", item), true);
  assert.equal(isNavItemActive("/provas", item), true);
  assert.equal(isNavItemActive("/banco-de-questoes", item), false);
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

test("the route registry owns icon and warmup intent", () => {
  const route = getStudentRoute("/banco-de-questoes/sessao/abc");
  assert.equal(route?.intent, "practice");
  assert.equal(route?.icon, "practice");
  assert.equal(route?.warmup, "practice");
});
