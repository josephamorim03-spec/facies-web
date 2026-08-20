import { devices, expect, test, type Page } from "@playwright/test";
import { mockCronogramaApi } from "./support/cronogramaApiMock";
import { addHttpOnlySessionForPage } from "./support/authCookies";

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function mockBrowserClock(page: Page, fixedIso: string) {
  await page.addInitScript((iso) => {
    const RealDate = Date;
    const fixedNow = new RealDate(iso).getTime();
    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        const argCount = (args as unknown[]).length;
        if (argCount === 0) {
          super(fixedNow);
          return;
        }
        super(...args);
      }
      static now() {
        return fixedNow;
      }
    }
    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    window.Date = MockDate as unknown as DateConstructor;
  }, fixedIso);
}

async function assertCalendarViewportNoCutAndSmallGap(page: Page) {
  const viewport = page.locator("[data-calendar-viewport='true']");
  const grid = page.locator("[data-calendar-layer='active'] [data-allow-horizontal-swipe='true']").first();
  const lastCell = page.locator("[data-calendar-layer='active'] [data-calendar-last-cell='true']").first();

  await expect(viewport).toBeVisible();
  await expect(grid).toBeVisible();
  await expect(lastCell).toBeVisible();

  const [viewportBox, gridBox, lastCellBox] = await Promise.all([
    viewport.boundingBox(),
    grid.boundingBox(),
    lastCell.boundingBox(),
  ]);
  expect(viewportBox).not.toBeNull();
  expect(gridBox).not.toBeNull();
  expect(lastCellBox).not.toBeNull();
  if (!viewportBox || !gridBox || !lastCellBox) return;

  const viewportBottom = viewportBox.y + viewportBox.height;
  const gridBottom = gridBox.y + gridBox.height;
  const lastCellBottom = lastCellBox.y + lastCellBox.height;

  expect(lastCellBottom).toBeLessThanOrEqual(viewportBottom - 0.5);
  const gap = viewportBottom - gridBottom;
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(3.2);
}

