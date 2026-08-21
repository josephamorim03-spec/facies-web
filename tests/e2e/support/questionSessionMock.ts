import type { Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./authCookies";

/**
 * Sessao de questoes EM ANDAMENTO, para exercitar o runner (`FocusedQuestion`).
 *
 * O fixture que existia (`reasoning-review.spec.ts`) devolve uma sessao
 * `finalized`, que renderiza a revisao pos-prova — outra tela. Este mock cobre o
 * outro lado: a tela onde o aluno de fato responde, que e onde moram a barra
 * superior, as alternativas e o rodape de navegacao.
 */

export const RUNNER_SESSION_ID = "runner_session_e2e";

const TIMESTAMP = "2026-08-21T15:00:00Z";

export function runnerItem(position: number, overrides: Record<string, unknown> = {}) {
  return {
    question_id: `question_runner_${position}`,
    question_version: 3,
    position,
    stem: `Questão ${position}: paciente com quadro compatível com pneumonia adquirida na comunidade. Qual é a conduta inicial?`,
    alternatives: {
      A: "Amoxicilina em dose adequada",
      B: "Ceftriaxona intravenosa imediata",
      C: "Somente sintomáticos",
      D: "Corticoide sistêmico",
    },
    image_refs: [],
    table_refs: [],
    knowledge_nodes: [],
    selection_reason: {},
    source: { institution: "KrosMed", year: 2026 },
    selected_option: null,
    eliminated_options: [],
    answer_state: "draft",
    answer_committed: false,
    doubtful: false,
    confidence_self_rating: null,
    answered: false,
    result_state: "pending",
    feedback_state: "concealed",
    reasoning_review_eligible: false,
    needs_correction: false,
    correct_answer: null,
    is_correct: null,
    distractor_diagnosis: {},
    cognitive_signal: null,
    difficulty_estimate: 0.5,
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
    ...overrides,
  };
}

export function runnerSession(overrides: Record<string, unknown> = {}) {
  const items = (overrides.items as unknown[]) ?? [runnerItem(1), runnerItem(2), runnerItem(3)];
  return {
    session_id: RUNNER_SESSION_ID,
    status: "in_progress",
    mode: "by_topic",
    resolution_mode: "simulation",
    session_purpose: "practice",
    session_purpose_inferred: false,
    session_kind: "bank_topic",
    feedback_timing: "post_result",
    feedback_reveal_policy: "guided_choice",
    all_feedback_revealed: false,
    scoring_mode: "deferred_until_finalize",
    study_kind: "topic",
    full_exam_name: null,
    full_exam_year: null,
    full_exam_type: null,
    review_trail_enabled: false,
    primary_knowledge_node_id: null,
    area: "CM",
    theme: "Pneumonia",
    subtheme: "Pneumonia comunitária",
    adaptive_weight: 0,
    adaptive_weight_score: 0,
    adaptive_weight_factors: {},
    performed_at: TIMESTAMP,
    filters: {},
    kros_mode: null,
    kros_composition: {},
    total_questions: items.length,
    answered_count: 0,
    unanswered_count: items.length,
    unanswered_question_numbers: items.map((_, index) => index + 1),
    draft_count: 0,
    draft_question_numbers: [],
    doubtful_count: 0,
    answered_time_ms: 0,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    results_revealed_at: null,
    finalized_at: null,
    directed_study_id: null,
    review_task_id: null,
    reported_problem_count: 0,
    excluded_from_scoring_count: 0,
    scorable_question_count: items.length,
    ...overrides,
    items,
  };
}

/**
 * Instala o runner. `onSession` permite ao teste evoluir o payload entre
 * chamadas — responder uma questao devolve a sessao inteira, e sem isso o mock
 * congelaria a tela no primeiro estado.
 */
export async function mockQuestionSession(
  page: Page,
  options: { session?: Record<string, unknown>; onAttempt?: (body: unknown) => void } = {},
) {
  await addHttpOnlySessionForPage(page, "runner_session");

  let current = options.session ?? runnerSession();

  await page.route(`**/api/question-bank/sessions/${RUNNER_SESSION_ID}`, async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(current),
    }),
  );

  await page.route(
    `**/api/question-bank/sessions/${RUNNER_SESSION_ID}/items/*/attempt`,
    async (route) => {
      const body = route.request().postDataJSON() as {
        selected_option?: string | null;
        commit?: boolean;
      };
      options.onAttempt?.(body);
      const position = Number(new URL(route.request().url()).pathname.split("/").at(-2));
      const items = (current.items as ReturnType<typeof runnerItem>[]).map((item) =>
        item.position === position
          ? {
              ...item,
              selected_option: body.selected_option ?? null,
              answered: Boolean(body.selected_option),
              answer_committed: Boolean(body.commit),
              answer_state: body.commit ? "committed" : "draft",
            }
          : item,
      );
      current = { ...current, items };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(current),
      });
    },
  );

  // O guard de perfil do `AppShell` roda mesmo no modo imersivo; sem isto ele
  // cai no catch e o teste passa a depender de um erro silencioso.
  await page.route("**/api/profile", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user_id: "user_runner_e2e",
        display_name: "E2E",
        access_status: "active",
        has_completed_initial_goal_setup: true,
        timezone: "America/Sao_Paulo",
      }),
    }),
  );

  await page.route("**/api/student-events**", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
}
