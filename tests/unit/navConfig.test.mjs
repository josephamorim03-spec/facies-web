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

test("grupo principal contém Sessões entre Questões e Cards", () => {
  const hrefs = NAV_GROUPS_CONFIG[0].items.map((item) => item.href);
  assert.deepEqual(hrefs, ["/hoje", "/banco-de-questoes", "/revisoes", "/cards-adaptativos"]);
});

test("item /revisoes usa os rótulos Sessões", () => {
  const item = findItem("/revisoes");
  assert.ok(item, "item /revisoes deve existir no nav");
  assert.equal(item.label, "SESSÕES");
  assert.equal(item.shortLabel, "Sessões");
});

test("active state de Sessões cobre /revisoes com query e /provas", () => {
  const item = findItem("/revisoes");
  assert.ok(item);
  assert.equal(isNavItemActive("/revisoes", item), true);
  assert.equal(isNavItemActive("/revisoes?tipo=provas", item), true);
  assert.equal(isNavItemActive("/provas", item), true);
  assert.equal(isNavItemActive("/banco-de-questoes", item), false);
});
