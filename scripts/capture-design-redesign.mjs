import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// O mock da API, a sessao e as asserções de render moram no harness, para que
// mais de uma ferramenta possa renderizar uma tela autenticada do app.
import {
  addSession,
  assertNoOverflow,
  mockApi,
  ready,
} from "./lib/app-harness.mjs";

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, "test-results", "design-redesign");
const SERVER_LOG_DIR = resolve(ROOT, "test-results", "design-redesign-server");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3107";

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SERVER_LOG_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return true;
    } catch {
      // keep polling
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
  }
  return false;
}

async function ensureServer() {
  if (await waitForServer(BASE_URL, 2_000)) return null;
  const { port } = new URL(BASE_URL);
  const out = createWriteStream(resolve(SERVER_LOG_DIR, "next-out.log"), { flags: "a" });
  const err = createWriteStream(resolve(SERVER_LOG_DIR, "next-err.log"), { flags: "a" });
  const child = spawn(
    "node",
    ["./node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port || "3107"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  child.stdout.pipe(out);
  child.stderr.pipe(err);
  if (!(await waitForServer(BASE_URL))) {
    child.kill();
    throw new Error(`Next server did not become ready at ${BASE_URL}`);
  }
  return child;
}

async function capture(page, name) {
  await ready(page);
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  return path;
}

async function axe(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.length,
    targets: violation.nodes.slice(0, 8).map((node) => ({
      target: node.target,
      html: node.html,
      summary: node.failureSummary,
    })),
  }));
}


