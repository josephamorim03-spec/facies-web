/**
 * Contrato de acesso do proxy.
 *
 * A Fácies abriu duas superfícies públicas (`/` e `/facies/*`) num arquivo que
 * antes mandava TUDO sem sessão para `/login`. Mudança em controle de acesso
 * merece teste que falhe quando alguém abrir demais — e o modo de falha aqui é
 * específico e silencioso: `"/"` dentro de `PUBLIC_PREFIXES` (em vez de na lista
 * exata) libera o app inteiro, porque todo caminho começa com `/`, e a linha
 * parece inócua em revisão.
 *
 * O teste lê o próprio `proxy.ts` em vez de importá-lo porque o módulo depende
 * de `next/server`, que não roda fora do bundler. Ler o fonte é mais fraco que
 * executar, e por isso as asserções são sobre a ESTRUTURA que causa a falha,
 * não sobre o comportamento.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const fonte = readFileSync(
  fileURLToPath(new URL("../../src/proxy.ts", import.meta.url)),
  "utf8",
);

function bloco(nome) {
  const achado = fonte.match(new RegExp(`${nome}\\s*=\\s*(?:new Set\\()?\\[([^\\]]*)\\]`));
  return achado ? achado[1] : "";
}

test("a raiz e as paginas de banca sao publicas", () => {
  assert.match(bloco("PUBLIC_EXACT"), /"\/"/);
  // Prefixo COM barra, e o caminho sem filho na lista exata. Ver o teste da
  // colisao abaixo para o porque.
  assert.match(bloco("PUBLIC_PREFIXES"), /"\/facies\/"/);
  assert.match(bloco("PUBLIC_EXACT"), /"\/facies"/);
  // Link curto por prova (§11.3): link longo com parametro morre no boca a
  // boca, e o canal deste produto e o print colado em grupo. Precisa ser
  // EXATO — como prefixo, `/enamed` abriria qualquer `/enamedX` futuro.
  assert.match(bloco("PUBLIC_EXACT"), /"\/enamed"/);
  // `/prova/[slug]` e a superficie publica por PROVA. Faltou na primeira vez e a
  // pagina caiu em /login com HTTP 200 — so a captura, que loga a URL final,
  // denunciou.
  assert.match(bloco("PUBLIC_PREFIXES"), /"\/prova\/"/);
});

test("prefixo publico nao vaza para a rota irma mais longa", () => {
  // `"/provas".startsWith("/prova")` e TRUE, e `/provas` e AUTENTICADA.
  // A mesma armadilha do `"/"`, um nivel abaixo: prefixo sem barra final abre o
  // irmao mais longo sem que a linha pareca errada.
  //
  // Hoje `/provas` so redireciona, entao o vazamento e inofensivo — e e
  // exatamente por isso que ele precisa de teste: ninguem vai notar no dia em
  // que ela voltar a ter conteudo.
  const prefixos = bloco("PUBLIC_PREFIXES")
    .split(",")
    .map((bruto) => bruto.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  const autenticadas = ["/provas", "/preferencias", "/banco", "/cards", "/cronograma"];
  for (const rota of autenticadas) {
    const vazando = prefixos.find((prefixo) => rota.startsWith(prefixo));
    assert.equal(
      vazando,
      undefined,
      `o prefixo "${vazando}" abre ${rota}, que exige sessao`,
    );
  }
});

test('"/" nunca entra em PUBLIC_PREFIXES — abriria o app inteiro', () => {
  const prefixos = bloco("PUBLIC_PREFIXES");
  assert.ok(prefixos.length > 0, "PUBLIC_PREFIXES nao encontrado");
  for (const bruto of prefixos.split(",")) {
    const valor = bruto.trim().replace(/^["']|["']$/g, "");
    if (!valor) continue;
    assert.notEqual(valor, "/", 'PUBLIC_PREFIXES contem "/" e libera todas as rotas');
  }
});

test("a raiz e comparada por igualdade, nao por prefixo", () => {
  assert.match(fonte, /PUBLIC_EXACT\.has\(pathname\)/);
});

test("as rotas autenticadas continuam exigindo sessao", () => {
  // O guard tem que continuar existindo: sem ele, abrir `/` teria aberto tudo.
  assert.match(fonte, /krosmed_session/);
  assert.match(fonte, /url\.pathname\s*=\s*"\/login"/);
  // E nenhuma rota de aluno pode ter virado publica de carona.
  const prefixos = bloco("PUBLIC_PREFIXES");
  for (const privada of ["/hoje", "/banco", "/cards", "/cronograma", "/admin", "/preferencias"]) {
    assert.ok(
      !prefixos.includes(privada),
      `${privada} nao pode estar em PUBLIC_PREFIXES`,
    );
  }
});

test("nenhum prefixo publico casa uma rota que existe no disco", () => {
  // O teste acima lista rotas conhecidas; este pergunta ao disco. A diferenca
  // aparece no dia em que alguem criar `/faciesX` ou `/provaY`: a lista fixa nao
  // saberia, e o `startsWith` abriria a rota nova sem uma linha de aviso.
  const DIR_APP = fileURLToPath(new URL("../../src/app", import.meta.url));
  const prefixos = bloco("PUBLIC_PREFIXES")
    .split(",")
    .map((bruto) => bruto.trim().replace(/^["\']|["\']$/g, ""))
    .filter(Boolean);

  // Segmentos reais. Grupos `(...)` e privados `_...` do App Router nao viram rota.
  const rotas = readdirSync(DIR_APP, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("("))
    .map((e) => `/${e.name}`);

  const PUBLICAS = new Set(["/login", "/auth", "/api", "/facies", "/prova"]);
  const vazamentos = [];
  for (const rota of rotas) {
    if (PUBLICAS.has(rota)) continue;
    for (const prefixo of prefixos) {
      if (rota.startsWith(prefixo)) vazamentos.push(`${rota} <- "${prefixo}"`);
    }
  }

  assert.deepEqual(
    vazamentos,
    [],
    "Rota autenticada exposta pelo proxy: " +
      vazamentos.join("; ") +
      ". Prefixo sem barra final casa o segmento irmao.",
  );
});
