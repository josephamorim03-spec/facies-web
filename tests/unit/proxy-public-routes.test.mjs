/**
 * Contrato de acesso do guard de borda.
 *
 * A Fácies abriu superfícies públicas (`/`, `/facies/*`, `/prova/*`) num arquivo
 * que antes mandava TUDO sem sessão para `/login`. Mudança em controle de acesso
 * merece teste que falhe quando alguém abrir demais — e o modo de falha é
 * específico e silencioso: `"/"` dentro de `PUBLIC_PREFIXES` (em vez de na lista
 * exata) libera o app inteiro, porque todo caminho começa com `/`, e a linha
 * parece inócua em revisão.
 *
 * ## Este teste EXECUTA a regra; antes ele lia o fonte
 *
 * A versão anterior fazia `readFileSync("proxy.ts")` e casava regex, porque o
 * módulo importa `next/server` e não roda fora do bundler. O próprio cabeçalho
 * admitia: "ler o fonte é mais fraco que executar". Era fraco de um jeito
 * concreto — `assert.match(fonte, /PUBLIC_EXACT\.has\(pathname\)/)` passava a
 * verificar a POSIÇÃO do código, não o efeito dele, e quebrava em qualquer
 * refatoração sem nada ter mudado de comportamento.
 *
 * A lista saiu para `@/lib/rotasPublicas`, que não importa `next/server`. Agora
 * as asserções são sobre o que a função responde. Sobraram duas leituras de
 * fonte, e só porque são sobre o `proxy.ts` em si: que o guard ainda existe.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { PUBLIC_EXACT, PUBLIC_PREFIXES, rotaEhPublica } from "../../src/lib/rotasPublicas.ts";

const fonteDoProxy = readFileSync(
  fileURLToPath(new URL("../../src/proxy.ts", import.meta.url)),
  "utf8",
);

test("REGRESSÃO: /cadastro é pública — o CTA da landing aponta para ela", () => {
  // O botão "Criar a minha conta" do fim da landing leva a `/cadastro`, e a rota
  // não estava em lista nenhuma: todo visitante anônimo que clicava caía em
  // `/login?next=%2Fcadastro`. A página de criar conta era inalcançável
  // exatamente para quem não tem conta — sem erro, sem log, só o redirect.
  assert.equal(rotaEhPublica("/cadastro"), true);
});

test("as telas de DEPOIS do login continuam privadas", () => {
  // `/cadastro` entrou como EXATO, não como prefixo: `/cadastro/completar` e
  // `/cadastro/aceite` gravam identidade do titular e aceite dos documentos.
  for (const rota of ["/cadastro/completar", "/cadastro/aceite", "/cadastro/qualquer"]) {
    assert.equal(rotaEhPublica(rota), false, `${rota} nao pode ser publica`);
  }
});

test("o funil público abre sem sessão", () => {
  for (const rota of [
    "/",
    "/facies",
    "/facies/enare",
    // `/prova/[slug]` é a superfície pública por PROVA. Faltou na primeira vez e
    // a página caía em /login com HTTP 200 — só a captura, que loga a URL final,
    // denunciou.
    "/prova/enamed",
    "/prova/enamed/aposta",
    "/login",
    "/auth",
    "/auth/verify-email",
    "/auth/reset-password",
    // Decreto 7.962 art. 3: o contrato precisa estar disponível ANTES da
    // contratação. `app/api/routers/legal.py` já as serve fora do portão.
    "/termos",
    "/privacidade",
    // Link curto por prova: link longo com parâmetro morre no boca a boca, e o
    // canal deste produto é o print colado em grupo.
    "/enamed",
  ]) {
    assert.equal(rotaEhPublica(rota), true, `${rota} precisa ser publica`);
  }
});

test("as rotas do aluno continuam exigindo sessão", () => {
  for (const rota of [
    "/hoje",
    "/cronograma",
    "/banco",
    "/cards",
    "/desempenho",
    "/conta",
    "/admin",
    "/preferencias",
    "/onboarding",
    "/trilha",
    "/ativar-acesso",
  ]) {
    assert.equal(rotaEhPublica(rota), false, `${rota} nao pode ser publica`);
  }
});

test("prefixo público não vaza para a rota irmã mais longa", () => {
  // `"/provas".startsWith("/prova")` é TRUE, e `/provas` é AUTENTICADA. A mesma
  // armadilha do `"/"`, um nível abaixo: prefixo sem barra final abre o irmão
  // mais longo sem que a linha pareça errada.
  //
  // Hoje `/provas` só redireciona, então o vazamento seria inofensivo — e é
  // exatamente por isso que precisa de teste: ninguém vai notar no dia em que
  // ela voltar a ter conteúdo.
  assert.equal(rotaEhPublica("/prova/enamed"), true);
  assert.equal(rotaEhPublica("/provas"), false);
  assert.equal(rotaEhPublica("/facies/enare"), true);
  assert.equal(rotaEhPublica("/faciesx"), false);
});

test('"/" nunca entra em PUBLIC_PREFIXES — abriria o app inteiro', () => {
  assert.ok(PUBLIC_PREFIXES.length > 0, "PUBLIC_PREFIXES vazio");
  for (const prefixo of PUBLIC_PREFIXES) {
    assert.notEqual(prefixo, "/", 'PUBLIC_PREFIXES contem "/" e libera todas as rotas');
  }
  // E a prova pelo efeito, que é o que importa:
  assert.equal(rotaEhPublica("/"), true);
  assert.equal(rotaEhPublica("/hoje"), false);
});

test("arquivo estático passa", () => {
  for (const rota of ["/icon.png", "/manifest.webmanifest", "/fonts/x.woff2"]) {
    assert.equal(rotaEhPublica(rota), true, `${rota} precisa passar`);
  }
});

test("nenhuma rota que existe no disco virou pública sem estar declarada", () => {
  // Os testes acima listam rotas conhecidas; este pergunta ao DISCO. A diferença
  // aparece no dia em que alguém criar `/faciesX` ou `/provaY`: uma lista fixa
  // não saberia, e o `startsWith` abriria a rota nova sem uma linha de aviso.
  const DIR_APP = fileURLToPath(new URL("../../src/app", import.meta.url));

  // Segmentos reais. Grupos `(...)` e privados `_...` do App Router não viram rota.
  const rotas = readdirSync(DIR_APP, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("("))
    .map((e) => `/${e.name}`);

  // Quem PODE ser público, com o porquê no comentário da lista em rotasPublicas.
  const PUBLICAS_DECLARADAS = new Set([
    "/login",
    "/auth",
    "/facies",
    "/cadastro",
    "/termos",
    "/privacidade",
  ]);

  const vazamentos = rotas.filter(
    (rota) => rotaEhPublica(rota) && !PUBLICAS_DECLARADAS.has(rota),
  );

  assert.deepEqual(
    vazamentos,
    [],
    `Rota exposta sem estar declarada: ${vazamentos.join("; ")}. ` +
      "Prefixo sem barra final casa o segmento irmao.",
  );
});

test("a lista exata é revisada quando alguém acrescenta uma linha", () => {
  assert.deepEqual(
    [...PUBLIC_EXACT].sort(),
    ["/", "/auth", "/cadastro", "/enamed", "/facies", "/privacidade", "/termos"],
  );
});

test("o guard do proxy.ts continua existindo", () => {
  // As duas únicas leituras de fonte que sobraram: são sobre o `proxy.ts`, não
  // sobre a lista. Sem o guard, abrir `/` teria aberto tudo.
  assert.match(fonteDoProxy, /krosmed_session/);
  assert.match(fonteDoProxy, /url\.pathname\s*=\s*"\/login"/);
});
