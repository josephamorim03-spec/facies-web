import { expect, test } from "@playwright/test";

/**
 * Visual + behavioural check for the Open Learner Model section ("Meu modelo")
 * on /estatisticas.
 *
 * AUTH REQUIREMENT (read this before running):
 * /estatisticas is gated by the auth middleware (unauthenticated → 307 /login)
 * AND the page skeleton-gates on its own data load, so this spec needs a real
 * authenticated session and a reachable backend. Two ways to provide it:
 *   1. Your standard e2e auth setup (global-setup / storageState), same as the
 *      other smoke specs — nothing extra needed here.
 *   2. Ad-hoc: export the session cookie value and run standalone, e.g.
 *        KROSMED_E2E_SESSION="<krosmed_session value>" \
 *        PLAYWRIGHT_REUSE_SERVER=1 npx playwright test estatisticas.meu-modelo
 *      (with a logged-in dev server already running on :3000).
 *
 * The ONLY thing this spec mocks is the learner-model endpoint, so the OLM
 * section renders deterministic fixture data regardless of the account's real
 * progress. Everything else on the page loads for real (that's what clears the
 * skeleton gate). If no session is present the test SKIPS with a clear message
 * instead of failing confusingly.
 */

const LEARNER_MODEL_ROUTE = "**/api/question-bank/learner-model";

// Fixture spans every branch the component must handle:
// - needs_review + overconfident  → "revisar" badge + "Confiou demais" chip
// - needs_review + trap_sensitivity → "Caiu no distrator" chip
// - measured, no flags
// - under-measured (exposure<3 / high uncertainty) → "Ainda estou medindo"
const learnerModelFixture = {
  user_id: "e2e-user",
  generated_at: new Date().toISOString(),
  competencies: [
    {
      knowledge_node_id: "n1",
      node_name: "Insuficiência cardíaca aguda",
      node_type: "microcompetency",
      exposure_count: 12,
      mastery_score: 0.32,
      retention_score: 0.4,
      confidence: 0.5,
      uncertainty: 0.3,
      needs_review: true,
      overconfidence_score: 0.7,
      trap_sensitivity: 0.1,
      next_action: "Treinar a competência com questões graduadas.",
    },
    {
      knowledge_node_id: "n2",
      node_name: "Cetoacidose diabética",
      node_type: "microcompetency",
      exposure_count: 9,
      mastery_score: 0.41,
      retention_score: 0.55,
      confidence: 0.6,
      uncertainty: 0.25,
      needs_review: true,
      overconfidence_score: 0.1,
      trap_sensitivity: 0.65,
      next_action: "Treinar discriminação fina de alternativas.",
    },
    {
      knowledge_node_id: "n3",
      node_name: "Manejo da sepse",
      node_type: "microcompetency",
      exposure_count: 20,
      mastery_score: 0.68,
      retention_score: 0.72,
      confidence: 0.8,
      uncertainty: 0.15,
      needs_review: false,
      overconfidence_score: 0.0,
      trap_sensitivity: 0.0,
      next_action: "Manter em rotação adaptativa.",
    },
    {
      knowledge_node_id: "n4",
      node_name: "Emergências oncológicas",
      node_type: "microcompetency",
      exposure_count: 1,
      mastery_score: 0.5,
      retention_score: 0.5,
      confidence: 0.1,
      uncertainty: 0.8,
      needs_review: false,
      overconfidence_score: 0.0,
      trap_sensitivity: 0.0,
      next_action: null,
    },
  ],
  metacognition: {},
  adaptive_summary: {},
};

test.describe("Estatísticas · Meu modelo (Open Learner Model)", () => {
  test.beforeEach(async ({ context }) => {
    const session = process.env.KROSMED_E2E_SESSION;
    if (session) {
      const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
      const { hostname } = new URL(base);
      await context.addCookies([
        {
          name: "krosmed_session",
          value: session,
          domain: hostname,
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    await context.route(LEARNER_MODEL_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(learnerModelFixture),
      }),
    );
  });

  test("renders the scrutable model with honest uncertainty and a per-node deep-link", async ({
    page,
  }, testInfo) => {
    await page.goto("/estatisticas");

    // No session → the middleware sent us to /login. Skip loudly, don't fail.
    test.skip(
      page.url().includes("/login"),
      "Needs an authenticated session — see the header comment in this spec.",
    );

    const heading = page.getByRole("heading", { name: "Meu modelo" });
    await expect(heading).toBeVisible({ timeout: 30_000 });

    const section = page.locator("section").filter({ has: heading });

    // Focus group: weakest needs_review competencies first.
    await expect(section.getByText("Onde seu esforço rende mais agora")).toBeVisible();
    await expect(section.getByText("Insuficiência cardíaca aguda")).toBeVisible();
    await expect(section.getByText("Cetoacidose diabética")).toBeVisible();

    // Backend's curated flag surfaced as a badge.
    await expect(section.getByText("revisar").first()).toBeVisible();

    // Cognitive signals translated to tutor language (not raw scores).
    await expect(section.getByText("Confiou demais")).toBeVisible();
    await expect(section.getByText("Caiu no distrator")).toBeVisible();

    // The OLM core: honest about what it hasn't measured yet.
    await expect(section.getByText("Ainda estou medindo")).toBeVisible();
    await expect(section.getByText("Emergências oncológicas")).toBeVisible();

    // Per-node deep-link: "Praticar" pre-searches the microcompetency in the bank.
    const praticar = section.getByRole("link", { name: "Praticar" }).first();
    await expect(praticar).toHaveAttribute("href", /\/banco-de-questoes\?theme=/);

    await praticar.scrollIntoViewIfNeeded();
    const shot = await section.screenshot();
    await testInfo.attach("meu-modelo", { body: shot, contentType: "image/png" });
  });
});
