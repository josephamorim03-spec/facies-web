import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";

// Precisa seguir a baseURL do playwright.config: fixar `localhost` enquanto o
// runner serve em `127.0.0.1` grava o cookie em outra origem, e o teste falha
// por host, nao por comportamento de auth.
const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const E2E_BROWSER_URL = E2E_BASE_URL;

test.describe("Auth proxy + cookies", () => {
  test("redirects protected route to login when auth cookies are missing", async ({ page }) => {
    // `/cronograma` voltou a ser a canonica, entao o `next` guardado no login e'
    // ela mesma.
    await page.goto("/cronograma");
    await expect(page).toHaveURL(/\/login\?next=%2Fcronograma$/);
  });

  test("/api/version remains publicly accessible", async ({ request }) => {
    const response = await request.get("/api/version");
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload).toHaveProperty("commit_sha");
    expect(payload).toHaveProperty("build_time_utc");
    expect(payload).toHaveProperty("environment");
  });

  test("allows protected route with only the HttpOnly session cookie", async ({ context, page }) => {
    await addHttpOnlySession(context);

    await page.goto("/cronograma");

    await expect(page).toHaveURL(/\/cronograma$/);
  });

  test("logout endpoint clears both client and server auth cookies", async ({ context, page }) => {
    await context.addCookies([
      {
        name: "krosmed_token",
        value: "token_e2e",
        url: E2E_BROWSER_URL,
      },
      {
        name: "krosmed_session",
        value: "session_e2e",
        url: E2E_BROWSER_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
      {
        // `path` explicito, nao `url`: por `url` o navegador aplica a regra de
        // default-path e descarta o ultimo segmento, gravando em `/api`. O
        // logout apaga em `/api/auth` (igual ao sessionCookies.ts), entao o
        // cookie do teste sobrevivia por divergencia de path -- e nao porque o
        // logout deixasse de limpa-lo.
        name: "krosmed_refresh",
        value: "refresh_e2e",
        domain: new URL(E2E_BROWSER_URL).hostname,
        path: "/api/auth",
        httpOnly: true,
        sameSite: "Lax",
      },
      {
        name: "krosmed_refresh_hint",
        value: "1",
        url: E2E_BROWSER_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const before = await context.cookies();
    expect(before.some((cookie) => cookie.name === "krosmed_token")).toBeTruthy();
    expect(before.some((cookie) => cookie.name === "krosmed_session")).toBeTruthy();
    expect(before.some((cookie) => cookie.name === "krosmed_refresh")).toBeTruthy();
    expect(before.some((cookie) => cookie.name === "krosmed_refresh_hint")).toBeTruthy();

    await page.goto(`${E2E_BROWSER_URL}/api/version`);
    const status = await page.evaluate(async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "X-KrosMed-CSRF": "1",
        },
      });
      return response.status;
    });
    expect(status).toBe(204);

    const after = await context.cookies();
    expect(after.some((cookie) => cookie.name === "krosmed_token")).toBeFalsy();
    expect(after.some((cookie) => cookie.name === "krosmed_session")).toBeFalsy();
    expect(after.some((cookie) => cookie.name === "krosmed_refresh")).toBeFalsy();
    expect(after.some((cookie) => cookie.name === "krosmed_refresh_hint")).toBeFalsy();
  });

  test("rejects mutating auth requests without the internal CSRF header", async ({ context }) => {
    const response = await context.request.post("/api/auth/logout", {
      headers: {
        Origin: E2E_BASE_URL,
      },
    });

    expect(response.status()).toBe(403);
  });
});
