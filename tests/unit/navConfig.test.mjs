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

test("navigation exposes the canonical student destinations", () => {
  const hrefs = NAV_GROUPS_CONFIG.flatMap((group) => group.items.map((item) => item.href));
  assert.deepEqual(hrefs, ["/kros", "/hoje", "/cronograma", "/banco", "/cards", "/evolucao", "/preferencias"]);
});

test("navigation isolates Kros in its own group above the study routine", () => {
  assert.deepEqual(
    NAV_GROUPS_CONFIG.map((group) => group.items.map((item) => item.href)),
    [
      ["/kros"],
      ["/hoje", "/cronograma"],
      ["/banco", "/cards"],
      ["/evolucao", "/preferencias"],
    ],
  );
});

test("legacy routes keep activating their canonical destination", () => {
  assert.equal(isNavItemActive("/today", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/provas", findItem("/kros")), true);
  assert.equal(isNavItemActive("/praticar", findItem("/banco")), true);
  assert.equal(isNavItemActive("/revisar", findItem("/cards")), true);
  assert.equal(isNavItemActive("/acompanhar", findItem("/evolucao")), true);
  assert.equal(isNavItemActive("/planejamento", findItem("/cronograma")), true);
});

test("canonical destinations own their related aliases", () => {
  assert.equal(isNavItemActive("/revisoes?tipo=provas", findItem("/banco")), true);
  assert.equal(isNavItemActive("/cards-adaptativos", findItem("/cards")), true);
  assert.equal(isNavItemActive("/caderno", findItem("/cards")), true);
  assert.equal(isNavItemActive("/estatisticas", findItem("/evolucao")), true);
  assert.equal(isNavItemActive("/agenda-operacional", findItem("/cronograma")), true);
  assert.equal(isNavItemActive("/rotina-e-metas", findItem("/preferencias")), true);
});

test("legacy titles resolve to their canonical destination", () => {
  assert.equal(getStudentPageTitle("/planejamento"), "Cronograma");
  assert.equal(getStudentPageTitle("/calendario"), "Cronograma");
  assert.equal(getStudentPageTitle("/agenda-operacional"), "Cronograma");
});

test("global shell does not duplicate route subnavigation", () => {
  assert.deepEqual(getIntentChildren("/banco"), []);
  assert.deepEqual(getIntentChildren("/cards"), []);
  assert.equal(getActiveChildLabel("/banco"), null);
});

test("the route registry owns canonical bank sessions", () => {
  const route = getStudentRoute("/banco/sessao/abc");
  assert.equal(route?.intent, "bank");
  assert.equal(route?.icon, "bank");
  assert.equal(route?.warmup, "bank");
});
