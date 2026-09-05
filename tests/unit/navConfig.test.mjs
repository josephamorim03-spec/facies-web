import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NAV_GROUPS_CONFIG,
  NAV_ITEMS,
  getActiveChildLabel,
  getIntentChildren,
  getStudentPageTitle,
  getStudentRoute,
  isNavChildActive,
  isNavItemActive,
} from "../../src/lib/navConfig.ts";

function findItem(href) {
  return NAV_ITEMS.find((candidate) => candidate.href === href) ?? null;
}

function childOf(pathname, href) {
  return getIntentChildren(pathname).find((child) => child.href === href) ?? null;
}

test("a navegacao e cinco destinos, na ordem do desenho", () => {
  // A Rota saiu porque a tela dela era uma PERGUNTA — quanto tempo voce tem, com
  // que energia — e a pergunta morreu: o tamanho do dia vem do calendario e do
  // comportamento observado, e aparece como contexto da proxima acao no Hoje.
  // Os flashcards sairam da barra em 2026-08-29, atras de `NEXT_PUBLIC_FLASHCARDS`.
  // `/mapa` entrou quando a tela entrou.
  //
  // ⚠️ SAO CINCO, E ISTO REVERTE OS SEIS DE 2026-09-02.
  //
  // A Conta tinha voltado a barra porque o desenho fecha o turno 14 com seis
  // destinos e a `12c` deixou de ser a gaveta da senha. O argumento continua
  // valido para o CONTEUDO da Conta; o que mudou foi onde ela mora.
  //
  // Tres motivos, na ordem em que pesam (o longo esta em `navConfig.ts`):
  // 1. a 320px seis abas estouravam ~40px, e o e2e so' media a 390;
  // 2. quatro destinos de conteudo + um de pessoa e' a gramatica que este
  //    publico usa todo dia;
  // 3. o operador pediu que rotina e calendario nao tivessem peso permanente.
  //
  // Rotina e Conta viraram FILHOS de "Você", nao sumiram. Para voltar aos seis:
  // `INTENTS_VISIVEIS` em `navConfig.ts`.
  // ⚠️ O MAPA ESTA NO MEIO, e a posicao e parte do contrato.
  //
  // O operador pediu (2026-09-05) que ele ficasse no centro dos cinco: e onde
  // o polegar descansa, e e o lugar que Instagram e TikTok reservam a acao que
  // a casa quer que voce faca. Um teste que so contasse cinco destinos deixaria
  // a ordem escorregar de volta sem ninguem notar.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/hoje", "/banco", "/mapa", "/evolucao", "/voce"],
  );
  assert.equal(NAV_ITEMS[2].href, "/mapa", "o mapa e o terceiro de cinco");
  // Uma barra so: no mobile e a barra inferior, no desktop o menu bar. Sem
  // divisorias, porque nao ha mais agrupamento por pergunta.
  assert.equal(NAV_GROUPS_CONFIG.length, 1);
});

test("Conta e Rotina saem da BARRA sem sair do alcance", () => {
  // O par que este teste guarda: tirar um item da barra e tirar a rota do
  // registro sao coisas diferentes. Confundi-las e como `/conta` viraria uma
  // tela sem titulo, sem aba ativa e sem pre-aquecimento — e e' o erro que
  // alguem comete ao mexer no registro achando que so mexe no menu.
  assert.equal(findItem("/conta"), null, "/conta nao e mais destino da barra");
  assert.equal(findItem("/preferencias"), null, "/preferencias nao e mais destino da barra");

  // Continuam com titulo, com rota e com aba acesa.
  assert.equal(getStudentPageTitle("/conta"), "Conta");
  assert.equal(getStudentPageTitle("/preferencias"), "Minha semana");
  assert.ok(getStudentRoute("/conta"), "/conta precisa continuar no registro de rotas");
  assert.equal(isNavItemActive("/conta", findItem("/voce")), true);
  assert.equal(isNavItemActive("/preferencias", findItem("/voce")), true);
});

