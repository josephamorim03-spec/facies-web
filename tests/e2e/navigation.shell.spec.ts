import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import type { StudentToday } from "@/lib/api";
import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

const STUDENT_TODAY_FIXTURE = {
  contract_version: "student-today-v1",
  generated_at: "2026-07-29T12:00:00Z",
  status: "complete",
  primary_action: {
    kind: "targeted_practice",
    title: "Treino leve",
    rationale: "Pratique um bloco curto para manter o ritmo.",
    estimated_minutes: 5,
    href: "/banco-de-questoes",
    cta_label: "Começar",
    source: "navigation-shell-e2e",
    priority_reason: "Manter consistência no estudo.",
    confidence: "high",
    area: "CM",
  },
  backup_actions: [],
  today_load: {
    label: "leve",
    estimated_minutes: 5,
    recommended_limit_minutes: 30,
    overload_alert: false,
    short_message: "Carga leve para hoje.",
  },
  schedule_preview: {
    date: "2026-07-29",
    items: [],
    overdue_count: 0,
    hidden_count: 0,
    reschedule_recommended: false,
  },
  review_snapshot: {
    pending_reviews: 0,
    overdue_reviews: 0,
    cards_due: 0,
    estimated_minutes: 0,
  },
  progress_snapshot: {
    questions_done_week: 0,
    weekly_goal_questions: 300,
    weekly_progress_pct: 0,
    accuracy_pct: null,
  },
  details: {
    active_session: null,
    trainer_action: null,
    secondary_actions: [],
    schedule_suggestions_count: 0,
    evidence_confidence: "high",
  },
  missing_sources: [],
} satisfies StudentToday;

function navSidebar(page: Page) {
  return page.locator("aside").filter({ has: page.locator("[data-nav-surface='sidebar']") });
}

