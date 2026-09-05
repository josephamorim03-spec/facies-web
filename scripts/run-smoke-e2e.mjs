import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const readinessUrl = "http://127.0.0.1:3000/api/version";
const port = 3000;
const readinessTimeoutMs = 120_000;
/**
 * O teto que matava o Playwright ANTES do resumo.
 *
 * ⚠️ ISTO NÃO DEIXA O JOB VERDE, e não é para isso que ele sobe. O conjunto
 * padrão depende do backend em `:8000` (ver o comentário de `DEFAULT_SPECS`), e
 * sem ele a escada de bloqueio manda a sessão para `/cadastro/completar` e
 * várias specs caem juntas. Estabilizar isso é epic própria.
 *
 * O que este número corrige é outra coisa: em 300s o processo era **morto no
 * meio**, sem linha de resumo. Sem resumo não há contagem, e sem contagem o
 * veredito recusa opinar — o job saía INDETERMINADO, que é o pior dos estados,
 * porque não diz nem quantas passaram nem quantas falharam. Medido em
 * 2026-09-04: 5min01s contra teto de 5min00s, um segundo.
 *
 * E ficou pior em 2026-09-05: `navigation.shell.spec.ts` está no conjunto e
 * ganhou quatro testes (320px, ausência da barra empilhada, a especialidade, o
 * plantão). Um teto que já falhava por um segundo passou a falhar por mais.
 *
 * Com 600s o resumo sai, a contagem aparece, e o vermelho passa a ser LEGÍVEL —
 * que é a condição para alguém consertá-lo.
 */
const smokeTimeoutMs = 600_000;

/**
 * O conjunto padrão. Ele depende do backend em `:8000` para várias telas — com
 * a API fora, o `AppShell` não consegue resolver `cadastro_completo` nem
 * `access_status`, a escada de bloqueio manda a sessão para
 * `/cadastro/completar` e a suíte inteira cai junto. Estabilizar isso é epic
 * própria (`docs/production-readiness.md`, Deferred Hardening).
 */
const DEFAULT_SPECS = [
  "navigation.shell.spec.ts",
  "banco.historico.spec.ts",
  "auth.proxy-cookie.spec.ts",
  "cadastro.funil.spec.ts",
  "cronograma.smoke.spec.ts",
  "caderno.header-toggle.spec.ts",
  "revisao-turbo.smoke.spec.ts",
  "study-import.smoke.spec.ts",
];

/**
 * Specs passadas na linha de comando vencem o padrão.
 *
 * Existe para o subconjunto que NÃO depende do backend — guard de borda,
 * cookies do BFF, CSRF e o funil de cadastro. Ele roda em ~9s e pode ficar
 * verde de verdade, então serve de gate; o conjunto completo, hoje, não serve.
 * Ver o script `test:e2e:auth`.
 */
const smokeSpecs = process.argv.slice(2).filter(Boolean);
const specs = smokeSpecs.length > 0 ? smokeSpecs : DEFAULT_SPECS;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isReady() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(readinessUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function startNextServer() {
  const nextCli = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextCli, "start", "--hostname", "0.0.0.0", "--port", String(port)], {
    cwd: webRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let output = "";
  const record = (chunk) => {
    const text = chunk.toString();
    output = `${output}${text}`.slice(-8_000);
    process.stdout.write(text);
  };
  child.stdout.on("data", record);
  child.stderr.on("data", record);
  child.once("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`\nnext start exited with code ${code}.\n`);
    } else if (signal) {
      process.stderr.write(`\nnext start exited via ${signal}.\n`);
    }
  });

  return { child, getOutput: () => output };
}

