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

test("grupo principal são os 4 verbos de ação, sem Simulados", () => {
  const hrefs = NAV_GROUPS_CONFIG[0].items.map((item) => item.href);
  assert.deepEqual(hrefs, ["/hoje", "/banco-de-questoes", "/cards-adaptativos", "/estatisticas"]);
  // Simulados não é um destino de menu — é um filtro do Histórico.
  assert.ok(!hrefs.includes("/provas"));
});

test("Histórico vive no grupo secundário com os rótulos Histórico", () => {
  const secondaryHrefs = NAV_GROUPS_CONFIG[1].items.map((item) => item.href);
  assert.ok(secondaryHrefs.includes("/revisoes"));
  const item = findItem("/revisoes");
  assert.ok(item, "item /revisoes deve existir no nav");
  assert.equal(item.label, "HISTÓRICO");
  assert.equal(item.shortLabel, "Histórico");
});

test("active state de Histórico cobre /revisoes (com query), não /provas", () => {
  const item = findItem("/revisoes");
  assert.ok(item);
  assert.equal(isNavItemActive("/revisoes", item), true);
  assert.equal(isNavItemActive("/revisoes?tipo=provas", item), true);
  // /provas redireciona para /revisoes; não é um destino de nav próprio.
  assert.equal(isNavItemActive("/provas", item), false);
  assert.equal(isNavItemActive("/banco-de-questoes", item), false);
});