test.describe("Cronograma mobile portrait UX", () => {
  const mobileDevice = devices["iPhone 13"];
  test.use({
    viewport: mobileDevice.viewport,
    userAgent: mobileDevice.userAgent,
    deviceScaleFactor: mobileDevice.deviceScaleFactor,
    isMobile: mobileDevice.isMobile,
    hasTouch: mobileDevice.hasTouch,
  });

  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("streak aparece como anel discreto no vertical", async ({ page }) => {
    await mockCronogramaApi(page);
    await page.goto("/cronograma");

    const streak = page.locator("[data-streak-mode='ring']");
    await expect(streak).toBeVisible();
    await expect(streak).toContainText(/12\s+dias seguidos/i);
    // Detalhes (recorde/revisões/cards) ficam na dica do anel, sem competir com o mês.
    await expect(page.locator("[data-streak-days]")).toHaveAttribute("title", /recorde/i);
    // Sem expandir/recolher: o anel é sempre a mesma marca discreta.
    await expect(page.getByTestId("streak-compact-trigger")).toHaveCount(0);
  });

  test("header vertical integra setas ao mes, remove botao numerico e abre seletor", async ({ page }) => {
    await mockCronogramaApi(page);
    await page.goto("/cronograma");

    const monthTitle = page.locator("[data-month-title='true']").first();
    await expect(monthTitle).toBeVisible();
    await expect(page.getByLabel(/M.s anterior/i).first()).toBeVisible();
    await expect(page.getByLabel(/Pr.ximo m.s/i).first()).toBeVisible();
    await expect(page.getByLabel("Ir para Hoje")).toBeVisible();
    await expect(page.getByRole("button", { name: /^\d{1,2}$/ })).toHaveCount(0);

    const monthTitleBox = await monthTitle.boundingBox();
    expect(monthTitleBox).not.toBeNull();

    await monthTitle.click();
    await expect(page.getByRole("dialog", { name: /Selecionar m.s e ano/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mês atual" })).toBeVisible();
    await page.getByLabel(/Fechar seletor/i).click({ force: true });

    await page.getByLabel("Buscar tema").click();

    const searchRow = page.locator("[data-crono-search-row='true']");
    const searchMonthRow = page.locator("[data-crono-search-month-row='true']");
    const actionButton = page.getByTestId("cronograma-search-action");
    const input = page.getByPlaceholder("Buscar tema...");
    await expect(searchRow).toBeVisible();
    await expect(searchMonthRow).toBeVisible();
    await expect(actionButton).toHaveCount(1);
    await expect(actionButton).toHaveAttribute("data-search-action", "back");
    await expect(page.getByLabel(/M.s anterior/i).first()).toBeVisible();
    await expect(page.getByLabel(/Pr.ximo m.s/i).first()).toBeVisible();

    const [searchRowBox, searchMonthRowBox] = await Promise.all([
      searchRow.boundingBox(),
      searchMonthRow.boundingBox(),
    ]);
    expect(searchRowBox).not.toBeNull();
    expect(searchMonthRowBox).not.toBeNull();
    if (searchRowBox && searchMonthRowBox) {
      expect(searchMonthRowBox.y).toBeGreaterThanOrEqual(searchRowBox.y + searchRowBox.height - 1);
    }

    const inputBox = await input.boundingBox();
    const actionBox = await actionButton.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    if (inputBox && actionBox) {
      expect(actionBox.x).toBeGreaterThan(inputBox.x + inputBox.width - 1);
    }

    await input.fill("asma");
    await expect(actionButton).toHaveAttribute("data-search-action", "clear");
    await expect(actionButton).toHaveCount(1);
    await expect(searchMonthRow).toBeVisible();
  });

  test("dia com revisao mostra icone de flashcards e evento passado (pontual e rotina) fica concluido sem drag", async ({ page }) => {
    await mockCronogramaApi(page);
    const pastISO = plusDays(todayISO(), -1);
    await page.goto("/cronograma");

    await expect(page.getByTestId("calendar-flashcards-icon").first()).toBeVisible();

    const pastOtherEventIcon = page.locator(`[data-testid='calendar-event-other-icon'][data-cell-iso='${pastISO}']`).first();
    await expect(pastOtherEventIcon).toBeVisible();
    await expect(pastOtherEventIcon).toHaveAttribute("data-event-status", "completed");
    await expect(pastOtherEventIcon).toHaveAttribute("draggable", "false");

    const pastRoutineIcon = page.locator(`[data-testid='calendar-event-work-icon'][data-cell-iso='${pastISO}']`).first();
    await expect(pastRoutineIcon).toBeVisible();
    await expect(pastRoutineIcon).toHaveAttribute("data-event-status", "completed");
    await expect(pastRoutineIcon).toHaveAttribute("draggable", "false");

    await pastRoutineIcon.dispatchEvent("dragstart");
    await expect(page.getByText("Soltar aqui para apagar")).toHaveCount(0);
  });

  test("sessao de cards adaptativos nao finalizada nao conta cards no dia do cronograma", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const pastISO = plusDays(todayISO(), -1);
    delete db.turboCardsByDate[pastISO];

    await page.goto("/cronograma");

    await expect(page.locator(`[data-testid='calendar-flashcards-icon'][data-cell-iso='${pastISO}']`)).toHaveCount(0);
  });

  test("tooltip de cards abre no clique e fecha por timeout ou interacao externa", async ({ page }) => {
    await mockCronogramaApi(page);
    await page.goto("/cronograma");

    const flashcardsIcon = page.getByTestId("calendar-flashcards-icon").first();
    await expect(flashcardsIcon).toBeVisible();
    const tooltip = flashcardsIcon.locator("span", { hasText: /Cards:\s*\d+/i });

    await flashcardsIcon.getByRole("button").click();
    await expect(tooltip).toHaveClass(/opacity-100/);

    await page.waitForTimeout(4100);
    await expect(tooltip).toHaveClass(/opacity-0/);

    await flashcardsIcon.getByRole("button").click();
    await expect(tooltip).toHaveClass(/opacity-100/);

    await page.mouse.click(5, 5);
    await expect(tooltip).toHaveClass(/opacity-0/);
  });

  test("meta semanal mostra percentual e permite edicao direta", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    await page.goto("/cronograma");

    const weeklyGoal = page.getByLabel("Progresso da meta semanal");
    await expect(weeklyGoal).toContainText(/150 de 300 quest/i);
    await expect(weeklyGoal).toContainText("50%");

    await weeklyGoal.getByRole("button", { name: /Editar meta semanal/i }).click();
    const dialog = page.getByRole("dialog", { name: "Editar meta semanal" });
    await expect(dialog).toBeVisible();
    await dialog.locator("input[type='number']").fill("550");
    await dialog.getByRole("button", { name: "Salvar" }).click();

    await expect.poll(() => db.weeklyGoal).toBe(550);
    await expect(weeklyGoal).toContainText(/150 de 550 quest/i);
  });

  test("card para revisar hoje explicita a fila global do banco", async ({ page }) => {
    await mockCronogramaApi(page);
    await page.goto("/cronograma");

    const panel = page.getByLabel("Para revisar hoje");
    await expect(panel).toContainText("1 tarefa · 3 questões na fila global do banco");
    await expect(panel).toContainText("fila global");

    await panel.getByRole("button", { name: /Expandir revisoes de hoje/i }).click();
    await expect(panel).toContainText("2 no ponto de revisao · 1 tambem em baixo desempenho");
  });

  test("detalhe do olho nao tem overflow lateral e dia com 5 marcadores nao exibe reticencias", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const selectedISO = todayISO();
    const baseStudy = db.studies.find(
      (study) => study.study_kind === "topic" && study.performed_at.startsWith(`${selectedISO}T`),
    );
    expect(baseStudy).toBeDefined();
    if (baseStudy) {
      db.studies.push(
        { ...baseStudy, study_id: "study_dense_1", theme: "Tema denso 1", correct_questions: 18 },
        { ...baseStudy, study_id: "study_dense_2", theme: "Tema denso 2", correct_questions: 17 },
        { ...baseStudy, study_id: "study_dense_3", theme: "Tema denso 3", correct_questions: 16 },
      );
    }
    await page.goto("/cronograma");

    await expect(page.locator(`[data-testid='calendar-day-overflow'][data-cell-iso='${selectedISO}']`)).toHaveCount(0);

    await page.locator(`[data-cell-iso='${selectedISO}']`).first().click();
    await page.getByTestId("calendar-action-eye").click();

    const detailContent = page.getByTestId("calendar-inline-day-detail-content");
    await expect(detailContent).toBeVisible();
    const hasHorizontalOverflow = await detailContent.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test("dia com 6 marcadores nao exibe reticencias", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const selectedISO = todayISO();
    const pendingTemplate = db.pendingTasks.find((task) => task.due_date === selectedISO);
    expect(pendingTemplate).toBeDefined();
    db.studies = db.studies.filter((study) => !study.performed_at.startsWith(`${selectedISO}T`));
    db.pendingTasks = db.pendingTasks.filter((task) => task.due_date !== selectedISO);
    if (pendingTemplate) {
      for (let index = 1; index <= 6; index += 1) {
        db.pendingTasks.push({
          ...pendingTemplate,
          task_id: `task_fixed_6_${index}`,
          source_study_id: `study_fixed_6_${index}`,
          theme: `Tema fixo 6 #${index}`,
        });
      }
    }
    await page.goto("/cronograma");
    await expect(page.locator(`[data-testid='calendar-day-overflow'][data-cell-iso='${selectedISO}']`)).toHaveCount(0);
  });

  test("com 7 marcadores aumenta a altura da semana sem reticencias", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const selectedISO = todayISO();
    const pendingTemplate = db.pendingTasks.find((task) => task.due_date === selectedISO);
    expect(pendingTemplate).toBeDefined();
    db.studies = db.studies.filter((study) => !study.performed_at.startsWith(`${selectedISO}T`));
    db.pendingTasks = db.pendingTasks.filter((task) => task.due_date !== selectedISO);
    if (pendingTemplate) {
      for (let index = 1; index <= 7; index += 1) {
        db.pendingTasks.push({
          ...pendingTemplate,
          task_id: `task_fixed_7_${index}`,
          source_study_id: `study_fixed_7_${index}`,
          theme: `Tema fixo 7 #${index}`,
        });
      }
    }

    await page.goto("/cronograma");

    await expect(page.locator(`[data-testid='calendar-day-overflow'][data-cell-iso='${selectedISO}']`)).toHaveCount(0);
    await expect(page.locator(`[data-cell-iso='${selectedISO}'] [data-testid='calendar-day-dot']`)).toHaveCount(7);
    await assertCalendarViewportNoCutAndSmallGap(page);
  });

  test("clicar em revisao concluida abre popup de resumo readonly", async ({ page }) => {
    await mockCronogramaApi(page);
    const doneISO = plusDays(todayISO(), -1);
    await page.goto("/cronograma");

    await page.locator(`[data-cell-iso='${doneISO}'] [data-dot-kind='done']`).first().click();

    await expect(page.getByText("Revisao concluida")).toBeVisible();
    await expect(page.getByText("15/20")).toBeVisible();
    await expect(page.getByText("75%")).toBeVisible();
  });

  test("clicar em estudo inicial e prova concluida abre popup correto", async ({ page }) => {
    await mockCronogramaApi(page);
    const selectedISO = todayISO();
    const examISO = plusDays(selectedISO, 1);
    await page.goto("/cronograma");

    await page.locator(`[data-cell-iso='${selectedISO}'] [data-dot-kind='initial']`).first().click();
    await expect(page.getByText("CM · Estudo inicial")).toBeVisible();
    await expect(page.getByText("20/30")).toBeVisible();
    await expect(page.getByText("67%")).toBeVisible();

    await page.mouse.click(5, 5);

    await page.locator(`[data-cell-iso='${examISO}'] [data-dot-kind='full_exam']`).first().click();
    await expect(page.getByText("MULTI · Acesso Direto · 2026")).toBeVisible();
    await expect(page.getByText("70/100")).toBeVisible();
    await expect(page.getByText("Acesso Direto")).toBeVisible();
  });

  // O contrato inverteu: antes o aviso de risco DEVIA aparecer depois das 20h.
  // Agora ele nao existe em hora nenhuma. Vigiar o relogio para pintar a
  // sequencia de vermelho e' aversao a perda, e o produto se posiciona contra
  // mecanica que gera ansiedade (`docs/product/positioning.md`).
  //
  // O horario continua sendo variado de proposito: e' justamente depois das 20h
  // que o aviso aparecia, entao esse e' o caso que prova a remocao.
  for (const [rotulo, instante] of [
    ["antes das 20h", "2026-04-24T19:00:00-03:00"],
    ["depois das 20h", "2026-04-24T20:05:00-03:00"],
  ] as const) {
    test(`sequencia nunca sinaliza risco — ${rotulo}`, async ({ page }) => {
      await mockBrowserClock(page, instante);
      const { db } = await mockCronogramaApi(page);
      db.streak.streak_at_risk = true;
      await page.goto("/cronograma");

      await expect(page.locator("[data-streak-mode='ring']")).toBeVisible();
      await expect(page.locator("[data-streak-at-risk='true']")).toHaveCount(0);
      await expect(page.locator("[data-streak-mode='ring']")).not.toContainText(/em risco/i);
    });
  }

  test("acoes olho/+ e fluxo de compromisso no +", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const selectedISO = todayISO();
    await page.goto("/cronograma");

    await page.locator(`[data-cell-iso='${selectedISO}']`).first().click();

    const actionMode = page.getByTestId("calendar-action-mode");
    await expect(actionMode).toHaveAttribute("data-calendar-action-mode", "idle");
    await expect(page.getByTestId("calendar-action-eye")).toBeVisible();
    await expect(page.getByTestId("calendar-action-plus")).toBeVisible();

    await page.getByTestId("calendar-action-eye").click();
    await expect(actionMode).toHaveAttribute("data-calendar-action-mode", "detail");
    await expect(page.getByTestId("calendar-action-eye")).toBeVisible();
    await expect(page.getByTestId("calendar-action-plus")).toHaveCount(0);

    await page.getByTestId("calendar-action-eye").click();
    await expect(actionMode).toHaveAttribute("data-calendar-action-mode", "idle");

    await page.getByTestId("calendar-action-plus").click();
    await expect(actionMode).toHaveAttribute("data-calendar-action-mode", "create");
    await expect(page.getByTestId("calendar-action-plus")).toBeVisible();
    await expect(page.getByTestId("calendar-action-eye")).toHaveCount(0);

    const segment = page.getByTestId("create-mode-segment");
    await expect(segment).toBeVisible();
    await expect(segment).toHaveClass(/divide-x/);
    await expect(segment).toContainText("Estudo");
    await expect(segment).toContainText("Prova");
    await expect(segment).toContainText("Compromisso");
    await expect(page.getByRole("button", { name: /^Salvar$/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Adicionar$/ })).toBeVisible();

    await page.locator("[data-mode-value='full_exam']").click();
    await expect(page.getByRole("button", { name: /^Adicionar$/ })).toBeVisible();

    await page.locator("[data-mode-value='event']").click();
    await expect(page.getByTestId("compromisso-form-fields")).toBeVisible();
    await expect(page.locator("input[type='date']")).toHaveCount(0);

    await page.getByRole("button", { name: "Outros" }).click();
    await page.getByPlaceholder("Ex. Imprevisto/Viagem").fill("Viagem curta");
    await page.locator("select").last().selectOption("4");

    const previousEvents = db.events.length;
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect.poll(() => db.events.length).toBe(previousEvents + 1);
    const created = db.events[db.events.length - 1];
    expect(created.event_type).toBe("event");
    expect(created.event_date).toBe(selectedISO);
    expect(created.duration_hours).toBe(4);
    expect(created.label.startsWith("__OTHER__:")).toBeTruthy();
  });

  test("mes de 6 linhas com olho aberto nao corta ultima linha e nao cria espaco morto", async ({ page }) => {
    await mockBrowserClock(page, "2026-03-15T12:00:00-03:00");
    await mockCronogramaApi(page);
    await page.goto("/cronograma");

    const viewport = page.locator("[data-calendar-viewport='true']");
    await expect(viewport).toHaveAttribute("data-calendar-active-rows", "6");

    const selectedISO = "2026-03-15";
    await page.locator(`[data-cell-iso='${selectedISO}']`).first().click();
    await page.getByTestId("calendar-action-eye").click();
    await expect(page.getByTestId("calendar-inline-day-detail")).toBeVisible();

    await assertCalendarViewportNoCutAndSmallGap(page);
  });
});

test.describe("Cronograma mobile landscape UX", () => {
  const mobileDevice = devices["iPhone 13"];
  test.use({
    viewport: { width: 844, height: 390 },
    userAgent: mobileDevice.userAgent,
    deviceScaleFactor: mobileDevice.deviceScaleFactor,
    isMobile: mobileDevice.isMobile,
    hasTouch: mobileDevice.hasTouch,
  });

  test.beforeEach(async ({ page }) => {
    await mockCronogramaApi(page);
    await addHttpOnlySessionForPage(page);
  });

  test("streak permanece como anel discreto no horizontal", async ({ page }) => {
    await page.goto("/cronograma");

    const streak = page.locator("[data-streak-mode='ring']");
    await expect(streak).toBeVisible();
    await expect(streak).toContainText(/dias seguidos/i);
    // Recorde/revisões/cards seguem disponíveis na dica do anel.
    await expect(page.locator("[data-streak-days]")).toHaveAttribute("title", /cards/i);
    await expect(page.getByTestId("streak-compact-trigger")).toHaveCount(0);
  });
});
