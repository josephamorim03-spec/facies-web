import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterSessionsByTab,
  isExamLike,
  parseSessionsTab,
  sessionAccuracy,
  sessionCta,
  sessionDurationMs,
} from "../../src/lib/sessionsPanel.ts";

function makeSession(overrides = {}) {
  return {
    status: "active",
    mode: "by_topic",
    resolution_mode: "training",
    study_kind: "topic",
    results_revealed_at: null,
    finalized_at: null,
    created_at: "2026-07-01T10:00:00+00:00",
    answered_time_ms: 0,
    ...overrides,
  };
}

test("parseSessionsTab aceita valores válidos e cai em inacabadas", () => {
  assert.equal(parseSessionsTab("resultados"), "resultados");
  assert.equal(parseSessionsTab("provas"), "provas");
  assert.equal(parseSessionsTab("xyz"), "inacabadas");
  assert.equal(parseSessionsTab(null), "inacabadas");
});

test("isExamLike cobre simulado, prova completa e modo por prova", () => {
  assert.equal(isExamLike(makeSession({ resolution_mode: "simulation" })), true);
  assert.equal(isExamLike(makeSession({ study_kind: "full_exam" })), true);
  assert.equal(isExamLike(makeSession({ mode: "by_exam" })), true);
  assert.equal(isExamLike(makeSession()), false);
});

test("filterSessionsByTab: invalidada só aparece em todas", () => {
  const active = makeSession();
  const finalized = makeSession({ status: "finalized", finalized_at: "2026-07-01T11:00:00+00:00" });
  const exam = makeSession({ resolution_mode: "simulation" });
  const invalidated = makeSession({ status: "invalidated" });
  const sessions = [active, finalized, exam, invalidated];

  assert.deepEqual(filterSessionsByTab(sessions, "inacabadas"), [active, exam]);
  assert.deepEqual(filterSessionsByTab(sessions, "resultados"), [finalized]);
  assert.deepEqual(filterSessionsByTab(sessions, "provas"), [exam]);
  assert.deepEqual(filterSessionsByTab(sessions, "treinos"), [active, finalized]);
  assert.deepEqual(filterSessionsByTab(sessions, "todas"), sessions);
});

test("sessionCta cobre os quatro estados", () => {
  assert.deepEqual(sessionCta(makeSession()), { label: "Continuar", variant: "primary" });
  assert.deepEqual(
    sessionCta(makeSession({ status: "finalized", finalized_at: "2026-07-01T11:00:00+00:00" })),
    { label: "Ver resultado", variant: "secondary" },
  );
  assert.deepEqual(
    sessionCta(
      makeSession({ resolution_mode: "simulation", results_revealed_at: "2026-07-01T11:00:00+00:00" }),
    ),
    { label: "Concluir revisão", variant: "primary" },
  );
  assert.equal(sessionCta(makeSession({ status: "invalidated" })), null);
});

test("sessionDurationMs: tempo respondido vence; fallback só com fim conhecido", () => {
  assert.equal(sessionDurationMs(makeSession({ answered_time_ms: 20000 })), 20000);
  assert.equal(sessionDurationMs(makeSession()), null); // ativa sem tempo → nada
  assert.equal(
    sessionDurationMs(
      makeSession({ status: "finalized", finalized_at: "2026-07-01T10:30:00+00:00" }),
    ),
    30 * 60 * 1000,
  );
  assert.equal(
    sessionDurationMs(
      makeSession({ resolution_mode: "simulation", results_revealed_at: "2026-07-01T10:05:00+00:00" }),
    ),
    5 * 60 * 1000,
  );
  assert.equal(
    sessionDurationMs(makeSession({ status: "finalized", finalized_at: "data-invalida" })),
    null,
  );
  assert.equal(
    sessionDurationMs(
      makeSession({ status: "finalized", finalized_at: "2026-07-01T09:00:00+00:00" }),
    ),
    null, // fim antes do início → null
  );
});

test("sessionAccuracy: finalizada usa acerto, ativa usa progresso", () => {
  const base = {
    total_questions: 4,
    answered_count: 2,
    items: [
      { is_correct: true },
      { is_correct: false },
      { is_correct: null },
      { is_correct: null },
    ],
  };
  assert.equal(sessionAccuracy({ ...makeSession(), ...base }), 50); // 2/4 respondidas
  assert.equal(
    sessionAccuracy({
      ...makeSession({ status: "finalized", finalized_at: "2026-07-01T11:00:00+00:00" }),
      ...base,
    }),
    25, // 1/4 corretas
  );
  assert.equal(sessionAccuracy({ ...makeSession(), ...base, total_questions: 0 }), 0);
});
