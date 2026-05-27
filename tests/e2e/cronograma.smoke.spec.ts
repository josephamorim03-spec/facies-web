import { expect, test } from "@playwright/test";
import { currentTodayISO, mockCronogramaApi } from "./support/cronogramaApiMock";
import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

async function mockBrowserClock(page: import("@playwright/test").Page, fixedIso: string) {
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

async function expectCenteredOnX(
  container: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> },
  target: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> },
  tolerancePx = 12,
) {
  const containerBox = await container.boundingBox();
  const targetBox = await target.boundingBox();
  expect(containerBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (!containerBox || !targetBox) return;

  const containerCenterX = containerBox.x + containerBox.width / 2;
  const targetCenterX = targetBox.x + targetBox.width / 2;
  expect(Math.abs(containerCenterX - targetCenterX)).toBeLessThanOrEqual(tolerancePx);
}

async function assertCalendarViewportNoCutAndSmallGap(page: import("@playwright/test").Page) {
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

test.describe("Cronograma smoke", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockCronogramaApi(page);
  });

  test("abre cronograma, navega mes, abre detalhe e modal de estudo", async ({ page }) => {
    const today = currentTodayISO();
    const previousMonthLabel = /M.s anterior/i;
    const nextMonthLabel = /Pr.ximo m.s/i;

    await page.goto("/cronograma");
    await expect(page.getByLabel(previousMonthLabel)).toBeVisible();
    await expect(page.getByLabel(nextMonthLabel)).toBeVisible();

    const monthNav = page.locator("[data-month-nav='true']");
    const monthTitle = page.locator("[data-month-title='true']");
    await expect(monthNav).toBeVisible();
    await expect(monthTitle).toBeVisible();
    await expectCenteredOnX(monthNav, monthTitle, 64);

    await page.getByLabel(nextMonthLabel).click();
    await expectCenteredOnX(monthNav, monthTitle, 64);
    await page.getByLabel(previousMonthLabel).click();
    await expectCenteredOnX(monthNav, monthTitle, 64);

    const compactSummary = page.locator("[data-weekly-compact-summary='true']").first();
    await expect(compactSummary).toBeVisible();
    await expect(compactSummary).toHaveAttribute("data-compact-layout", "centered");
    await expect(compactSummary.getByText("Meta")).toBeVisible();
    await expect(compactSummary.getByText("Ritmo")).toBeVisible();
    await expect(compactSummary.getByText("Risco")).toHaveCount(0);
    await expect(compactSummary.locator("[data-warning-tone]")).toHaveAttribute("data-warning-tone", /(none|yellow|orange|red)/);
    await expect(compactSummary.locator("[data-risk-level]")).toHaveAttribute("data-risk-level", /(low|medium|high)/);
    await expect(compactSummary.locator("[data-compact-meta='true']")).toBeVisible();
    await expect(compactSummary.locator("[data-compact-rhythm='true']")).toBeVisible();

    const compactDivider = compactSummary.locator("[data-compact-divider='true']");
    await expect(compactDivider).toBeVisible();
    await expectCenteredOnX(compactSummary, compactDivider);

    const draggableEventIcon = page
      .locator(`[data-calendar-layer='active'] [data-cell-iso="${today}"] [draggable="true"]`)
      .first();
    if (await draggableEventIcon.count()) {
      await expect(draggableEventIcon).toBeVisible();
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      await draggableEventIcon.dispatchEvent("dragstart", { dataTransfer });
      const deleteZone = page.locator("[data-event-delete-zone='1']");
      await expect(deleteZone).toBeVisible({ timeout: 2000 });

      const deleteZoneBox = await deleteZone.boundingBox();
      const summaryBoxWithDeleteZone = await compactSummary.boundingBox();
      expect(deleteZoneBox).not.toBeNull();
      expect(summaryBoxWithDeleteZone).not.toBeNull();
      if (deleteZoneBox && summaryBoxWithDeleteZone) {
        expect(summaryBoxWithDeleteZone.y).toBeGreaterThanOrEqual(deleteZoneBox.y + deleteZoneBox.height - 1);
      }
      await draggableEventIcon.dispatchEvent("dragend", { dataTransfer });
    }

    await page.getByLabel("Ir para hoje").click();
    const todayCell = page.locator(`[data-cell-iso="${today}"]`).first();
    await expect(todayCell).toBeVisible();
    await todayCell.click();
    await page.getByLabel("Ver atividades do dia").click();
    const dayDetailHeading = today.split("-").reverse().join("-");
    await expect(page.getByRole("heading", { name: dayDetailHeading })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar" }).first()).toBeVisible();
  });

  test("abre agenda operacional pela rota dedicada", async ({ page }) => {
    await page.goto("/agenda-operacional");
    await expect(page).toHaveURL(/\/agenda-operacional$/);
    await expect(page.getByLabel(/M.s anterior/i)).toBeVisible();
  });

  test("setas usam transicao continua e ajustam altura entre meses 6->5->6", async ({ page }) => {
    await mockBrowserClock(page, "2026-03-15T12:00:00-03:00");

    await page.goto("/cronograma");

    const viewport = page.locator("[data-calendar-viewport='true']");
    const nextMonthLabel = /Pr.ximo m.s/i;
    const previousMonthLabel = /M.s anterior/i;

    await expect(viewport).toHaveAttribute("data-calendar-active-rows", "6");
    const heightBefore = (await viewport.boundingBox())?.height ?? 0;
    expect(heightBefore).toBeGreaterThan(0);
    await assertCalendarViewportNoCutAndSmallGap(page);

    await page.getByLabel(nextMonthLabel).click();
    await expect(viewport).toHaveAttribute("data-calendar-transition-phase", /(idle|animating)/);
    await expect(viewport).toHaveAttribute("data-calendar-transition-direction", /(none|next)/);

    await page.waitForTimeout(380);
    await expect(viewport).toHaveAttribute("data-calendar-transition-phase", "idle");
    await expect(viewport).toHaveAttribute("data-calendar-active-rows", "5");
    const heightAfterNext = (await viewport.boundingBox())?.height ?? 0;
    expect(heightAfterNext).toBeGreaterThan(0);
    expect(Math.abs(heightAfterNext - heightBefore)).toBeGreaterThan(1);
    await assertCalendarViewportNoCutAndSmallGap(page);

    await page.getByLabel(previousMonthLabel).click();
    await expect(viewport).toHaveAttribute("data-calendar-transition-phase", /(idle|animating)/);
    await expect(viewport).toHaveAttribute("data-calendar-transition-direction", /(none|prev)/);

    await page.waitForTimeout(380);
    await expect(viewport).toHaveAttribute("data-calendar-transition-phase", "idle");
    await expect(viewport).toHaveAttribute("data-calendar-active-rows", "6");
    const heightAfterPrev = (await viewport.boundingBox())?.height ?? 0;
    expect(heightAfterPrev).toBeGreaterThan(0);
    await assertCalendarViewportNoCutAndSmallGap(page);
  });
});

