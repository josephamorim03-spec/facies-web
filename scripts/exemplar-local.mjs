#!/usr/bin/env node
/**
 * O Fácies inteiro, a correr nesta máquina, já com dados — para clicar.
 *
 * ## Porque não é o backend de verdade
 *
 * **Não existe catálogo de questões local.** `QUESTION_BANK_CATALOG_SOURCE=kbank`
 * exige um Postgres (docker, proibido nesta máquina) e a alternativa `sqlite`
 * exige um ficheiro de catálogo assinado que não está em disco em nenhum clone.
 * Com a API real de pé, o Banco abriria vazio e as cinco telas mostrariam
 * estados de "sem dado" — o oposto do que serve para olhar o desenho.
 *
 * ## O que isto faz
 *
 * Sobe DOIS processos:
 *
 * 1. um servidor de fixtures na 8787, que reusa `lib/app-harness.mjs` — as
 *    mesmas 1.207 linhas que a captura de design e os e2e já usam, e o conjunto
 *    mais completo do repositório;
 * 2. o Next em produção na 3001, com `NEXT_API_PROXY_TARGET` apontado para o
 *    primeiro.
 *
 * O harness é escrito para o Playwright (`route.fulfill`). O adaptador abaixo
 * fala essa língua sobre HTTP puro — a superfície é minúscula: `route.request()`,
 * `route.fulfill()`, `request.url()` e `request.method()`.
 *
 * ## A sessão — o navegador abre JÁ LOGADO
 *
 * ⚠️ **Não há tela de login para atravessar**, a pedido do operador. O
 * caminho pelo formulário existe e funciona, mas exige atravessar uma tela
 * para olhar o desenho de outra — trabalho a mais para a única coisa que este
 * script serve.
 *
 * ⚠️ E não dava para automatizar por fora: o cookie é httpOnly, e o BFF só o
 * grava num `POST /api/auth/login` que seja **mesma origem** E traga o header
 * `x-krosmed-csrf` (`isSameOriginMutation` + `hasInternalCsrfHeader`). Uma
 * página externa não consegue nenhum dos dois — e afrouxar isso seria mexer em
 * regra de segurança para poupar um clique.
 *
 * Então o script abre um Chromium de verdade (o do Playwright, já instalado)
 * com o cookie posto e a janela visível. O middleware só verifica a PRESENÇA
 * do cookie, e o BFF o repassa como Bearer para o servidor de fixtures, que
 * não confere nada — por isso qualquer valor serve.
 *
 * O servidor continua de pé para quem preferir o próprio navegador: aí o
 * caminho é o `/login`, e qualquer e-mail e senha entram.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { mockApi } from "./lib/app-harness.mjs";

const PORTA_FIXTURES = Number(process.env.PORTA_FIXTURES ?? 8787);
/**
 * 3001, e NAO 3000.
 *
 * ⚠️ A 3000 e a porta do `webServer` do Playwright. Com o exemplar de pe,
 * qualquer corrida com `PLAYWRIGHT_REUSE_SERVER=1` reaproveita ESTE servidor --
 * que fala com o servidor de fixtures em vez de com as rotas mockadas do teste.
 * Medido: 14 de 40 testes reprovaram assim, e nenhuma das falhas era real.
 */
const PORTA_APP = Number(process.env.PORTA_APP ?? 3001);

/** As credenciais que eu entrego. Qualquer par serve; estas são as anunciadas. */
const EMAIL = "operador@facies.local";
const SENHA = "facies-local";

// ── O adaptador: `route.fulfill` do Playwright sobre HTTP puro ───────────────

/** Captura o handler que `mockApi` regista, em vez de o dar ao navegador. */
function capturarHandler() {
  let handler = null;
  const page = {
    route: (_padrao, fn) => {
      handler = fn;
      return Promise.resolve();
    },
  };
  return { page, obter: () => handler };
}

function rotaFalsa(req, res, caminhoComApi) {
  const estado = { respondido: false };
  return {
    estado,
    request: () => ({
      method: () => req.method,
      // O harness casa por `/api/...`; o BFF tira esse prefixo ao encaminhar.
      url: () => `http://localhost${caminhoComApi}`,
    }),
    fulfill: ({ status = 200, contentType = "application/json", body = "" }) => {
      // Idempotente: o harness pode chamar duas vezes, e o Node lança
      // ERR_HTTP_HEADERS_SENT na segunda.
      if (estado.respondido || res.headersSent) return;
      estado.respondido = true;
      res.writeHead(status, { "content-type": contentType });
      res.end(body);
    },
  };
}

// ── O servidor de fixtures ──────────────────────────────────────────────────

const captura = capturarHandler();
await mockApi(captura.page);
const handler = captura.obter();
if (typeof handler !== "function") {
  console.error("O harness nao registou nenhum handler. `mockApi` mudou de forma?");
  process.exit(1);
}

