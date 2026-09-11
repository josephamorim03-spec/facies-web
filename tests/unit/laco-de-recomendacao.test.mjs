import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

/**
 * O laço de realimentação do motor: `shown` precisa existir, e precisa ser único.
 *
 * ## Por que este guard existe
 *
 * O disparo de `shown` foi removido no commit `00347875` ("fix(web):
 * convergencia visual do aluno", 2026-08-03) — uma mudança de layout. Nada ficou
 * vermelho. O último `shown` em produção é de 2026-08-02, e a métrica que ele
 * alimenta (`acceptance_rate = started / shown`) passou a devolver `None`, que na
 * tela se lê como "ainda não há dados" em vez de "o instrumento quebrou".
 *
 * Medido em 2026-09-09: a política que serve o aluno hoje
 * (`trainer-policy-5-effort-budget`) tinha 24 recomendações geradas e **zero**
 * eventos de qualquer tipo.
 *
 * ## Por que ele varre a árvore, e não um arquivo
 *
 * `exibicao-de-medida.test.mjs` já registra a lição: *"guard que segue o ARQUIVO,
 * e não a regra, é um guard que a refatoração desliga sem avisar."* Foi
 * exatamente uma refatoração de tela que matou o emissor. Então aqui a busca é
 * recursiva em `src/`: mover o código de lugar não desliga o teste, só apagar a
 * regra desliga.
 */

const RAIZ = new URL("../../src/", import.meta.url);

function arquivosDeCodigo(dir = RAIZ) {
  const saida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const alvo = new URL(entrada.name + (entrada.isDirectory() ? "/" : ""), dir);
    if (entrada.isDirectory()) {
      saida.push(...arquivosDeCodigo(alvo));
    } else if (/\.(ts|tsx)$/.test(entrada.name)) {
      // O contrato GERADO declara a uniao `"shown" | "started" | ...`; ele
      // descreve o tipo, nao emite evento nenhum.
      if (alvo.pathname.includes("/lib/api/generated/")) continue;
      saida.push({ caminho: alvo.pathname, fonte: readFileSync(alvo, "utf8") });
    }
  }
  return saida;
}

const CODIGO = arquivosDeCodigo();

/**
 * Só o que EMITE, nunca o que apenas declara o tipo.
 *
 * A vírgula é o que separa os dois casos: a emissão é uma propriedade de objeto
 * (`event_type: "shown",`), a declaração é uma união (`"shown" | "started"`).
 */
const EMISSAO = /event_type:\s*"shown"\s*,/;
const emissores = CODIGO.filter(({ fonte }) => EMISSAO.test(fonte));

test("alguem ainda emite `shown` — sem isso o motor nao sabe se acertou", () => {
  assert.ok(
    emissores.length > 0,
    'Nenhum arquivo em src/ emite `event_type: "shown"`. O laco de realimentacao ' +
      "esta quebrado: `acceptance_rate = started / shown` vai devolver `None` para " +
      "sempre. Foi assim que 37 dias passaram sem ninguem notar.",
  );
});

test("a emissao e idempotente por `event_id` — remontagem nao pode inflar a contagem", () => {
  for (const { caminho, fonte } of emissores) {
    const i = fonte.search(EMISSAO);
    const bloco = fonte.slice(Math.max(0, i - 400), i + 400);
    assert.match(
      bloco,
      /event_id:\s*`shown:\$\{/,
      `${caminho}: emite \`shown\` sem \`event_id\` deterministico. O emissor ` +
        "anterior deduplicava so' por `useRef`, que zera a cada remontagem — o banco " +
        "ficou com 273 eventos para 36 recomendacoes distintas.",
    );
  }
});

