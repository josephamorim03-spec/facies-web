import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildAreaInsightRows,
  buildChartTakeaway,
  buildSelectedWeekBreakdown,
  deltaTone,
  formatDeltaPp,
  getChartAreaColor,
} from "../../src/app/estatisticas/graficos/_lib/chartInsights.ts";
import {
  assignQuadrant,
  buildPriorityMatrixRows,
  computeMatrixMidlines,
  median,
  rawAreaIncidence,
} from "../../src/app/estatisticas/graficos/_lib/matrixInsights.ts";

const areas = ["GO", "PD", "MP", "CG", "CM", "OU"];

function week(weekLabel, total, accuracyPct, areaTotals = {}) {
  return {
    week_label: weekLabel,
    week_start: `2026-01-${String(Number(weekLabel.slice(1)) + 1).padStart(2, "0")}`,
    total,
    correct: Math.round((total * (accuracyPct ?? 0)) / 100),
    accuracy_pct: accuracyPct,
    areas: Object.fromEntries(
      areas.map((area) => [
        area,
        {
          total: areaTotals[area] ?? 0,
          correct: 0,
          accuracy_pct: null,
        },
      ]),
    ),
  };
}

test("formatDeltaPp covers improvement, drop and stability", () => {
  assert.equal(formatDeltaPp(6.4), "+6 pp");
  assert.equal(formatDeltaPp(-3.2), "-3 pp");
  assert.equal(formatDeltaPp(0.2), "estavel");
  assert.equal(formatDeltaPp(null), "sem delta");
});

test("getChartAreaColor covers every chart area", () => {
  for (const area of areas) {
    assert.match(getChartAreaColor(area), /^#[0-9A-Fa-f]{6}$/);
  }
});

test("buildChartTakeaway identifies recent improvement", () => {
  const takeaway = buildChartTakeaway({
    weeks: [
      week("w1", 20, 50),
      week("w2", 20, 55),
      week("w3", 20, 70),
      week("w4", 20, 75),
    ],
  });

  assert.equal(takeaway.tone, "positive");
  assert.equal(takeaway.deltaLabel, "+20 pp");
});

test("buildChartTakeaway identifies recent drop", () => {
  const takeaway = buildChartTakeaway({
    weeks: [
      week("w1", 20, 80),
      week("w2", 20, 75),
      week("w3", 20, 55),
      week("w4", 20, 50),
    ],
  });

  assert.equal(takeaway.tone, "attention");
  assert.equal(takeaway.deltaLabel, "-25 pp");
});

test("buildChartTakeaway handles stable and insufficient data", () => {
  assert.equal(
    buildChartTakeaway({
      weeks: [week("w1", 20, 60), week("w2", 20, 61), week("w3", 20, 60), week("w4", 20, 62)],
    }).tone,
    "neutral",
  );

  assert.equal(buildChartTakeaway({ weeks: [week("w1", 20, 60)] }).deltaLabel, "dados iniciais");
});

test("buildSelectedWeekBreakdown sorts visible area rows by volume", () => {
  const rows = buildSelectedWeekBreakdown(week("w1", 20, 60, { CM: 5, CG: 12, PD: 3 }));

  assert.deepEqual(rows.map((row) => row.area), ["CG", "CM", "PD"]);
  assert.deepEqual(rows.map((row) => row.sharePct), [60, 25, 15]);
});

test("deltaTone maps sign with a dead-zone around zero", () => {
  assert.equal(deltaTone(4), "positive");
  assert.equal(deltaTone(-4), "attention");
  assert.equal(deltaTone(0.2), "neutral");
  assert.equal(deltaTone(null), "neutral");
});

test("buildAreaInsightRows takes recent area accuracy, sums volume, passes delta", () => {
  const weeks = [
    { week_label: "w1", total: 10, accuracy_pct: 50, areas: { GO: { total: 6, accuracy_pct: 50 }, PD: { total: 4, accuracy_pct: null } } },
    { week_label: "w2", total: 8, accuracy_pct: 70, areas: { GO: { total: 5, accuracy_pct: 72 }, PD: { total: 3, accuracy_pct: 60 } } },
  ];
  const rows = buildAreaInsightRows({ weeks, deltaByArea: { GO: 5.5, PD: null }, areas: ["GO", "PD"] });
  const go = rows.find((row) => row.area === "GO");
  const pd = rows.find((row) => row.area === "PD");

  assert.equal(go.recentAccuracyPct, 72); // last non-null wins
  assert.equal(go.volume, 11); // 6 + 5
  assert.equal(go.deltaPp, 5.5);
  assert.equal(pd.recentAccuracyPct, 60);
  assert.equal(pd.volume, 7);
  assert.equal(pd.deltaPp, null);
});

test("rawAreaIncidence prefers bank_demand weighted by question_count", () => {
  const topics = [
    { question_count: 10, bank_demand_score: 0.8, board_frequency: { A: 3 } },
    { question_count: 30, bank_demand_score: 0.4, board_frequency: { A: 1 } },
  ];
  // (0.8*10 + 0.4*30) / 40 = 0.5
  assert.equal(rawAreaIncidence(topics), 0.5);
});

test("rawAreaIncidence falls back to board frequency then catalog coverage", () => {
  assert.equal(
    rawAreaIncidence([{ question_count: 5, bank_demand_score: 0, board_frequency: { A: 2, B: 3 } }]),
    5,
  );
  assert.equal(
    rawAreaIncidence([{ question_count: 7, bank_demand_score: 0, board_frequency: {} }]),
    7,
  );
});

test("buildPriorityMatrixRows normalizes incidence and drops empty areas", () => {
  const rows = buildPriorityMatrixRows({
    areaSummaries: [
      { area: "GO", accuracyPct: 40, volume: 100 },
      { area: "PD", accuracyPct: 80, volume: 50 },
      { area: "CM", accuracyPct: null, volume: 20 }, // no accuracy → dropped
      { area: "CG", accuracyPct: 60, volume: 0 }, // no volume → dropped
    ],
    rawIncidenceByArea: { GO: 2, PD: 1 },
  });

  assert.deepEqual(rows.map((row) => row.area), ["GO", "PD"]);
  assert.equal(rows.find((row) => row.area === "GO").incidenceScore, 1); // 2/2
  assert.equal(rows.find((row) => row.area === "PD").incidenceScore, 0.5); // 1/2
});

test("median handles odd, even and empty inputs", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), 0);
});

test("assignQuadrant flags low-accuracy high-incidence as priorizar", () => {
  const rows = [
    { area: "GO", label: "", color: "", accuracyPct: 40, volume: 100, incidenceScore: 1 },
    { area: "PD", label: "", color: "", accuracyPct: 80, volume: 50, incidenceScore: 0.2 },
  ];
  const mid = computeMatrixMidlines(rows); // accuracyMid 50, incidenceMid median([1,0.2]) = 0.6
  assert.equal(mid.accuracyMid, 50);
  assert.equal(assignQuadrant(rows[0], mid), "priorizar");
  assert.equal(assignQuadrant(rows[1], mid), "consolidar");
});