test("nem Kros nem Rota sobrevivem como rotulo de menu", () => {
  // "Kros" saiu primeiro (virou nome interno do motor); "Rota" saiu depois, com
  // a propria aba. Os dois enderecos continuam 308 para o Hoje, entao ninguem
  // que os tenha salvos cai em 404 — mas nenhum dos dois volta ao menu.
  const labels = NAV_ITEMS.map((item) => item.shortLabel);
  assert.deepEqual(labels, ["Hoje", "Banco", "Mapa", "Evolução", "Você"]);
  assert.equal(findItem("/kros"), null);
  assert.equal(findItem("/rota"), null);
});

test("each tab owns its children", () => {
  assert.deepEqual(
    getIntentChildren("/hoje").map((child) => child.href),
    // O Hoje ficou sem filhos: o Cronograma mudou para Rotina, junto com a
    // semana padrao, que e como o artboard `14a` os apresenta.
    [],
  );
  assert.deepEqual(
    getIntentChildren("/banco").map((child) => child.href),
    // "Guardadas" entrou entre montar e historico: e a leitura da colecao do
    // aluno, e vive sob o Banco porque a barra tem SEIS destinos e o setimo nao
    // caberia em 390px. A ordem e a do uso: montar (todo dia), guardadas
    // (quando lembra), historico (raro).
    ["/banco", "/banco/guardadas", "/banco/historico"],
  );
  assert.deepEqual(
    getIntentChildren("/cards").map((child) => child.href),
    ["/cards", "/cards/registros"],
  );
  assert.deepEqual(
    getIntentChildren("/evolucao").map((child) => child.href),
    // A Evolucao tambem ficou sem filhos: `/preferencias` foi para Você e
    // `/estatisticas` e caminho legado dela mesma.
    [],
  );
  assert.deepEqual(
    getIntentChildren("/voce").map((child) => child.href),
    // O que era Rotina (duas abas do `14a`) e Conta virou a linha de filhos de
    // "Você". A ordem e' a do uso, e a Conta fica por ultimo porque se toca
    // poucas vezes por ano.
    //
    // ⚠️ `/voce` NAO esta na lista, de proposito: a aba nao e' filha de si
    // mesma, senao `hasChildRow` desenharia a linha de secoes na propria tela
    // -- chrome permanente repetindo o menu que a pagina ja e'.
    ["/preferencias", "/plano", "/conta"],
  );
  // `/rota` nao e mais destino nenhum: sem intencao, sem filhos.
  assert.deepEqual(getIntentChildren("/rota"), []);
});

test("a child route lights its parent tab", () => {
  assert.equal(isNavItemActive("/cronograma", findItem("/voce")), true);
  assert.equal(isNavItemActive("/banco/historico", findItem("/banco")), true);
  // A linha de `/cards/registros` saiu com a aba: `findItem("/cards")` devolve
  // `null` agora, e o teste passaria a afirmar sobre um item que nao existe.
  // Volta junto com a feature, quando `NEXT_PUBLIC_FLASHCARDS` voltar a "1".
  // `/preferencias` mudou de aba junto com o Cronograma: as duas sao "Minha
  // rotina" no artboard `14a`, e a Rotina inteira passou a viver em "Você".
  assert.equal(isNavItemActive("/preferencias", findItem("/voce")), true);
  assert.equal(isNavItemActive("/banco/sessao/abc", findItem("/banco")), true);
});

test("the deeper child wins over its prefix sibling", () => {
  // Casamento por prefixo simples acenderia as DUAS abas em `/banco/historico`,
  // porque ele tambem casa com `/banco`. Vence o alvo mais longo.
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco/historico")), true);
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco")), false);
  assert.equal(isNavChildActive("/cards/registros", childOf("/cards/registros", "/cards/registros")), true);
  assert.equal(isNavChildActive("/cards/registros", childOf("/cards/registros", "/cards")), false);
  // E o pai continua ganhando quando a rota e' exatamente ele.
  assert.equal(isNavChildActive("/banco", childOf("/banco", "/banco")), true);
});