async function mockShellApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (method === "GET" && path === "/api/profile") {
      return json({
        user_id: "user_nav_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        shift_12h_capacity: 40,
        shift_24h_capacity: 20,
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
        // ⚠️ SEM ISTO O SHELL NUNCA MONTA.
        //
        // `resolveBlockingRoute` le' `cadastro_completo` ANTES de tudo: ausente,
        // ele e' falso, e o aluno e' mandado para `/cadastro/completar`. A tela
        // de destino pede endpoints que este mock nao cobre (o fallback e' 501),
        // entao ela fica em "CARREGANDO" para sempre -- e cada assercao sobre a
        // barra falhava com "element(s) not found", como se a navegacao tivesse
        // sumido.
        //
        // O portao do cadastro entrou em producao em 02/09; este mock e' de
        // agosto. Nao e' um campo opcional: e' o primeiro degrau da escada.
        cadastro_completo: true,
      });
    }

    // `/preferencias` carrega o FSRS SEM `.catch`: um 501 aqui derruba o
    // `Promise.all` inteiro, a tela vira estado de erro e nem a barra de acao
    // e' montada. Foi o que segurou o teste da barra inferior.
    if (method === "GET" && path === "/api/fsrs/config") {
      return json({ parameters: null, desired_retention: 0.9 });
    }

    if (method === "GET" && path === "/api/onboarding") {
      return json({
        contract_version: "student-onboarding-v1",
        state: "ready",
        next_step: "ready",
        completed_steps: ["objectives", "routine", "capacity"],
        has_selected_objectives: true,
        objectives_revision: 1,
        has_routine: true,
        has_availability: true,
        weekly_goal_questions: 300,
        study_availability: { 0: 10, 1: 20, 2: 60, 3: 35, 4: 0, 5: 60, 6: 35 },
        completed_at: "2026-07-29T12:00:00Z",
      });
    }

    if (method === "GET" && path === "/api/me") {
      return json({ user_id: "user_nav_e2e", display_name: "E2E User" });
    }

    if (method === "GET" && path === "/api/student/today") {
      return json(STUDENT_TODAY_FIXTURE);
    }

    if (method === "GET" && path === "/api/trainer/prescription/today") {
      return json({
        recommendation_id: "rec_nav_e2e",
        generated_at: new Date().toISOString(),
        policy_version: "test",
        primary_action: {
          kind: "question_block",
          title: "Treino leve",
          rationale: "Mock do shell de navegação.",
          priority_score: 1,
          estimated_minutes: 5,
          why_factors: [],
          outcome_targets: [],
          signals: [],
          start_payload: null,
          href: "/banco-de-questoes",
        },
        secondary_actions: [],
        state_summary: { headline: "Tudo em dia", detail: null },
        signals: [],
        closed_loop: { measure: [], next_check: [], recalibration_hint: [] },
        daily_load: {
          prescribed_minutes: 5,
          cognitive_load: "low",
          pending_reviews: 0,
          recommended_limit_minutes: 5,
          overload_alert: false,
        },
        plan_progress: { completed_actions: 0, total_actions: 1 },
        previous_outcome: null,
        missing_sources: [],
      });
    }

    if (
      method === "POST" &&
      path === "/api/trainer/recommendations/rec_nav_e2e/events"
    ) {
      return json({
        event_id: "event_nav_e2e_shown",
        recommendation_id: "rec_nav_e2e",
        event_type: "shown",
        occurred_at: "2026-07-29T12:00:00Z",
      });
    }

    if (method === "GET" && path === "/api/notes/operational/streak") {
      return json({
        streak_days: 0,
        streak_max: 0,
        streak_at_risk: false,
        streak_reviews: 0,
        streak_flashcards_seen: 0,
        weekly_study_days: 0,
        weekly_protected_days: 0,
        active_protection: false,
        protection_window_end: null,
      });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/overview") {
      return json({
        due_count: 0,
        new_count: 0,
        overdue_count: 0,
        total_eligible: 0,
        suggested_target_cards: 0,
        estimated_minutes: 0,
        reason_counts: [],
        by_area: [],
        priority_preview: [],
      });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/area-stats") {
      return json({
        total_notes: 0,
        total_reviews: 0,
        total_correct: 0,
        total_incorrect: 0,
        by_area: [],
      });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/session/daily-completed-cards") {
      return json({ timezone: "America/Sao_Paulo", by_day: [] });
    }

    if (method === "GET" && path === "/api/studies/performance-summary") {
      return json({ area_summaries: [], diagnosis: { ready: false, weaknesses: [] } });
    }

    if (method === "GET" && path === "/api/question-bank/sessions") {
      return json([]);
    }

    if (method === "GET" && path === "/api/question-bank/diagnosis/longitudinal") {
      return json({
        trap_sensitivity: 0,
        overconfidence_score: 0,
        impulsive_rate: 0,
        weak_node_ids: [],
        at_risk_node_ids: [],
        nodes: [],
      });
    }

    if (method === "GET" && path === "/api/reviews/agenda") {
      return json({
        tasks: [],
        due_question_total: 0,
        struggling_question_total: 0,
        question_review_total: 0,
        generated_at: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/api/schedule/generate") {
      return json({
        mode: "NORMAL",
        date: "2026-07-06",
        focus_minutes: 0,
        buffer_minutes: 0,
        total_planned_minutes: 0,
        recovery_mode: false,
        rebalance_required: false,
        reason: null,
        blocks: [],
      });
    }

    if (
      method === "GET" &&
      [
        "/api/events",
        "/api/notes/operational",
        "/api/reviews/tasks",
        "/api/schedule/suggestions",
        "/api/schedule/workload",
        "/api/studies/directed",
      ].includes(path)
    ) {
      return json([]);
    }

    return json({ detail: `Unhandled shell API mock: ${method} ${path}` }, 501);
  });
}

