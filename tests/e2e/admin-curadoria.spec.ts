import { expect, test, type Page } from "@playwright/test";

const queueItem = {
  question_id: "q-editorial-1",
  question_version: 3,
  review_id: "review-1",
  review_status: "draft_ready",
  overall_state: "needs_review",
  lane: "difficulty_level",
  priority: "high",
  stem_preview: "Paciente com dor torácica e alteração eletrocardiográfica. Qual é a melhor conduta inicial?",
  question_status: "published",
  content_grade: "usable",
  difficulty_estimate: 0.45,
  classification_confidence: 0.88,
  institution: "Hospital Escola",
  exam_name: "Residência R1",
  board_code: "HE",
  primary_node_name: "Cardiologia",
  year: 2026,
  dimensions: {
    medical_integrity: { state: "pass", summary: "Gabarito consistente.", evidence: [] },
    item_construction: { state: "warning", summary: "Distrator pouco funcional.", evidence: ["alternativa D"] },
    pedagogical_alignment: { state: "pass", summary: "Objetivo alinhado.", evidence: [] },
    psychometric_evidence: { state: "warning", summary: "Divergência observada.", evidence: [] },
    provenance_freshness: { state: "pass", summary: "Fonte identificada.", evidence: [] },
  },
  evidence: [],
  difficulty_assessment: {
    intended_level: "medium",
    predicted_score: 0.42,
    cognitive_demand: "application",
    confidence: 0.8,
    rationale: "Exige aplicação clínica.",
  },
  proposed_patch: { canonical_stem_md: "Enunciado editorial revisado." },
  proposed_pedagogical_profile: {},
  model: "gpt-test",
  prompt_version: "editorial_workbench.v1",
  requested_by: "admin@example.com",
  assigned_to: "admin@example.com",
  decided_by: null,
  decision_note: null,
  open_reports: 0,
  age_reference: "2026-07-12T12:00:00Z",
};

async function mockAdminApis(page: Page) {
  const pipeline = {
    summary: {
      published_questions: 0, imported_files: 0, candidate_total: 0,
      dedup_pending_candidates: 0, canonical_questions: 0, zero_ai_published_questions: 0,
      retry_scheduled_jobs: 0, ready_pending_jobs: 0, artifact_imports: 0,
      published_without_specialty: 0, folder_taxonomy_conflicts: 0,
      folder_taxonomy_rehomes: 0, pending_jobs: 0, processing_jobs: 0,
      failed_jobs: 0, done_jobs: 0, published_jobs: 0, human_review_questions: 0,
    },
    pipeline_jobs: [], stage_stats: [], candidate_counts: [], questions_by_status: [],
    job_counts: { pending_jobs: 0, processing_jobs: 0, failed_jobs: 0, done_jobs: 0, published_jobs: 0, human_review_questions: 0 },
    last_error_by_stage: {}, knowledge_nodes: [],
    backlog_hotspots: { many_candidates_zero_published: [], low_yield_candidates: [], technical_artifacts: [] },
    taxonomy_audit: { published_without_specialty: 0, folder_taxonomy_conflicts: 0, folder_taxonomy_rehomes: 0, conflict_examples: [], missing_specialty_examples: [] },
    editorial_health: { state: "ready", label: "Pronto", published_questions: 0, human_review_questions: 0, blocked_questions: 0, low_confidence_questions: 0, open_reports: 0, failed_jobs: 0, needs_attention: 0, top_actions: [], funnel: [] },
  };
  await page.route("**/api/profile", async (route) => {
    await route.fulfill({
      json: {
        display_name: "Admin E2E",
        access_status: "active",
        has_completed_initial_goal_setup: true,
      },
    });
  });
  await page.route("**/api/admin/question-bank/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/editorial-queue")) {
      await route.fulfill({ json: { items: [queueItem], total: 1, limit: 100, offset: 0 } });
      return;
    }
    if (pathname.endsWith("/data-quality")) {
      await route.fulfill({
        json: {
          min_attempts: 30,
          items_analyzed: 1,
          items: [{
            question_id: queueItem.question_id,
            n: 40,
            unique_users: 40,
            p_value: 0.35,
            observed_difficulty: 0.65,
            facility_ci_low: 0.22,
            facility_ci_high: 0.5,
            wrong_option_counts: { B: 12, C: 8, D: 6 },
            functioning_distractors: 3,
            discrimination: null,
            discrimination_n: null,
            discrimination_form: null,
            flags: [],
          }],
        },
      });
      return;
    }
    if (pathname.endsWith(`/questions/${queueItem.question_id}`)) {
      await route.fulfill({
        json: {
          id: queueItem.question_id,
          stem: queueItem.stem_preview,
          alternatives: { A: "AAS", B: "Alta", C: "Antibiótico", D: "Observação" },
          answer: "A",
          status: "published",
          content_grade: "usable",
          difficulty_estimate: 0.45,
          classification_confidence: 0.88,
          is_annulled: false,
          is_blocked: false,
          version: 3,
          nodes: [],
          images: [],
          image_refs: [],
          source: {},
          publish_blockers: [],
          charge_profile: {},
          question_fingerprint: null,
          distractor_diagnosis: {},
          similar_questions: [],
          topic_review: null,
          dedup_enrichment_log: [],
          edit_log: [],
        },
      });
      return;
    }
    if (pathname.endsWith("/pipeline/status")) {
      await route.fulfill({ json: pipeline });
      return;
    }
    if (pathname.endsWith("/pipeline/readiness")) {
      await route.fulfill({ json: { status: "ok", database: "ok", admin_api_enabled: true, llm_enabled: true, auto_pipeline_enabled: false, pipeline_workers: 1, providers: { cheap: { provider: "test", model: "test", configured: true }, strong: { provider: "test", model: "test", configured: true } }, pipeline } });
      return;
    }
    if (pathname.endsWith("/imports")) {
      await route.fulfill({ json: { imports: [], total: 0, limit: 20, offset: 0 } });
      return;
    }
    await route.fulfill({ json: {} });
  });
}

for (const viewport of [{ name: "mobile", width: 375, height: 812 }, { name: "desktop", width: 1440, height: 900 }]) {
  test(`curadoria editorial responsiva no ${viewport.name}`, async ({ context, page }) => {
    await context.addCookies([{ name: "krosmed_session", value: "e2e-session", domain: "127.0.0.1", path: "/" }]);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockAdminApis(page);

    await page.goto("/admin/question-bank");
    await page.getByRole("button", { name: "Curadoria", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Curadoria e nível das questões" })).toBeVisible();
    await expect(page.getByText("difficulty_mismatch")).toBeVisible();
    await page.getByText(queueItem.stem_preview).click();
    await expect(page.getByRole("heading", { name: "Decisão editorial" })).toBeVisible();
    await expect(page.getByText("Rubrica editorial")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
