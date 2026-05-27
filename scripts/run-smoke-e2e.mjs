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
const smokeTimeoutMs = 300_000;
const smokeSpecs = [
  "navigation.shell.spec.ts",
  "auth.proxy-cookie.spec.ts",
  "cronograma.smoke.spec.ts",
  "caderno.header-toggle.spec.ts",
  "revisao-turbo.smoke.spec.ts",
  "study-import.smoke.spec.ts",
];

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
    const child = spawn(process.execPath, [playwrightCli, "test", "--reporter=list", ...smokeSpecs], {
      cwd: webRoot,
      env: playwrightEnv,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let settled = false;
    let output = "";
    let settleTimer;
    const hardTimer = setTimeout(() => {
      finish(1);
    }, smokeTimeoutMs);

    const record = (chunk, stream) => {
      const text = chunk.toString();
      output = `${output}${text}`.slice(-12_000);
      stream.write(text);

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