const fixtures = createServer((req, res) => {
  const caminho = new URL(req.url, "http://localhost").pathname;
  const comApi = caminho.startsWith("/api") ? caminho : `/api${caminho}`;

  const json = (corpo, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(corpo));
  };

  // O formulário de e-mail só aparece quando o servidor diz que existe.
  if (caminho === "/auth/modes") return json({ local_auth: true, google: false });

  // Qualquer par entra. É isto que faz o cookie httpOnly ser gravado pelo BFF.
  if (caminho === "/auth/login" && req.method === "POST") {
    return json({
      access_token: "local.exemplar.v1",
      refresh_token: "local.exemplar.refresh",
      token_type: "bearer",
      user_id: "operador",
      email: EMAIL,
      email_verified: true,
    });
  }
  if (caminho === "/auth/session" || caminho === "/auth/session/refresh") {
    return json({ access_token: "local.exemplar.v1", refresh_token: "local.exemplar.refresh" });
  }

  // ⚠️ O HANDLER É `async`, e por isso o `try/catch` não bastava.
  //
  // `mockApi` regista `async (route) => {...}`: uma exceção lá dentro vira
  // REJEIÇÃO, que um `catch` síncrono não vê. Sob o padrão do Node 24
  // (`--unhandled-rejections=throw`) o processo morre — e leva os dois
  // servidores, deixando o operador sem app no meio de um clique.
  //
  // E o fallback era um `setTimeout` incondicional de 50ms: um fixture mais
  // lento que isso encontrava a resposta já enviada e estourava na segunda
  // escrita. Agora ele só corre se o handler tiver mesmo desistido.
  const rota = rotaFalsa(req, res, comApi);
  Promise.resolve()
    .then(() => handler(rota))
    .catch((erro) => {
      console.error(`fixture falhou em ${comApi}:`, erro);
    })
    .finally(() => {
      // O fallback do harness é `{}`; sem isto, o pedido ficaria pendurado.
      if (!rota.estado.respondido && !res.headersSent) json({});
    });
});

// ── Sobe tudo ───────────────────────────────────────────────────────────────

if (!existsSync(join(process.cwd(), ".next", "BUILD_ID"))) {
  console.error("Falta o build de producao. Rode `npm run build` primeiro.");
  process.exit(1);
}

fixtures.listen(PORTA_FIXTURES, "127.0.0.1", () => {
  console.log(`fixtures em http://127.0.0.1:${PORTA_FIXTURES}`);

  const app = spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(PORTA_APP)],
    {
      stdio: ["ignore", "pipe", "inherit"],
      env: {
        ...process.env,
        NEXT_API_PROXY_TARGET: `http://127.0.0.1:${PORTA_FIXTURES}`,
        NEXT_PUBLIC_STUDENT_AGENDA_V1: "1",
      },
    },
  );

  /** Um Chromium visível, com a sessão posta, na tela pedida. */
  async function abrirJaLogado() {
    try {
      const navegador = await chromium.launch({ headless: false });
      const contexto = await navegador.newContext({
        viewport: { width: 420, height: 900 },
      });
      await contexto.addCookies([
        {
          name: "krosmed_session",
          value: "local.exemplar.v1",
          url: `http://localhost:${PORTA_APP}`,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
      const pagina = await contexto.newPage();
      await pagina.goto(`http://localhost:${PORTA_APP}/hoje`);
      // O processo do exemplar segue vivo; fechar a janela não o derruba, e
      // Ctrl+C no terminal derruba os três.
      navegador.on("disconnected", () => {});
    } catch (erro) {
      console.error(
        "Nao consegui abrir o navegador (o Chromium do Playwright esta instalado?).",
        `\nO servidor continua de pe: entre por http://localhost:${PORTA_APP}/login`,
        erro instanceof Error ? erro.message : erro,
      );
    }
  }

  let abriu = false;
  app.stdout.on("data", (chunk) => {
    const texto = String(chunk);
    process.stdout.write(texto);
    if (texto.includes("Ready") || texto.includes("started server")) {
      if (!abriu) {
        abriu = true;
        void abrirJaLogado();
      }
      console.log(
        [
          "",
          "────────────────────────────────────────────────",
          "  Abrindo uma janela JÁ LOGADA no Hoje.",
          "",
          `  Se preferir o seu navegador:  http://localhost:${PORTA_APP}/login`,
          `  e-mail: ${EMAIL}   senha: ${SENHA}`,
          "  (qualquer par entra — o backend é de fixtures)",
          "",
          "  Ctrl+C aqui encerra tudo.",
          "────────────────────────────────────────────────",
          "",
        ].join("\n"),
      );
    }
  });

  const encerrar = () => {
    app.kill();
    fixtures.close();
    process.exit(0);
  };
  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);
  app.on("exit", (codigo) => {
    fixtures.close();
    process.exit(codigo ?? 0);
  });
});