/**
 * Todo rotulo da linha de secoes cabe DENTRO do seu botao.
 *
 * ⚠️ MEDE A CAIXA, e nao o `<span>`. A versao anterior procurava
 * `item.locator("span")`, e isso so existe no desktop: o `IntentSubNav` envolve
 * o rotulo num span, o `MobileTabBar` o escreve como texto puro. No celular o
 * locator nunca resolvia e o teste morria em timeout de 90s — falhando por
 * marcacao, nao por medida.
 *
 * `scrollWidth > clientWidth` pergunta a coisa certa direto ao elemento: "o teu
 * conteudo passou da tua borda?". Vale nas duas superficies, e pega o que uma
 * contagem de caracteres nao pega — uma secao a mais repartindo o `flex-1`, ou
 * uma fonte que caiu no fallback com metrica mais larga.
 */
async function esperaCaberNaLinha(page: Page) {
  const itens = page.getByLabel("Seções desta área").locator("[data-nav-item-href]");
  const total = await itens.count();
  expect(total).toBeGreaterThan(0);
  for (let i = 0; i < total; i += 1) {
    const item = itens.nth(i);
    await expect(item).toBeVisible();
    const transbordo = await item.evaluate((el) => el.scrollWidth - el.clientWidth);
    const rotulo = (await item.textContent())?.trim() ?? "";
    expect(transbordo, `"${rotulo}" transborda o proprio botao`).toBeLessThanOrEqual(1);
  }
}