test("page titles come from the child, not from the parent tab", () => {
  // Com o Cronograma morando sob INICIO, herdar o rotulo do pai chamaria a tela
  // de "Inicio" — que e exatamente o problema que o programa de design existe
  // para resolver: menu, titulo e URL dizendo a mesma coisa.
  assert.equal(getStudentPageTitle("/hoje"), "Hoje");
  // ⚠️ ABA COM FILHOS TAMBEM PRECISA DE TITULO PROPRIO. `/voce` tem tres filhos
  // e nenhum deles e' ela mesma, entao ela nascia fora do registro e a barra de
  // topo do celular abria em branco.
  assert.equal(getStudentPageTitle("/voce"), "Você");
  // E o empate continua indo para o FILHO onde os dois existem.
  assert.equal(getStudentPageTitle("/banco"), "Montar sessão");
  // O filho "O plano ate' a prova" passou a ser `/plano` (artboard `9c`): a
  // LEITURA do plano — fases, o que nao coube, quanto a rotina comporta.
  assert.equal(getStudentPageTitle("/plano"), "O plano até a prova");
  // `/cronograma` deixou de ser destino e virou FERRAMENTA: o calendario onde
  // se arrasta atividade entre dias, alcancavel por um link dentro do `/plano`
  // e da tela `/voce`. Como caminho legado da area, ele herda o titulo dela —
  // que e' verdade, e nao a promessa de ser a tela do plano.
  assert.equal(getStudentPageTitle("/cronograma"), "Você");
  assert.equal(getStudentPageTitle("/banco/historico"), "Histórico");
  assert.equal(getStudentPageTitle("/cards/registros"), "Pesquisar");
  // O titulo vem do filho, e o filho agora se chama como a aba do artboard.
  assert.equal(getStudentPageTitle("/preferencias"), "Minha semana");
});

test("renderable legacy routes keep activating their canonical destination", () => {
  assert.equal(isNavItemActive("/today", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/semana", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/desempenho", findItem("/voce")), true);
  assert.equal(isNavItemActive("/estatisticas/relatorio", findItem("/evolucao")), true);
  assert.equal(isNavItemActive("/rotina-e-metas", findItem("/voce")), true);
});

test("unreachable 308 aliases are deliberately absent from the nav registry", () => {
  // Guarda contra a regressao inversa. Estes caminhos sao `permanent: true` em
  // next.config.js e nao tem diretorio em src/app: o 308 resolve ANTES do
  // roteamento de arquivos, entao o aluno nunca para neles. Readiciona-los faz
  // o menu carregar estado ativo para URL que ninguem alcanca.
  //
  // `/kros` entrou nesta lista quando a tela virou `/rota`; `/rota` entrou
  // quando a propria aba morreu junto com a pergunta de tempo e energia.
  for (const path of [
    "/praticar",
    "/revisar",
    "/acompanhar",
    "/planejamento",
    "/caderno",
    "/kros",
    "/rota",
  ]) {
    assert.equal(getStudentRoute(path), null, `${path} deveria ser 308, nao rota do registro`);
  }
});

test("the active child label names the current section", () => {
  assert.equal(getActiveChildLabel("/cronograma"), "O plano até a prova");
  assert.equal(getActiveChildLabel("/banco/historico"), "Histórico");
  assert.equal(getActiveChildLabel("/rota"), null);
});

test("the route registry owns canonical bank sessions", () => {
  const route = getStudentRoute("/banco/sessao/abc");
  assert.equal(route?.intent, "bank");
  assert.equal(route?.icon, "bank");
  assert.equal(route?.warmup, "bank");
});
