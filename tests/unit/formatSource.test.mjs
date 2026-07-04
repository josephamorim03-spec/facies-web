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

test("faixa de anos honesta: min != max vira 'período min–max'", () => {
  assert.equal(
    formatSourceLabel({ board_code: "REVALIDA", year: 2026, year_min: 2022, year_max: 2026 }),
    "REVALIDA · período 2022–2026",
  );
});

test("faixa degenerada (min == max) e fallback sem faixa mantêm o ano exato", () => {
  assert.equal(
    formatSourceLabel({ board_code: "AMP", year: 2024, year_min: 2024, year_max: 2024 }),
    "AMP · 2024",
  );
  // payload antigo (sem year_min/max, ex. sessão criada antes da migration 030)
  assert.equal(formatSourceLabel({ board_code: "AMP", year: 2024 }), "AMP · 2024");
  // faixa inválida (lixo) não derruba o rótulo
  assert.equal(formatSourceLabel({ year: 2024, year_min: "abc", year_max: 2024 }), "2024");
});
