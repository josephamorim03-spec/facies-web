import { expect, test } from "@playwright/test";

test.describe("Auth flow", () => {
  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/cronograma");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("/api/auth/session rejects request without CSRF header", async ({ request }) => {
    const response = await request.post("/api/auth/session", {
      data: { access_token: "some.jwt.token" },
      headers: {
        Origin: "http://127.0.0.1:3000",
      },
    });
    expect(response.status()).toBe(403);
    const payload = await response.json();
    expect(payload).toHaveProperty("code", "csrf_rejected");
  });

  test("/api/auth/session rejects invalid token format", async ({ request }) => {
    const response = await request.post("/api/auth/session", {
      data: { access_token: "not-a-jwt" },
      headers: {
        "X-KrosMed-CSRF": "1",
        Origin: "http://127.0.0.1:3000",
      },
    });
    expect(response.status()).toBe(401);
    const payload = await response.json();
    expect(payload).toHaveProperty("code", "invalid_session_token");
  });

  test("/api/auth/session rejects empty token", async ({ request }) => {
    const response = await request.post("/api/auth/session", {
      data: { access_token: "" },
      headers: {
        "X-KrosMed-CSRF": "1",
        Origin: "http://127.0.0.1:3000",
      },
    });
    expect(response.status()).toBe(401);
  });

  test("/api/auth/session rejects token that is too long", async ({ request }) => {
    const longToken = "a".repeat(5000);
    const response = await request.post("/api/auth/session", {
      data: { access_token: longToken },
      headers: {
        "X-KrosMed-CSRF": "1",
        Origin: "http://127.0.0.1:3000",
      },
    });
    expect(response.status()).toBe(401);
  });

  test("logout endpoint clears session cookies", async ({ context, page }) => {
    // Set up session cookies first
    await context.addCookies([
      {
        name: "krosmed_token",
        value: "token_e2e",
        url: "http://127.0.0.1:3000",
      },
      {
        name: "krosmed_session",
        value: "session_e2e",
        url: "http://127.0.0.1:3000",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const before = await context.cookies();
    expect(before.some((c) => c.name === "krosmed_token")).toBeTruthy();
    expect(before.some((c) => c.name === "krosmed_session")).toBeTruthy();

    // Perform logout via the API
    await page.goto("http://localhost:3000/api/version");
    const status = await page.evaluate(async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-KrosMed-CSRF": "1" },
      });
      return response.status;
    });
    expect(status).toBe(204);

    const after = await context.cookies();
    expect(after.some((c) => c.name === "krosmed_token")).toBeFalsy();
    expect(after.some((c) => c.name === "krosmed_session")).toBeFalsy();
  });
});