async function runViewport(browser, viewport) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: viewport.size,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: viewport.mobile ? 3 : 1,
  });
  await addSession(context, BASE_URL);
  const page = await context.newPage();
  await mockApi(page);
  const report = { viewport: viewport.name, screenshots: [], axeViolations: {} };

  async function visit(path, name, assertion, runAxe = false) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    try {
      await assertion();
    } catch (error) {
      const debugBase = `${viewport.name}-${name}-debug`;
      await page.screenshot({ path: resolve(OUT_DIR, `${debugBase}.png`), fullPage: true, animations: "disabled" }).catch(() => null);
      writeFileSync(resolve(OUT_DIR, `${debugBase}.txt`), await page.locator("body").innerText().catch(() => ""));
      writeFileSync(resolve(OUT_DIR, `${debugBase}.html`), await page.content().catch(() => ""));
      throw error;
    }
    await assertNoOverflow(page);
    report.screenshots.push(await capture(page, `${viewport.name}-${name}`));
    if (runAxe) report.axeViolations[name] = await axe(page);
  }

  // A rota `/rota` saiu da captura junto com a tela. Ela abria na PERGUNTA de
  // tempo e energia, que morreu: o dia agora e dimensionado pelo calendario e
  // pelo comportamento observado, e o numero aparece no Hoje como contexto da
  // proxima acao.
  await visit("/hoje", "hoje", async () => {
    await page.getByRole("link", { name: /Come/ }).waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  // ⚠️ `/cards` E `/cards/registros` SAIRAM, e a captura inteira estava MORTA
  // por causa delas.
  //
  // Os flashcards estao de molho: `NEXT_PUBLIC_FLASHCARDS` tem default `"0"` e e
  // assado em BUILD (`next.config.js`), e com a chave desligada as duas rotas
  // sao redirect para `/hoje`. As asserções aqui esperavam textos que so
  // existem na tela de card ("Cards para revisar agora", "Pesquisar
  // registros"), entao elas nunca poderiam casar: 30s de timeout, excecao, e o
  // script morria ANTES de capturar `/cronograma`, `/evolucao`, `/banco` e
  // `/preferencias`.
  //
  // O custo real nao era a captura: era o `axe` e o `assertNoOverflow`, que so
  // rodam por aqui. As cinco telas vivas ficaram sem gate de acessibilidade e
  // sem gate de overflow horizontal, em silencio, desde que a chave desligou.
  //
  // Elas VOLTAM junto com a feature. Nao ha deteccao automatica de propósito:
  // um `if (chave)` deixaria a captura verde escondendo que duas telas nao
  // foram vistas, que e a mesma classe de defeito que este bloco corrige.

  // Era `/planejamento` esperando o calendario MENSAL. `/planejamento` e 308
  // para `/cronograma`, que abre na visao de SEMANA por padrao desde que
  // `initialView = "week"` — a asserção nunca poderia passar.
  await visit("/cronograma", "cronograma", async () => {
    await page.locator("[data-cronograma-week='true']").waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/evolucao", "evolucao", async () => {
    // Quarta versao desta assercao, e as tres anteriores erraram do mesmo
    // jeito: prenderam um elemento que a pagina nao tem.
    //
    // Era `heading "Analise sua trajetória"`, string que nunca existiu. Virou
    // a aba "Gráficos", que sumiu quando a tela virou leitura unica. Virou
    // `#evolution-charts-title` mais uma `svg.recharts-surface` -- e OS DOIS
    // sumiram quando a Evolucao virou os sete cartoes-pergunta do artboard
    // `9b`: nao ha mais secao de graficos, nem recharts.
    //
    // Agora a espera e pela PRIMEIRA pergunta ("Se a prova fosse hoje"), que e
    // o cartao de cima e o unico que nunca sai da tela -- os outros seis
    // dependem de dado que pode faltar. Se ele nao aparece, a tela nao montou.
    await page
      .getByRole("heading", { name: "Se a prova fosse hoje" })
      .waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/banco", "banco", async () => {
    // "Montar sessão" aparece duas vezes agora: no titulo do topo e na linha de
    // filhos da barra de abas. Ambos sao sinal de que a nav funcionou; basta um.
    await page.getByText("Montar sessão").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.getByText("Banca, ano e histórico").click();
    await page.getByText("Estado da prova").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByText("SP").first().waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  // A colecao do aluno. Entra na captura porque `axe` e `assertNoOverflow` so
  // rodam por aqui — tela que fica de fora nasce sem gate de acessibilidade e
  // sem gate de estouro horizontal, e ninguem percebe.
  await visit("/banco/guardadas", "banco-guardadas", async () => {
    await page
      .getByRole("heading", { name: "As suas guardadas" })
      .waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  // O quinto destino. Entra na captura pela mesma razao das outras: `axe` e
  // `assertNoOverflow` so rodam por aqui.
  await visit("/voce", "voce", async () => {
    await page
      .getByRole("navigation", { name: "Suas configurações" })
      .waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/preferencias", "preferencias", async () => {
    // Nao existe heading "Preferências": esse e o titulo da PAGINA, que mora no
    // topo como span. Os <h2> da tela sao os titulos de secao.
    //
    // "Rotina" -> "Minha semana": a secao da semana padrao (artboard `14a`)
    // passou a abrir a pagina, e a antiga "Rotina" virou "Compromissos e
    // metas". Esperar pela PRIMEIRA secao e' o que garante que a captura pega a
    // tela montada, e nao um esqueleto.
    await page.getByRole("heading", { name: "Minha semana" }).first().waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await context.close();
  return report;
}

const server = await ensureServer();
const browser = await chromium.launch({ headless: true });
const reports = [];

try {
  for (const viewport of [
    { name: "desktop", size: { width: 1440, height: 1000 }, mobile: false },
    { name: "mobile", size: { width: 390, height: 844 }, mobile: true },
  ]) {
    reports.push(await runViewport(browser, viewport));
  }
  const reportPath = resolve(OUT_DIR, "report.json");
  writeFileSync(reportPath, JSON.stringify({ baseURL: BASE_URL, generatedAt: new Date().toISOString(), reports }, null, 2));
  console.log(`Design screenshots saved to ${OUT_DIR}`);
  console.log(`Report saved to ${reportPath}`);

  // O axe e' o unico gate que ve COR CALCULADA. O de token mede par de token e
  // nao alcanca `style={{ color }}`; foi por ali que a cor de area voltou a
  // virar texto tres vezes. Reportar sem falhar deixava isso passar.
  const achados = [];
  for (const relatorio of reports) {
    for (const [pagina, violacoes] of Object.entries(relatorio.axeViolations ?? {})) {
      for (const v of violacoes) {
        achados.push(`  ${relatorio.viewport}/${pagina}: ${v.id} — ${v.nodes} no(s)`);
      }
    }
  }
  if (achados.length > 0) {
    console.error(`\nAcessibilidade: ${achados.length} violacao(oes).\n` + achados.join("\n"));
    console.error(`\nDetalhe por no em ${reportPath}.`);
    process.exitCode = 1;
  } else {
    console.log("Acessibilidade: nenhuma violacao nas telas capturadas.");
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
