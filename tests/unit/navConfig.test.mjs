import assert from "node:assert/strict";
import { test } from "node:test";
import { NAV_GROUPS_CONFIG, isNavItemActive } from "../../src/lib/navConfig.ts";

function findItem(href) {
  for (const group of NAV_GROUPS_CONFIG) {
    const item = group.items.find((candidate) => candidate.href === href);
    if (item) return item;
  }
  return null;
}

test("primary nav keeps the four action hubs", () => {
  const hrefs = NAV_GROUPS_CONFIG[0].items.map((item) => item.href);
  assert.deepEqual(hrefs, ["/hoje", "/banco-de-questoes", "/cards-adaptativos", "/estatisticas"]);
  assert.ok(!hrefs.includes("/provas"));

  const cardsItem = findItem("/cards-adaptativos");
  assert.ok(cardsItem, "item /cards-adaptativos must exist");
  assert.equal(cardsItem.label, "CARDS");
  assert.equal(cardsItem.shortLabel, "Cards");
});

test("secondary nav keeps Plano and Historico without Cronograma or Caderno", () => {
  const secondaryHrefs = NAV_GROUPS_CONFIG[1].items.map((item) => item.href);
  assert.deepEqual(secondaryHrefs, ["/desempenho", "/revisoes"]);

  const historicoItem = findItem("/revisoes");
  assert.ok(historicoItem, "item /revisoes must exist");
  assert.equal(historicoItem.label, "HISTÓRICO");
  assert.equal(historicoItem.shortLabel, "Histórico");
});

test("Historico active state covers /revisoes with query, not /provas", () => {
  const item = findItem("/revisoes");
  assert.ok(item);
  assert.equal(isNavItemActive("/revisoes", item), true);
  assert.equal(isNavItemActive("/revisoes?tipo=provas", item), true);
  assert.equal(isNavItemActive("/provas", item), false);
  assert.equal(isNavItemActive("/banco-de-questoes", item), false);
});

test("Cards stays active inside /caderno", () => {
  const item = findItem("/cards-adaptativos");
  assert.ok(item);
  assert.equal(isNavItemActive("/caderno", item), true);
});

test("Hoje stays active inside calendar views", () => {
  const item = findItem("/hoje");
  assert.ok(item);
  assert.equal(isNavItemActive("/calendario", item), true);
  assert.equal(isNavItemActive("/agenda-operacional", item), true);
});
