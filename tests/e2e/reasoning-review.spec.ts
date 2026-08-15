import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";

const SESSION_ID = "reasoning_review_e2e";

const concealedItem = {
  question_id: "question_inferior_mi",
  question_version: 7,
  position: 1,
  stem: "Paciente com dor torácica e supradesnivelamento de ST em DII, DIII e aVF. Qual é a conduta segura?",
  alternatives: {
    A: "Evitar nitrato e avaliar acometimento de ventrículo direito",
    B: "Administrar nitrato imediatamente",
    C: "Liberar após analgesia",
    D: "Solicitar apenas teste ergométrico",
  },
  image_refs: [],
  table_refs: [],
  knowledge_nodes: [],
  selection_reason: {},
  source: { institution: "KrosMed", year: 2026 },
  selected_option: "B",
  eliminated_options: [],
  answer_state: "committed",
  answer_committed: true,
  doubtful: false,
  confidence_self_rating: 2,
  answered: true,
  result_state: "incorrect",
  feedback_state: "concealed",
  reasoning_review_eligible: true,
  needs_correction: true,
  correct_answer: null,
  is_correct: false,
  distractor_diagnosis: {},
  cognitive_signal: null,
  difficulty_estimate: 0.62,
  pedagogical_profile: null,
  editorial_profile: null,
  question_quality_inspection: null,
  question_dna_profile: null,
  pedagogical_profile_version: null,
  student_trust_weight: null,
  primary_microcompetency_label: null,
  anchor_objective_label: null,
  ai_request_status: "idle",
  ai_request_capability: null,
  adaptive_explanation: null,
  editorial_quality: null,
  is_annulled: false,
  reported_problem: false,
  report_type: null,
  report_reason: null,
  reported_at: null,
  excluded_from_scoring: false,
  exclusion_reason: null,
  exclusion_note: null,
  excluded_at: null,
  attempt_stats: null,
  text_highlights: [],
  post_answer_reflection: null,
};

function sessionPayload(revealed = false) {
  const timestamp = "2026-08-13T15:00:00Z";
  return {
    session_id: SESSION_ID,
    status: "finalized",
    mode: "adaptive",
    resolution_mode: "simulation",
    session_purpose: "assessment",
    session_purpose_inferred: false,
    session_kind: "standard",
    feedback_timing: "post_result",
    feedback_reveal_policy: "guided_choice",
    all_feedback_revealed: revealed,
    scoring_mode: "deferred",
    study_kind: "topic",
    full_exam_name: null,
    full_exam_year: null,
    full_exam_type: null,
    review_trail_enabled: true,
    primary_knowledge_node_id: null,
    area: "CM",
    theme: "Síndrome coronariana aguda",
    subtheme: "Infarto inferior",
    adaptive_weight: 0,
    adaptive_weight_score: 0,
    adaptive_weight_factors: {},
    performed_at: timestamp,
    filters: {},
    kros_mode: null,
    kros_composition: {},
    total_questions: 1,
    answered_count: 1,
    unanswered_count: 0,
    unanswered_question_numbers: [],
    draft_count: 0,
    draft_question_numbers: [],
    doubtful_count: 0,
    answered_time_ms: 42_000,
    items: [
      revealed
        ? {
            ...concealedItem,
            feedback_state: "revealed",
            reasoning_review_eligible: false,
            correct_answer: "A",
            distractor_diagnosis: {
              B: "O nitrato pode agravar a hipotensão quando há acometimento do ventrículo direito.",
            },
          }
        : concealedItem,
    ],
    created_at: timestamp,
    updated_at: timestamp,
    results_revealed_at: revealed ? timestamp : null,
    finalized_at: timestamp,
    directed_study_id: null,
    review_task_id: null,
    reported_problem_count: 0,
    excluded_from_scoring_count: 0,
    scorable_question_count: 1,
  };
}

async function mockReasoningReview(page: Page) {
  await addHttpOnlySessionForPage(page, "reasoning_review_session");

  await page.route(`**/api/question-bank/sessions/${SESSION_ID}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(sessionPayload(false)),
    });
  });
  await page.route(`**/api/question-bank/sessions/${SESSION_ID}/items/1/reasoning-review`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        run_id: "reasoning_run_e2e",
        session_id: SESSION_ID,
        position: 1,
        question_id: concealedItem.question_id,
        question_version: concealedItem.question_version,
        status: "active",
        eligible: true,
        feedback_state: "concealed",
        current_checkpoint: {
          checkpoint_key: "recognize_acute_coronary_syndrome",
          step_order: 1,
          prompt: "Você reconheceu que a dor torácica era potencialmente grave?",
          kind: "problem_representation",
          knowledge_node_id: "kn_acute_chest_pain",
        },
        first_gap: null,
        attribution_options: {},
      }),
    });
  });
  await page.route(`**/api/question-bank/sessions/${SESSION_ID}/items/1/reasoning-review/responses`, async (route) => {
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    expect(await route.request().postDataJSON()).toMatchObject({
      checkpoint_key: "recognize_acute_coronary_syndrome",
      response_value: "no",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        run_id: "reasoning_run_e2e",
        session_id: SESSION_ID,
        position: 1,
        question_id: concealedItem.question_id,
        question_version: concealedItem.question_version,
        eligible: true,
        feedback_state: "concealed",
        status: "gap_identified",
        current_checkpoint: null,
        first_gap: {
          checkpoint_key: "recognize_acute_coronary_syndrome",
          knowledge_node_id: "kn_acute_chest_pain",
          knowledge_node_name: "Reconhecimento de dor torácica de alto risco",
          response_value: "no",
          feedback: "Retome os sinais que tornam a apresentação potencialmente fatal.",
        },
        attribution_options: {},
      }),
    });
  });
  await page.route(`**/api/question-bank/sessions/${SESSION_ID}/items/1/feedback/reveal`, async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(sessionPayload(true)),
    });
  });
  await page.route(`**/api/question-bank/sessions/${SESSION_ID}/feedback/reveal-all`, async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(sessionPayload(true)),
    });
  });
}

test("keeps feedback concealed, finds the first self-reported gap, then reveals the item", async ({ page }) => {
  await mockReasoningReview(page);
  await page.goto(`/banco/sessao/${SESSION_ID}`);

  await expect(page.getByRole("heading", { name: "Infarto inferior" })).toBeVisible();
  await expect(page.getByText("Gabarito A", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revisar raciocínio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revelar resposta e comentários" })).toBeVisible();

  await page.getByRole("button", { name: "Revisar raciocínio" }).click();
  await expect(page.getByText("Você reconheceu que a dor torácica era potencialmente grave?")).toBeVisible();
  await page.getByRole("button", { name: "Não", exact: true }).click();

  await expect(page.getByText("Primeira lacuna percebida")).toBeVisible();
  await expect(page.getByText("Reconhecimento de dor torácica de alto risco")).toBeVisible();
  await page.getByRole("button", { name: "Ver resposta e comentários" }).click();

  await expect(page.getByText("Gabarito A", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revisar raciocínio" })).toHaveCount(0);
});

test("reveals all from the mobile result screen with keyboard confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReasoningReview(page);
  page.once("dialog", (dialog) => dialog.accept());

  await page.goto(`/banco/sessao/${SESSION_ID}`);
  const revealAll = page.getByRole("button", { name: "Revelar todas" });
  await revealAll.focus();
  await expect(revealAll).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Gabarito A", { exact: true })).toBeVisible();
  await expect(revealAll).toHaveCount(0);
});