test.describe("Navigation shell", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockShellApi(page);
  });

  test("renders sidebar with consistent layout (visual regression)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");

    const sidebar = navSidebar(page);
    await expect(sidebar).toBeVisible();
    await expect(page.locator("[data-nav-surface='sidebar']").first()).toBeVisible();

    // Este teste ficou intermitente (~1 em 4) DENTRO do smoke, e passa 6/6
    // isolado. A diferenca nao e a fonte em si: e que ele e o primeiro teste do
    // primeiro spec da fila, entao paga o servidor frio — primeira compilacao de
    // rota, primeiro download de chunk, primeira carga da IBM Plex Mono. A
    // captura saia com a fonte de fallback, cuja metrica e bem diferente da mono,
    // e a diferenca estourava `maxDiffPixels` em texto que nao mudou.
    //
    // Recarrega uma vez para medir com tudo quente, e so entao espera a fonte.
    // Afrouxar o limiar esconderia regressao de layout de verdade; esperar mais
    // tempo no relogio nao sabe de fonte nenhuma.
    await page.reload();
    await expect(page.locator("[data-nav-surface='sidebar']").first()).toBeVisible();
    // ⚠️ ESPERA PELO CONTEUDO, e nao por um relogio.
    //
    // O `waitForTimeout(500)` sozinho ja capturou o ESQUELETO de carregamento:
    // a baseline virou quatro retangulos cinza, e um teste de regressao visual
    // que fotografa o skeleton passa sempre -- ele para de proteger justamente
    // a geometria que existe para proteger.
    //
    // O `<h1>` do Hoje so aparece com os dados na mao, entao ele e a prova de
    // que a tela montou.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("sidebar-layout.png", {
      maxDiffPixels: 100,
      animations: "disabled",
      // A MASCARA SAIU COM A SAUDACAO. Ela existia porque "Bom dia/Boa tarde/Boa
      // noite" mudava de largura com a hora e quebrava a baseline duas vezes por
      // dia. O cumprimento foi removido do Hoje em 2026-08-30 (a linha mais
      // valiosa da tela passou a dizer o TAMANHO DO DIA), e a manchete de agora
      // e' deterministica: ela sai dos numeros do mock.
    });
  });

  test("meets the automated WCAG gate on the Today shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/hoje");
    // Espera pela manchete, seja ela qual for: o gate aqui e' o `axe`, e ele
    // precisa da tela MONTADA. Casar o texto exato amarraria este teste a
    // redacao da frase — foi assim que a saudacao removida em agosto deixou
    // este gate vermelho sem que nada de acessibilidade tivesse mudado.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  // Rotas antigas continuam entrando pelo link de alguem; o que importa e' que
  // o menu acuse a intencao de DESTINO. `activeHref` e' o `intentPath` para onde
  // o 308 do next.config leva (ou, quando a rota e' real, o intent que
  // LEGACY_PATHS lhe atribui em navConfig.ts).
  // Com os CINCO destinos do prontuario, o Cronograma e a semana viraram SECOES
  // de Conduta — o artboard `14a` ja desenha "Minha semana" e "O plano ate' a
  // prova" como duas abas da MESMA tela. Por isso `/calendario`, `/desempenho` e
  // `/preferencias` voltam a acender `/hoje`, que e' o caminho da Conduta.
  //
  // `/caderno` saiu desta lista: ele leva a `/cards/registros`, e os flashcards
  // estao fora da barra enquanto `NEXT_PUBLIC_FLASHCARDS` for "0". Sem a secao
  // nao ha' item para acender, e o caso mediria zero.
  const desktopCases = [
    { path: "/hoje", activeHref: "/hoje" },
    { path: "/calendario", activeHref: "/hoje", landsOn: "/cronograma" },
    { path: "/revisoes", activeHref: "/banco", landsOn: "/banco/historico" }, // o historico e secao de Pratica
    { path: "/dados-e-relatorios/graficos", activeHref: "/evolucao" }, // 308 -> /evolucao
    { path: "/estatisticas/relatorio", activeHref: "/evolucao" }, // rota real, intent evolucao
    { path: "/banco/historico", activeHref: "/banco" }, // secao da Pratica
    // `/desempenho` encadeia DOIS saltos: `redirect("/cronograma")` no servidor
    // e o Cronograma agora e' secao de Conduta.
    { path: "/desempenho", activeHref: "/hoje", landsOn: "/cronograma" },
    // A semana tambem: ela e' o insumo do plano, e o `14a` cola as duas.
    { path: "/preferencias", activeHref: "/hoje" },
  ];

  for (const { path, activeHref, landsOn } of desktopCases) {
    test(`keeps sidebar active for ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      // Sem ancorar a URL final, a assercao podia rodar no meio da cadeia de
      // redirect e ver a sidebar ainda sem item ativo -- falha intermitente.
      if (landsOn) await page.waitForURL(`**${landsOn}`);

      const sidebar = navSidebar(page);
      await expect(sidebar).toBeVisible();

      const activeItems = sidebar.locator("[data-nav-surface='sidebar'][data-nav-active='true']");
      await expect(activeItems).toHaveCount(1);
      await expect(activeItems).toHaveAttribute("data-nav-item-href", activeHref);
      await expect(activeItems).toHaveAttribute("aria-current", "page");
    });
  }

  for (const legacyPath of ["/semana", "/today"]) {
    test(`redirects ${legacyPath} to /hoje`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(legacyPath);
      await expect(page).toHaveURL(/\/hoje$/);

      const sidebar = navSidebar(page);
      await expect(sidebar).toBeVisible();
      const activeItems = sidebar.locator("[data-nav-surface='sidebar'][data-nav-active='true']");
      await expect(activeItems).toHaveCount(1);
      await expect(activeItems).toHaveAttribute("data-nav-item-href", "/hoje");
    });
  }

  test("keeps long labels inside their container", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // ⚠️ A LINHA DE SECOES E' DA AREA ATUAL. Ela agora existe em `/hoje`, que
    // ganhou tres secoes (Hoje · Semana · Plano) quando a Conduta absorveu a
    // rotina — antes o Hoje nao tinha filhos e o locator resolvia zero
    // elementos, falhando por ausencia em vez de por estouro.
    await page.goto("/hoje");
    await navSidebar(page).hover();

    // O rotulo mais longo da navegacao e' "O plano ate' a prova", a secao da
    // Conduta que leva ao plano. Ele mora na linha de secoes -- onde os cinco
    // destinos ("Conduta", "Pratica", "Mapa", "Evolucao", "Voce") sao curtos
    // demais para exercitar o limite.
    //
    // ⚠️ O BOTAO USA O ROTULO CURTO ("Plano"), e e' por isso que ele cabe: a
    // linha do mobile e' `flex-1` sem rolagem, e em 390px tres botoes tem ~120px
    // cada. O titulo inteiro continua no topo da tela. Ver `navChildShortLabel`.
    const itemDoPlano = page
      .getByLabel("Seções desta área")
      // O filho aponta para `/plano` (a leitura do plano); `/cronograma` virou
      // o calendario, alcancavel de dentro dela.
      .locator("[data-nav-item-href='/plano']");
    await expect(itemDoPlano).toBeVisible();
    // O CONTRATO: o botao carrega o curto, e e' isto que faz caber.
    await expect(itemDoPlano.locator("span").first()).toHaveText("Plano");

    await esperaCaberNaLinha(page);

    // A linha da Pratica tem os dois rotulos mais longos que a navegacao
    // renderiza em producao — "Guardadas" e "Histórico", 9 caracteres cada.
    await page.goto("/banco");
    await expect(page.getByLabel("Seções desta área")).toBeVisible();
    await esperaCaberNaLinha(page);

    // ⚠️ O APERTO DE VERDADE E' EM 390px, e ele NAO se mede aqui: o
    // `beforeEach` deste bloco chama `forceDesktopNavigation`, entao encolher a
    // janela desenharia a sidebar de 224px num viewport de 390 e acusaria 120px
    // de estouro que o celular nunca ve. A medida mobile vive no bloco de baixo,
    // em "a linha de secoes cabe em 390px".
  });

  test("a sidebar expoe os cinco destinos, e o Cronograma vive na linha de filhos", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");

    const sidebar = navSidebar(page);
    await expect(sidebar).toBeVisible();

    // Cinco destinos, no vocabulario do prontuario: "conduta · pratica · mapa ·
    // evolucao · voce", iguais no celular e no desktop. O Mapa fica no MEIO de
    // proposito — ele e' o exame, o territorio que se olha antes de decidir.
    for (const href of ["/hoje", "/banco", "/mapa", "/evolucao", "/conta"]) {
      await expect(sidebar.locator(`[data-nav-item-href='${href}']`)).toHaveCount(1);
    }
    // `/cards` esta' fora enquanto a chave dos flashcards estiver desligada;
    // `/preferencias` e `/cronograma` viraram SECOES da Conduta, e nao destinos
    // proprios; os tres ultimos sao 308 e nunca foram destino.
    for (const href of ["/preferencias", "/cronograma", "/cards", "/kros", "/caderno", "/rota"]) {
      await expect(sidebar.locator(`[data-nav-item-href='${href}']`)).toHaveCount(0);
    }

    // E o plano continua a um clique -- agora sem trocar de aba, porque a linha
    // de secoes da Conduta e' desenhada no proprio `/hoje`.
    //
    // ⚠️ O TEXTO PROCURADO E' O CURTO. O botao carrega "Plano"; "O plano ate a
    // prova" e' o titulo da tela, e afirmar sobre ele aqui mediria zero.
    await expect(
      page.getByLabel("Seções desta área").getByText("Plano", { exact: true }),
    ).toBeVisible();
  });

  test("shows reciprocal top-right links on desktop child pages", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // `/caderno` saiu daqui junto com a aba Cards: com `NEXT_PUBLIC_FLASHCARDS`
    // desligada a rota e' 308 para `/hoje`, e o atalho reciproco nao existe.

    // O atalho "Ir para Hoje" do cabecalho do Cronograma saiu: Hoje e Cronograma
    // sao vizinhos no menu, e o atalho ensinava um segundo caminho para o mesmo
    // destino.
    await page.goto("/calendario");
    await expect(page.getByRole("link", { name: "Ir para Hoje" })).toHaveCount(0);

    await page.goto("/estatisticas/relatorio");
    await expect(page.getByRole("link", { name: "Desempenho" })).toHaveAttribute("href", "/estatisticas");
  });
});

// Era "Navigation shell mobile drawer". O drawer e o hamburguer foram
// aposentados: no mobile a navegacao agora e a barra inferior de cinco abas
// (`data-nav-surface='tabbar'`), com a linha de filhos logo acima dela.
test.describe("Navigation shell mobile tab bar", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockShellApi(page);
  });

  test("o hamburguer nao existe mais", async ({ page }) => {
    await page.goto("/hoje");
    await expect(page.locator("[data-nav-surface='tabbar']")).toBeVisible();
    await expect(page.getByLabel("Menu")).toHaveCount(0);
  });

  test("rota filha acende a aba do pai", async ({ page }) => {
    // `/banco/historico` e' filha de BANCO: a aba do pai acende, e nao um item
    // proprio. `isNavItemActive` casa por prefixo `/banco/`.
    //
    // Era `/cards/registros`, que deixou de servir: com a chave dos flashcards
    // desligada a aba Cards nao esta' na barra, entao nao ha' pai para acender.
    await page.goto("/banco/historico");

    const activeItems = page.locator("[data-nav-surface='tabbar-item'][data-nav-active='true']");
    await expect(activeItems).toHaveCount(1);
    await expect(activeItems).toHaveAttribute("data-nav-item-href", "/banco");
    await expect(activeItems).toHaveAttribute("aria-current", "page");
  });

  test("mostra os cinco destinos sem estouro horizontal", async ({ page }) => {
    await page.goto("/hoje");

    // Cinco a 390px sao 78px por aba — 13px a mais que os seis de antes, e e'
    // essa folga que deixa "Evolução" caber. O estouro horizontal e' o risco
    // real desta barra, e e' o que a ultima assercao mede.
    const tabs = page.locator("[data-nav-surface='tabbar'] [data-nav-item-href]");
    await expect(tabs).toHaveCount(5);
    for (const label of ["Conduta", "Prática", "Mapa", "Evolução", "Você"]) {
      await expect(tabs.getByText(label, { exact: true })).toBeVisible();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("nem Kros, nem Rota, nem Banco sobrevivem como rotulo de menu", async ({ page }) => {
    // "Kros" saiu primeiro (virou nome interno do motor); "Rota" saiu com a
    // propria aba; "Banco" saiu por descrever o ACERVO em vez do ato. Os
    // enderecos continuam 308 para o Hoje.
    //
    // ⚠️ `/rota` NAO VOLTA como URL. O 308 dele ja esta em producao, e o
    // navegador guarda 308 sem pedir de novo — reaproveitar o endereco
    // prenderia em `/hoje` exatamente quem ja usou o app.
    await page.goto("/hoje");
    const tabbar = page.locator("[data-nav-surface='tabbar']");
    for (const morto of ["Kros", "Rota", "Banco", "Rotina", "Conta", "Dados", "Treino"]) {
      await expect(tabbar.getByText(morto, { exact: true })).toHaveCount(0);
    }
    await expect(tabbar.locator("[data-nav-item-href='/rota']")).toHaveCount(0);
    await expect(tabbar.locator("[data-nav-item-href='/kros']")).toHaveCount(0);
  });

  test("a linha de secoes cabe em 390px", async ({ page }) => {
    // Tres botoes `flex-1` sem rolagem em 390px dao ~122px cada, e a Pratica
    // carrega os dois rotulos mais longos que a navegacao renderiza em producao:
    // "Guardadas" e "Histórico".
    //
    // ⚠️ E' AQUI que esta medida vale. O bloco de cima forca navegacao de
    // desktop no `beforeEach`, entao encolher a janela la desenha a sidebar de
    // 224px e acusa estouro que o celular nunca ve.
    await page.goto("/banco");
    await expect(page.getByLabel("Seções desta área")).toBeVisible();
    await esperaCaberNaLinha(page);

    const estouro = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(estouro).toBeLessThanOrEqual(1);
  });

  test("a linha de filhos aparece acima da barra e marca a secao atual", async ({ page }) => {
    await page.goto("/cronograma");
    const childRow = page.getByLabel("Seções desta área");
    await expect(childRow).toBeVisible();
    // As TRES secoes da Conduta: o dia, a semana que o dimensiona, e o plano.
    // `/cronograma` e' o calendario — ferramenta de dentro do plano, casada
    // pelo `matches` da secao dele.
    for (const secao of ["Hoje", "Semana", "Plano"]) {
      await expect(childRow.getByText(secao, { exact: true })).toBeVisible();
    }
    const active = childRow.locator("[aria-current='page']");
    await expect(active).toHaveCount(1);
    // ⚠️ O BOTAO CARREGA O ROTULO CURTO. "O plano ate a prova" e' o TITULO da
    // tela; afirmar o titulo aqui mediria a linha errada. Sao campos distintos
    // de proposito — ver `navChildShortLabel` em navConfig.ts.
    await expect(active).toHaveText("Plano");
  });

  test("a acao primaria segue a barra de abas quando ela se esconde", async ({ page }) => {
    // O DEFEITO QUE ESTE TESTE PRENDE, medido em `/preferencias`:
    // rolando ate o fim, a barra de abas animava para fora (topo 732 -> 855) e a
    // barra de acao ficava parada em 641-738, deixando 106px de faixa MORTA sob
    // o botao primario -- no unico lugar da tela que o polegar procura.
    //
    // A assercao que existia media `scrollWidth - clientWidth` do documento.
    // Estouro horizontal nao era o defeito, e por isso ela passava verde com o
    // botao flutuando.
    await page.goto("/preferencias");

    const acao = page.locator("[data-bottom-action-bar='true']");
    await expect(acao).toBeVisible();

    const barra = page.locator("[data-nav-surface='tabbar']");
    const alturaDaTela = page.viewportSize()?.height ?? 844;

    // Com a barra VISIVEL a acao assenta ACIMA dela, sem cobrir.
    const topoDaBarra = (await barra.boundingBox())?.y ?? 0;
    const acaoVisivel = await acao.boundingBox();
    expect(acaoVisivel).not.toBeNull();
    expect(acaoVisivel!.y + acaoVisivel!.height).toBeLessThanOrEqual(topoDaBarra + 2);

    // Rola ate o fim: a barra de abas sai de cena.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--nav-stack-shown")
          .trim() === "0",
      undefined,
      { timeout: 10_000 },
    );
    // A transicao do `bottom` acompanha a da barra; esperar por ela e' mais
    // barato que afrouxar a margem da assercao.
    await page.waitForTimeout(400);

    const acaoEscondida = await acao.boundingBox();
    expect(acaoEscondida).not.toBeNull();
    const faixaMorta = alturaDaTela - (acaoEscondida!.y + acaoEscondida!.height);
    expect(faixaMorta).toBeLessThanOrEqual(8);
  });

  test("a barra some no modo imersivo da sessao", async ({ page }) => {
    // `/banco/sessao/*` e imersivo: sem barra de topo e sem barra de abas, para
    // a leitura do enunciado ficar com a tela inteira.
    await page.goto("/banco/sessao/sessao-demo");
    await expect(page.locator("[data-nav-surface='tabbar']")).toHaveCount(0);
  });

  test("mantem os atalhos entre paginas irmas no mobile", async ({ page }) => {
    // O par Hoje<->Planejamento deixou de ser "Calendário" no topo. O rotulo
    // agora depende do estado do dia ("Ver plano completo" com plano, "Abrir
    // planejamento" vazio), entao o contrato verificado e' o destino, nao o
    // texto: de /hoje sempre se alcanca o cronograma.
    await page.goto("/hoje");
    await expect(page.locator('main a[href^="/cronograma"]').first()).toBeVisible();

    // O cabecalho do mobile nao repete os atalhos do desktop (que a suite ja
    // cobre em "shows reciprocal top-right links on desktop child pages"); o que
    // precisa valer aqui e' que a filha continue oferecendo volta ao pai.
    // `/caderno` saiu: 308 para `/hoje` enquanto os flashcards estiverem de
    // molho.

    await page.goto("/estatisticas/relatorio");
    await expect(page.locator('a[href^="/estatisticas"]').first()).toBeVisible();
  });
});
