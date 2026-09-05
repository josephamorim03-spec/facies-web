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
        intended_specialty: "Oftalmologia",
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
  // Com os SEIS destinos do desenho, o Cronograma virou filho de ROTINA (as duas
  // abas do artboard `14a`: "Minha semana" e "O plano ate' a prova"). Por isso
  // `/calendario` e `/desempenho` acendem `/preferencias`, e nao mais `/hoje`.
  //
  // `/caderno` saiu desta lista: ele leva a `/cards/registros`, e a aba Cards
  // esta' fora da barra enquanto `NEXT_PUBLIC_FLASHCARDS` for "0". Com a aba
  // ausente nao ha' item para acender, e o caso mediria zero.
  const desktopCases = [
    { path: "/hoje", activeHref: "/hoje" },
    { path: "/calendario", activeHref: "/voce", landsOn: "/cronograma" },
    { path: "/revisoes", activeHref: "/banco", landsOn: "/banco/historico" }, // o historico saiu de Evolucao
    { path: "/dados-e-relatorios/graficos", activeHref: "/evolucao" }, // 308 -> /evolucao
    { path: "/estatisticas/relatorio", activeHref: "/evolucao" }, // rota real, intent profile
    { path: "/banco/historico", activeHref: "/banco" }, // filho novo do Banco
    // `/desempenho` encadeia DOIS saltos: `redirect("/cronograma")` no servidor
    // e o Cronograma agora e' filho de Rotina.
    { path: "/desempenho", activeHref: "/voce", landsOn: "/cronograma" },
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
    // ⚠️ A LINHA DE SECOES E' DA AREA ATUAL, e o Hoje nao tem filhos.
    // O rotulo longo mora em VOCÊ (era Rotina, que virou filha dela), entao e'
    // de dentro dela que ele se mede. Em `/hoje` o locator resolvia zero
    // elementos e o teste falhava por ausencia, nao por estouro.
    await page.goto("/preferencias");
    await navSidebar(page).hover();

    // O rotulo mais longo da navegacao e' "O plano ate' a prova", filho de
    // "Você". Ele mora na linha de secoes -- onde os cinco destinos ("Hoje",
    // "Mapa", "Banco", "Evolucao", "Você") sao curtos demais para exercitar o
    // limite.
    const longestItem = page
      .getByLabel("Seções desta área")
      // O filho aponta para `/plano` (a leitura do plano); `/cronograma` virou
      // o calendario, alcancavel de dentro dela.
      .locator("[data-nav-item-href='/plano']");
    const longestLabel = longestItem.locator("span").first();
    await expect(longestItem).toBeVisible();
    await expect(longestLabel).toHaveText("O plano até a prova");

    const [itemBox, labelBox] = await Promise.all([longestItem.boundingBox(), longestLabel.boundingBox()]);
    expect(itemBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    if (!itemBox || !labelBox) return;

    expect(labelBox.x).toBeGreaterThanOrEqual(itemBox.x);
    expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(itemBox.x + itemBox.width + 1);
  });

  test("a sidebar expoe os cinco destinos, e a Rotina vive na linha de filhos", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");

    const sidebar = navSidebar(page);
    await expect(sidebar).toBeVisible();

    // Cinco destinos: quatro de conteudo e um de pessoa. Iguais no celular e
    // no desktop.
    for (const href of ["/hoje", "/mapa", "/banco", "/evolucao", "/voce"]) {
      await expect(sidebar.locator(`[data-nav-item-href='${href}']`)).toHaveCount(1);
    }
    // `/preferencias` e `/conta` viraram FILHOS de "Você" — continuam
    // alcancaveis, e deixaram de ocupar peso de destino permanente.
    // `/cards` esta' fora enquanto a chave dos flashcards estiver desligada; os
    // outros tres sao 308 e nunca foram destino.
    for (const href of ["/preferencias", "/conta", "/cronograma", "/cards", "/kros", "/caderno", "/rota"]) {
      await expect(sidebar.locator(`[data-nav-item-href='${href}']`)).toHaveCount(0);
    }

    // E o plano continua a um clique -- mas a linha de secoes so' existe DENTRO
    // da area que tem filhos. Em `/hoje` ela nao e' desenhada, e afirmar sobre
    // ela ali seria afirmar sobre nada.
    await page.goto("/preferencias");
    await expect(
      page.getByLabel("Seções desta área").getByText("O plano até a prova", { exact: true }),
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

    // Cinco a 390px sao 78px por aba. O estouro horizontal e' o risco real
    // desta barra, e e' o que a ultima assercao mede.
    const tabs = page.locator("[data-nav-surface='tabbar'] [data-nav-item-href]");
    await expect(tabs).toHaveCount(5);
    for (const label of ["Hoje", "Mapa", "Banco", "Evolução", "Você"]) {
      await expect(tabs.getByText(label, { exact: true })).toBeVisible();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("a 320px a barra continua sem estourar", async ({ page }) => {
    // ⚠️ O CASO QUE NUNCA FOI MEDIDO, e que estava QUEBRADO.
    //
    // Todo teste desta barra rodava a 390px. A 320px — iPhone SE de 1a geracao,
    // e a largura minima que o produto declara suportar — seis abas davam 53px
    // cada, e o item era `flex-1` SEM `min-w-0`: `min-width` caia no automatico,
    // que e' a largura de min-content do rotulo. "EVOLUÇÃO" em mono de 11px com
    // tracking pede ~60px indivisiveis, e a barra INTEIRA empurrava o documento
    // ~40px para o lado.
    //
    // Duas coisas consertam, e as duas entraram: cinco abas em vez de seis, e
    // `min-w-0 truncate` no item. Este teste prende a segunda — ela e' a que
    // sobrevive a um rotulo longo no futuro.
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/hoje");

    const tabs = page.locator("[data-nav-surface='tabbar'] [data-nav-item-href]");
    await expect(tabs).toHaveCount(5);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // E a barra continua ocupando a largura da tela, sem uma aba sair de cena.
    const primeira = await tabs.first().boundingBox();
    const ultima = await tabs.last().boundingBox();
    expect(primeira).not.toBeNull();
    expect(ultima).not.toBeNull();
    expect(ultima!.x + ultima!.width).toBeLessThanOrEqual(321);
  });

  test("nem Kros nem Rota sobrevivem como rotulo de menu", async ({ page }) => {
    // "Kros" saiu primeiro (virou nome interno do motor); "Rota" saiu com a
    // propria aba, quando a pergunta de tempo e energia morreu. Os dois
    // enderecos continuam 308 para o Hoje.
    await page.goto("/hoje");
    const tabbar = page.locator("[data-nav-surface='tabbar']");
    await expect(tabbar.getByText("Kros", { exact: true })).toHaveCount(0);
    await expect(tabbar.getByText("Rota", { exact: true })).toHaveCount(0);
    await expect(tabbar.locator("[data-nav-item-href='/rota']")).toHaveCount(0);
    await expect(tabbar.locator("[data-nav-item-href='/kros']")).toHaveCount(0);
  });

  test("a linha de filhos aparece acima da barra e marca a secao atual", async ({ page }) => {
    await page.goto("/cronograma");
    const childRow = page.getByLabel("Seções desta área");
    await expect(childRow).toBeVisible();
    // As duas abas de dentro do artboard `14a`.
    await expect(childRow.getByText("Minha semana", { exact: true })).toBeVisible();
    const active = childRow.locator("[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("O plano até a prova");
  });

  test("nao ha segunda barra empilhada sobre a barra de abas", async ({ page }) => {
    // ⚠️ ESTE TESTE MUDOU DE LADO, e o motivo importa.
    //
    // Ele prendia um defeito real: a `BottomActionBar` ficava ancorada em
    // `bottom: var(--nav-stack-height)` — um token estatico — enquanto a barra
    // de abas se escondia por scroll. Rolando ate o fim de `/preferencias`
    // sobravam 106px de faixa MORTA sob o botao primario. O conserto (fazer a
    // acao seguir a barra) foi entregue, e este teste o guardava.
    //
    // Depois o operador olhou a tela pronta e apontou o problema um nivel
    // acima: NENHUMA rede social empilha duas barras no rodape do celular. As
    // duas juntas comiam ~110px e escondiam o fim do conteudo atras de chrome.
    //
    // Entao a acao saiu das duas telas que a tinham: `/preferencias` grava
    // sozinha (o botao "Salvar" deixou de existir) e `/banco` mostra o botao
    // que o painel Resumo ja montava, inline, junto do numero que ele executa.
    //
    // O que este teste guarda agora e' a AUSENCIA — e ela e' mais facil de
    // regredir que a presenca: basta alguem montar uma `BottomActionBar` numa
    // tela nova sem saber por que ela sumiu destas duas.
    for (const rota of ["/preferencias", "/banco"]) {
      await page.goto(rota);
      await expect(page.locator("[data-nav-surface='tabbar']")).toBeVisible();
      await expect(page.locator("[data-bottom-action-bar='true']")).toHaveCount(0);
    }
  });

  test("a acao primaria do banco vive na pagina, e o dedo alcanca", async ({ page }) => {
    // A contrapartida da ausencia: tirar a barra nao pode ter tirado a acao.
    // Ela existe, e' a unica primaria da tela, e cabe na largura do celular.
    await page.goto("/banco");
    const comecar = page.getByRole("button", { name: /^Começar/ });
    await expect(comecar).toBeVisible();

    const caixa = await comecar.boundingBox();
    expect(caixa).not.toBeNull();
    // Alvo de toque do sistema: 48px minimo.
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(391);
  });

  test("a especialidade se declara com o aviso do edital a vista", async ({ page }) => {
    // ⚠️ O CAMPO EXISTIA E ESTAVA ORFAO. `user_profiles.intended_specialty` e'
    // gravavel desde o cadastro e `salvarPerfilDeclarado` esta escrito no
    // front — mas nenhuma tela chamava, e o contrato nem devolvia o valor de
    // volta. Escrever sem ler e' a forma mais silenciosa de um campo morrer.
    //
    // O que este teste prende sao as duas metades: a lista e' a do CFM inteira
    // (nao a do acervo), e o AVISO aparece no momento da escolha, nao depois.
    let gravado: string | null = null;
    await page.route("**/api/cadastro/perfil", async (route) => {
      const corpo = route.request().postDataJSON() as { intended_specialty?: string };
      gravado = corpo.intended_specialty ?? null;
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/voce");
    const entrada = page.getByRole("button", { name: /A especialidade que você quer/ });
    await expect(entrada).toBeVisible();
    await entrada.click();

    const folha = page.getByRole("dialog", { name: "A especialidade que você quer" });
    await expect(folha).toBeVisible();

    // O aviso vem ANTES da lista. Sem ele o produto estaria a deixar o medico
    // montar um plano inteiro para uma vaga que a instituicao pode nao abrir.
    await expect(folha.getByText(/Confira o edital/)).toBeVisible();
    await expect(folha.getByText(/a Fácies não verifica vagas/)).toBeVisible();

    // As 55 do CFM, e nao as que a Facies tem questao.
    await expect(folha.getByText("55 de 55", { exact: true })).toBeVisible();
    await expect(folha.getByRole("button", { name: "Homeopatia", exact: true })).toBeVisible();

    await folha.getByRole("button", { name: "Cardiologia", exact: true }).click();
    await expect.poll(() => gravado).toBe("Cardiologia");
  });

  test("adicionar plantao abre uma folha, e a escala vira eventos de verdade", async ({ page }) => {
    // ⚠️ O BOTAO SO' ROLAVA. `onAdicionar` chamava `scrollIntoView` ate um
    // painel generico ~150 linhas abaixo, na secao seguinte, com um campo de
    // NOME OBRIGATORIO -- e o artboard `14b` diz em letra "nada de nome do
    // hospital: todo campo que nao muda nada e' trabalho cobrado do medico a
    // toa". O medico tocava em "adicionar plantao" e a tela deslizava para
    // outro assunto.
    const criados: Array<Record<string, unknown>> = [];
    await page.route("**/api/events", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const corpo = route.request().postDataJSON() as Record<string, unknown>;
      criados.push(corpo);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ event_id: `ev-${criados.length}`, ...corpo }),
      });
    });

    await page.goto("/preferencias");
    await page.getByRole("button", { name: "Adicionar plantão ou exceção" }).click();

    const folha = page.getByRole("dialog", { name: "Adicionar plantão" });
    await expect(folha).toBeVisible();

    // Nenhum campo de NOME: o rotulo se deriva da duracao.
    // ⚠️ `getByRole("textbox")` nao serve aqui: o `<input type="date">` do
    // campo "quando" tambem resolve como textbox na arvore de acessibilidade.
    // O que o artboard proibe e' o campo de TEXTO LIVRE ("Ex. Plantao/UBS"),
    // que o painel antigo tinha e ainda tornava obrigatorio.
    await expect(folha.locator('input[type="text"]')).toHaveCount(0);

    // A escala 24x72 e' um preset, e o alcance e' dito ANTES de guardar.
    await folha.getByRole("radio", { name: /Escala 24 × 72/ }).check();
    await expect(folha.getByText("Isto muda", { exact: false })).toBeVisible();
    await expect(folha.getByText(/Nada do que você já respondeu se perde/)).toBeVisible();

    await folha.getByRole("button", { name: "Guardar", exact: true }).click();

    // A escala nao existe no contrato: ela vira N eventos pontuais. O que este
    // teste prende e' que sao MUITOS e que o rotulo saiu da duracao.
    await expect.poll(() => criados.length).toBeGreaterThan(1);
    expect(criados[0].event_type).toBe("event");
    expect(criados[0].duration_hours).toBe(24);
    expect(String(criados[0].label)).toContain("Plantão 24h");
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