/**
 * Quem CHAMA o hook — que é outra coisa de quem contém a emissão.
 *
 * 🚨 A PROVA DE EXCLUSIVIDADE ERA VACUOSA, e isto é o conserto.
 *
 * Ela filtrava `emissores`, que é a lista de ficheiros contendo o literal
 * `event_type: "shown",`. Esse literal existe num sítio só — dentro do próprio
 * hook, em `lib/trainer/`, que a regex de permissão sempre aceitou. Ou seja: a
 * asserção media a lista vazia e passava por vacuidade, em qualquer estado do
 * código. Um chamador novo numa rota proibida nunca a teria feito reprovar.
 *
 * Foi assim que ela deixou passar, sem um pio, o chamador que este mesmo commit
 * acrescentou em `/app/inicio/`.
 *
 * É a lição que `test-asserts-proxy-not-property` já registava: o teste afirmava
 * um PROXY ("onde está o literal") e não a propriedade ("quem emite").
 */
const CHAMADA = /useRecordRecommendationShown\s*\(/;
const chamadores = CODIGO.filter(
  ({ caminho, fonte }) => CHAMADA.test(fonte) && !caminho.includes("/lib/trainer/"),
);

test("`shown` sai de DUAS telas, e de mais nenhuma", () => {
  // A regra era "exclusivo do /hoje", e foi afrouxada em 2026-09-10 -- com a
  // razao dela medida, nao por conveniencia.
  //
  // A razao antiga era a contagem repetida: a faixa do treinador renderiza em
  // varias paginas. Ela envelheceu no proprio ficheiro do hook, que ja declara
  // que o `event_id` e' deterministico (`shown:<recommendation_id>`) e que a
  // idempotencia passou a ser do SERVIDOR -- duas rotas com a mesma
  // recomendacao produzem o mesmo evento, e o servidor guarda um.
  //
  // O que forcou a mudanca foi a barra: `/inicio` virou a home e `/hoje` a tela
  // secundaria. Emitir so' do `/hoje` faria `acceptance_rate = started / shown`
  // voltar a dividir por quase zero.
  //
  // ⚠️ A LISTA CONTINUA FECHADA. Afrouxar de "uma tela" para "duas" nao e' abrir.
  assert.ok(chamadores.length > 0, "ninguem chama o hook — a varredura quebrou");
  const foraDasDuas = chamadores.filter(
    ({ caminho }) => !/\/app\/(hoje|inicio)\//.test(caminho),
  );
  assert.deepEqual(
    foraDasDuas.map((f) => f.caminho),
    [],
    "Chamar `useRecordRecommendationShown` fora de /hoje e /inicio emite a " +
      "partir de uma superficie que nao e' a home nem a agenda do dia.",
  );
});

test("as DUAS superficies consomem o emissor", () => {
  // ⚠️ O hook pode EXISTIR e nao ser chamado, e foi essa a forma exata da morte
  // anterior: um commit de "convergencia visual" tirou a chamada, sem teste
  // vermelho, e o ultimo `shown` em producao ficou datado de 2026-08-02.
  //
  // Sao duas telas agora, e a home e' a que mais importa -- e' ela que o aluno
  // abre. Perder a chamada la' seria perder a maior parte da medida.
  for (const arvore of ["/app/hoje/", "/app/inicio/"]) {
    const ficheiros = CODIGO.filter(({ caminho }) => caminho.includes(arvore));
    assert.ok(ficheiros.length > 0, `a arvore src${arvore} sumiu — reancore este guard`);
    assert.ok(
      ficheiros.some(({ fonte }) => CHAMADA.test(fonte)),
      `Nenhum componente de ${arvore} chama o emissor.`,
    );
  }
});

test("cada chamador declara DE ONDE emitiu", () => {
  // ⚠️ Sem a origem, `source_page` mentiria "/hoje" para eventos vindos do
  // Inicio, e a analise nao saberia qual das duas telas o aluno usa. O
  // parametro e' obrigatorio no tipo; o tipo nao impede passar a constante
  // errada, e esta prova conta as duas origens distintas.
  const origens = new Set();
  for (const { fonte } of chamadores) {
    for (const [, origem] of fonte.matchAll(
      /useRecordRecommendationShown\([^)]*?"(\/[a-z]+)"/gs,
    )) {
      origens.add(origem);
    }
  }
  assert.deepEqual(
    [...origens].sort(),
    ["/hoje", "/inicio"],
    "As duas telas tem de declarar origens DIFERENTES, senao o banco nao " +
      "distingue de onde veio o evento.",
  );
});
