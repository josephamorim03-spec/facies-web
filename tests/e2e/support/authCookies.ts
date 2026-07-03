import type { BrowserContext, Page } from "@playwright/test";

const E2E_BASE_URL = "http://127.0.0.1:3000";

export async function addHttpOnlySession(context: BrowserContext, value = "session_e2e") {
  await context.addCookies([
    {
      name: "krosmed_session",
      value,
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function addHttpOnlySessionForPage(page: Page, value = "session_e2e") {
  await addHttpOnlySession(page.context(), value);
}
