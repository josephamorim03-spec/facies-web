import { defineConfig, devices } from "@playwright/test";

const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";
const skipManagedWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const webServer = skipManagedWebServer
  ? undefined
  : {
      command: "node ./node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000",
      // Producao serve o `/hoje` CANONICO: `web/vercel.json` define
      // `NEXT_PUBLIC_STUDENT_AGENDA_V1: "1"`. Sem repetir aqui, o e2e exercia a
      // `LegacyTodayPage` — uma tela que nenhum aluno ve — e a que produção
      // entrega ficava sem cobertura nenhuma.
      //
      // `NEXT_PUBLIC_*` e' inlined em BUILD, entao esta env so tem efeito se o
      // `next build` tambem a tiver. Ver `scripts/run-smoke-e2e.mjs` e o CI.
      env: { NEXT_PUBLIC_STUDENT_AGENDA_V1: "1" },
      url: "http://127.0.0.1:3000/api/version",
      reuseExistingServer,
      gracefulShutdown: { signal: "SIGTERM" as const, timeout: 1_000 },
      timeout: 120_000,
    };

export default defineConfig({
  testDir: "./tests/e2e",
  // Running against `next dev` can be slower on first load/HMR, so keep a safer budget.
  timeout: 90_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(webServer ? { webServer } : {}),
});
