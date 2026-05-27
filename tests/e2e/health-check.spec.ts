import { expect, test } from "@playwright/test";

test.describe("API health check", () => {
  test("/api/health returns 200 with ok:true", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ ok: true });
  });

  test("/api/ready returns 200 with status:ok", async ({ request }) => {
    const response = await request.get("/api/ready");
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload).toHaveProperty("status");
  });

  test("/api/version returns expected metadata fields", async ({ request }) => {
    const response = await request.get("/api/version");
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload).toHaveProperty("commit_sha");
    expect(payload).toHaveProperty("build_time_utc");
    expect(payload).toHaveProperty("environment");
  });
});
