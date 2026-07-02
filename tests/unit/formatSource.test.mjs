import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSourceLabel } from "../../src/lib/formatSource.ts";

test("formata institution · banca · ano no caso normal", () => {
  assert.equal(
    formatSourceLabel({ institution: "USP", board_code: "SMK", year: 2024 }),
    "USP · SMK · 2024",
  );
});

test("prefere board_name sobre board_code", () => {
  assert.equal(
    formatSourceLabel({ institution: "USP", board_name: "SMK Reviews", board_code: "SMK", year: 2024 }),
    "USP · SMK Reviews · 2024",
  );
});

test("deduplica institution == banca (mata 'REVALIDA REVALIDA')", () => {
  assert.equal(
    formatSourceLabel({ institution: "REVALIDA", board_code: "REVALIDA", year: 2026 }),
    "REVALIDA · 2026",
  );
  // dedupe é case-insensitive
  assert.equal(
    formatSourceLabel({ institution: "Revalida", board_name: "REVALIDA" }),
    "Revalida",
  );
});

test("institution vazia + só ano vira o ano (nada de placeholder 'Instituição 2026')", () => {
  assert.equal(formatSourceLabel({ institution: "", board_code: "", year: 2026 }), "2026");
  assert.equal(formatSourceLabel({ year: 2026 }), "2026");
});

test("fonte totalmente vazia cai em 'Fonte não informada'", () => {
  assert.equal(formatSourceLabel({}), "Fonte não informada");
  assert.equal(formatSourceLabel(null), "Fonte não informada");
  assert.equal(formatSourceLabel({ institution: "  ", board_code: null, year: "" }), "Fonte não informada");
});
