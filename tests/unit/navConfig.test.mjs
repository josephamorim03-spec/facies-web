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

test("a navegacao e seis destinos, na ordem do desenho", () => {
  // A Rota saiu porque a tela dela era uma PERGUNTA — quanto tempo voce tem, com
  // que energia — e a pergunta morreu: o tamanho do dia vem do calendario e do
  // comportamento observado, e aparece como contexto da proxima acao no Hoje.
  // Os flashcards sairam da barra em 2026-08-29, atras de `NEXT_PUBLIC_FLASHCARDS`.
  // `/mapa` entrou quando a tela entrou.
  //
  // ⚠️ A CONTA VOLTOU, E ISTO REVERTE UMA DECISAO DE 2026-09-02.
  //
  // Ela tinha saido pelo argumento de que ocupava o peso visual de uma tela
  // diaria para tarefa que se faz poucas vezes por ano — e o argumento valia
  // para a Conta que existia entao: senha, exportar, encerrar.
  //
  // O desenho fecha o turno 14 com SEIS destinos, e a Conta que ele desenha
  // (`12c`) e outra tela: o estado do acesso, as suas provas, os avisos e, nos
  // proximos turnos, "Acessibilidade e leitura" (`14c`) e "Como voce resolve"
  // (`8f`). Deixa de ser a gaveta da senha e passa a ser onde o aluno ajusta o
  // produto — e ai o peso de destino permanente se justifica.
  //
  // A reversao foi decidida com o operador em 2026-09-02, com o argumento
  // anterior na mesa. Quem quiser voltar aos cinco: o filtro esta em
  // `INTENTS_VISIVEIS` (`navConfig.ts`), e o avatar no rodape da sidebar ja
  // levava a `/conta` antes e continua levando.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/hoje", "/mapa", "/banco", "/evolucao", "/preferencias", "/conta"],
  );
  // Uma barra so: no mobile e a barra inferior, no desktop o menu bar. Sem
  // divisorias, porque nao ha mais agrupamento por pergunta.
  assert.equal(NAV_GROUPS_CONFIG.length, 1);
});

test("a Conta esta na barra E no registro de rotas", () => {
  // Este teste nasceu guardando o ALCANCE da Conta quando ela saiu da barra:
  // tirar um item da barra e tirar a rota do registro sao coisas diferentes, e
  // confundi-las e como `/conta` viraria uma tela sem titulo, sem aba ativa e
  // sem pre-aquecimento.
  //
  // Com ela de volta a barra, a segunda metade continua valendo — e e ela que
  // pega o erro de alguem mexer no registro achando que so mexe no menu.
  assert.ok(findItem("/conta"), "/conta precisa estar na barra");
  assert.equal(getStudentPageTitle("/conta"), "Conta");
  assert.ok(getStudentRoute("/conta"), "/conta precisa continuar no registro de rotas");
});

test("nem Kros nem Rota sobrevivem como rotulo de menu", () => {
  // "Kros" saiu primeiro (virou nome interno do motor); "Rota" saiu depois, com
  // a propria aba. Os dois enderecos continuam 308 para o Hoje, entao ninguem
  // que os tenha salvos cai em 404 — mas nenhum dos dois volta ao menu.
  const labels = NAV_ITEMS.map((item) => item.shortLabel);
  assert.deepEqual(labels, ["Hoje", "Mapa", "Banco", "Evolução", "Rotina", "Conta"]);
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
    // A Evolucao tambem ficou sem filhos: `/preferencias` foi para Rotina e
    // `/estatisticas` e caminho legado dela mesma.
    [],
  );
  // `/rota` nao e mais destino nenhum: sem intencao, sem filhos.
  assert.deepEqual(getIntentChildren("/rota"), []);
});

test("a child route lights its parent tab", () => {
  assert.equal(isNavItemActive("/cronograma", findItem("/preferencias")), true);
  assert.equal(isNavItemActive("/banco/historico", findItem("/banco")), true);
  // A linha de `/cards/registros` saiu com a aba: `findItem("/cards")` devolve
  // `null` agora, e o teste passaria a afirmar sobre um item que nao existe.
  // Volta junto com a feature, quando `NEXT_PUBLIC_FLASHCARDS` voltar a "1".
  // `/preferencias` mudou de aba junto com o Cronograma: as duas sao "Minha
  // rotina" no artboard `14a`.
  assert.equal(isNavItemActive("/preferencias", findItem("/preferencias")), true);
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
  // O filho "O plano ate' a prova" passou a ser `/plano` (artboard `9c`): a
  // LEITURA do plano — fases, o que nao coube, quanto a rotina comporta.
  assert.equal(getStudentPageTitle("/plano"), "O plano até a prova");
  // `/cronograma` deixou de ser destino e virou FERRAMENTA: o calendario onde
  // se arrasta atividade entre dias, alcancavel por um link dentro do `/plano`.
  // Como caminho legado da area, ele herda o titulo dela — que e' verdade, e
  // nao a promessa de ser a tela do plano.
  assert.equal(getStudentPageTitle("/cronograma"), "Rotina");
  assert.equal(getStudentPageTitle("/banco/historico"), "Histórico");
  assert.equal(getStudentPageTitle("/cards/registros"), "Pesquisar");
  // O titulo vem do filho, e o filho agora se chama como a aba do artboard.
  assert.equal(getStudentPageTitle("/preferencias"), "Minha semana");
});

test("renderable legacy routes keep activating their canonical destination", () => {
  assert.equal(isNavItemActive("/today", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/semana", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/desempenho", findItem("/preferencias")), true);
  assert.equal(isNavItemActive("/estatisticas/relatorio", findItem("/evolucao")), true);
  assert.equal(isNavItemActive("/rotina-e-metas", findItem("/preferencias")), true);
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