async function waitForReady(server) {
  const deadline = Date.now() + readinessTimeoutMs;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`next start exited before readiness.\n${server.getOutput()}`);
    }
    if (await isReady()) return;
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${readinessUrl}.\n${server.getOutput()}`);
}

function runPlaywright() {
  const playwrightCli = path.join(webRoot, "node_modules", "playwright", "cli.js");
  const playwrightEnv = {
    ...process.env,
    PLAYWRIGHT_SKIP_WEB_SERVER: "1",
  };
  delete playwrightEnv.FORCE_COLOR;
  delete playwrightEnv.NO_COLOR;

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, "test", "--reporter=list", ...specs], {
      cwd: webRoot,
      env: playwrightEnv,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let settled = false;
    let output = "";
    let settleTimer;

    // Contagem incremental do que o reporter `list` já imprimiu.
    //
    // Existe porque o `hardTimer` abaixo mata o Playwright ANTES do resumo
    // quando o teto estoura, e aí quem lê a saída não encontra linha de
    // contagem nenhuma. O veredito então diz INDETERMINADO — corretamente, mas
    // sem nada para diagnosticar. Aconteceu em 2026-09-04: 43 falhas e 16
    // sucessos visíveis no log, e o resumo do run dizia `0 passed · 0 failed`.
    //
    // `output` é truncado em 12 KB (o buffer só serve para detectar o resumo),
    // então contar nele daria número errado. Estes contadores são incrementados
    // por chunk e não dependem do buffer.
    const vistos = { passed: 0, failed: 0 };

    const hardTimer = setTimeout(() => {
      // Emite o que foi observado antes de derrubar o processo. Sem isto o
      // timeout entrega silêncio, e silêncio vira INDETERMINADO sem pista.
      process.stdout.write(
        `\n${vistos.passed} passed, ${vistos.failed} failed ` +
          `(parcial: o teto de ${Math.round(smokeTimeoutMs / 1000)}s encerrou a ` +
          `execução antes do resumo do Playwright)\n`,
      );
      finish(1);
    }, smokeTimeoutMs);

    const record = (chunk, stream) => {
      const text = chunk.toString();
      output = `${output}${text}`.slice(-12_000);
      stream.write(text);

      // O reporter `list` marca cada teste com ✓ (ok) ou ✘ (falha) no início da
      // linha. Contamos por chunk, não no `output`, que é truncado.
      for (const linha of text.split("\n")) {
        if (/^\s*✓/.test(linha)) vistos.passed += 1;
        else if (/^\s*✘/.test(linha)) vistos.failed += 1;
      }

      const normalizedOutput = output.replace(/\x1b\[[0-9;]*m/g, "");
      const hasFailureSummary = /\b\d+\s+(failed|timed out|did not run)\b/.test(normalizedOutput);
      const hasSuccessSummary = /\b\d+\s+passed\s+\([^)]+\)/.test(normalizedOutput);
      if (hasFailureSummary) {
        scheduleFinish(1);
      } else if (hasSuccessSummary) {
        scheduleFinish(0);
      }
    };

    const scheduleFinish = (code) => {
      if (settled || settleTimer) return;
      settleTimer = setTimeout(() => {
        finish(code);
      }, 1_000);
    };

    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      if (settleTimer) clearTimeout(settleTimer);
      stopProcessTree(child).finally(() => resolve(code));
    };

    child.stdout.on("data", (chunk) => record(chunk, process.stdout));
    child.stderr.on("data", (chunk) => record(chunk, process.stderr));
    child.on("exit", (code, signal) => {
      if (settled) return;
      clearTimeout(hardTimer);
      if (settleTimer) clearTimeout(settleTimer);
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => resolve();
    const timer = setTimeout(finish, 5_000);

    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.once("exit", () => {
        clearTimeout(timer);
        finish();
      });
      killer.once("error", () => {
        clearTimeout(timer);
        finish();
      });
      return;
    }

    child.once("exit", () => {
      clearTimeout(timer);
      finish();
    });
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2_000);
  });
}

async function main() {
  const buildIdPath = path.join(webRoot, ".next", "BUILD_ID");
  if (!existsSync(buildIdPath)) {
    throw new Error("Missing production build. Run `npm run build` before `npm run test:e2e:smoke`.");
  }

  const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";
  const ready = await isReady();
  if (reuseExistingServer && ready) {
    process.exitCode = await runPlaywright();
    return;
  }

  if (!reuseExistingServer && (ready || (await isPortOpen()))) {
    throw new Error(
      "Port 3000 is already in use. Stop the local server, or set PLAYWRIGHT_REUSE_SERVER=1 to reuse it explicitly.",
    );
  }

  const server = startNextServer();
  try {
    await waitForReady(server);
    process.exitCode = await runPlaywright();
  } finally {
    await stopProcessTree(server.child);
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
