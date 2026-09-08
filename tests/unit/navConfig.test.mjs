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
  navChildShortLabel,
} from "../../src/lib/navConfig.ts";

function findItem(href) {
  return NAV_ITEMS.find((candidate) => candidate.href === href) ?? null;
}

function childOf(pathname, href) {
  return getIntentChildren(pathname).find((child) => child.href === href) ?? null;
}

test("a navegacao e cinco destinos, no vocabulario do prontuario", () => {
  // Um caso clinico se le em tres tempos: voce EXAMINA, decide a CONDUTA, e
  // acompanha a EVOLUCAO. As duas taxonomias anteriores erravam pelo mesmo
  // motivo — nomeavam algo que nao era a cabeca de quem usa:
  //
  // - "Hoje · Banco · Evolucao · Rotina · Conta" nomeava a NOSSA arquitetura, e
  //   gastava dois pesos permanentes de barra (Rotina e Conta) na mesma
  //   pergunta, para tarefas que se fazem poucas vezes por ano;
  // - "Rota · Treino · Mapa · Dados · Voce" pedia emprestada uma metafora de
  //   GPS que so cobria DUAS das cinco abas.
  //
  // O Mapa fica no MEIO de proposito: ele e o exame — o territorio que se olha
  // antes de decidir a conduta e depois de praticar.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/hoje", "/banco", "/mapa", "/evolucao", "/conta"],
  );
  // Uma barra so: no mobile e a barra inferior, no desktop o menu bar. Sem
  // divisorias, porque nao ha mais agrupamento por pergunta.
  assert.equal(NAV_GROUPS_CONFIG.length, 1);
});

test("os rotulos sao os do prontuario, e a versal fica no CSS", () => {
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.shortLabel),
    ["Conduta", "Prática", "Mapa", "Evolução", "Você"],
  );
  // ⚠️ O DADO CONTINUA ACENTUADO E EM CAIXA MISTA. A barra desenha em versal
  // por `text-transform`, e o mesmo campo vira titulo de pagina e breadcrumb —
  // "voce esta em CONDUTA" nao se escreve assim. O checker de copy pt-BR le o
  // DOM, que segue acentuado.
  for (const item of NAV_ITEMS) {
    assert.notEqual(item.shortLabel, item.shortLabel.toUpperCase(),
      `${item.shortLabel} nao pode chegar em versal pelo dado`);
  }
});

test("nem Kros, nem Rota, nem Banco sobrevivem como rotulo de menu", () => {
  // "Kros" saiu primeiro (virou nome interno do motor); "Rota" saiu com a
  // propria aba; "Banco" saiu por descrever o ACERVO em vez do ato. Os
  // enderecos continuam 308 para o Hoje, entao ninguem que os tenha salvos cai
  // em 404 — mas nenhum dos tres volta ao menu.
  const rotulos = NAV_ITEMS.map((item) => item.shortLabel);
  for (const morto of ["Kros", "Rota", "Banco", "Rotina", "Conta", "Dados", "Treino"]) {
    assert.equal(rotulos.includes(morto), false, `"${morto}" e nome morto`);
  }
  assert.equal(findItem("/kros"), null);
  assert.equal(findItem("/rota"), null);
});

test("cada aba e dona das suas secoes", () => {
  assert.deepEqual(
    getIntentChildren("/hoje").map((child) => child.href),
    // O artboard `14a` desenha "Minha semana" e "O plano ate a prova" como duas
    // abas da MESMA tela. Como secoes da Conduta, a causa (a rotina) fica
    // alcancavel a partir do efeito (o dia que ela dimensiona).
    ["/hoje", "/preferencias", "/plano"],
  );
  assert.deepEqual(
    getIntentChildren("/banco").map((child) => child.href),
    // Com `NEXT_PUBLIC_FLASHCARDS` desligado — que e o default e o valor de
    // producao. Ligada, "/cards" entra entre "/banco" e "/banco/guardadas".
    ["/banco", "/banco/guardadas", "/banco/historico"],
  );
  // O Mapa nao tem secoes por DECISAO, e nao por omissao: ele e superficie de
  // exploracao livre, e sub-abas o transformariam em menu.
  assert.deepEqual(getIntentChildren("/mapa"), []);
  assert.deepEqual(getIntentChildren("/evolucao"), []);
  // A divisao aconteceu: `/preferencias` ficou so com a rotina (que e insumo
  // da Conduta) e as preferencias vieram para ca.
  assert.deepEqual(
    getIntentChildren("/conta").map((child) => child.href),
    ["/conta", "/conta/preferencias"],
  );
  // `/rota` nao e destino nenhum: sem intencao, sem secoes.
  assert.deepEqual(getIntentChildren("/rota"), []);
});

test("uma rota filha acende a aba do pai", () => {
  assert.equal(isNavItemActive("/cronograma", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/preferencias", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/plano", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/banco/historico", findItem("/banco")), true);
  assert.equal(isNavItemActive("/banco/sessao/abc", findItem("/banco")), true);
});

test("a secao mais profunda vence a irma que e seu prefixo", () => {
  // Casamento por prefixo simples acenderia as DUAS em `/banco/historico`,
  // porque ele tambem casa com `/banco`. Vence o alvo mais longo.
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco/historico")), true);
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco")), false);
  // E o pai continua ganhando quando a rota e exatamente ele.
  assert.equal(isNavChildActive("/banco", childOf("/banco", "/banco")), true);
  // ⚠️ `/conta/preferencias` E ANINHADA em `/conta`, e este e o caso que o
  // casamento por prefixo simples erraria: as duas secoes de Voce acenderiam
  // juntas. Vence o alvo mais longo.
  assert.equal(
    isNavChildActive("/conta/preferencias", childOf("/conta/preferencias", "/conta/preferencias")),
    true,
  );
  assert.equal(
    isNavChildActive("/conta/preferencias", childOf("/conta/preferencias", "/conta")),
    false,
  );
  // Mesmo caso dentro da Conduta: `/hoje` e `/plano` sao irmaos, nao aninhados.
  assert.equal(isNavChildActive("/plano", childOf("/plano", "/plano")), true);
  assert.equal(isNavChildActive("/plano", childOf("/plano", "/hoje")), false);
});

test("o titulo vem da secao, nao do rotulo da aba", () => {
  // Herdar o rotulo do pai chamaria o calendario de "Conduta" — que nao e nem
  // verdade nem util. `getStudentPageTitle` consulta a secao ativa primeiro.
  assert.equal(getStudentPageTitle("/hoje"), "Hoje");
  assert.equal(getStudentPageTitle("/plano"), "O plano até a prova");
  assert.equal(getStudentPageTitle("/preferencias"), "Minha semana");
  assert.equal(getStudentPageTitle("/banco/historico"), "Histórico");
  assert.equal(getStudentPageTitle("/banco/guardadas"), "Guardadas");
  assert.equal(getStudentPageTitle("/conta"), "Conta");
  assert.equal(getStudentPageTitle("/conta/preferencias"), "Preferências");
  assert.equal(getStudentPageTitle("/mapa"), "Mapa");
  assert.equal(getStudentPageTitle("/evolucao"), "Evolução");
  // `/cronograma` deixou de ser destino e virou FERRAMENTA: o calendario onde
  // se arrasta atividade entre dias, alcancavel por um link dentro do `/plano`.
  // Ele e' casado pelo `matches` da secao do plano, e herda o titulo DELA.
  assert.equal(getStudentPageTitle("/cronograma"), "O plano até a prova");
});

test("o botao da linha de secoes usa o rotulo curto quando existe", () => {
  // ⚠️ ISTO E' MEDIDA, NAO GOSTO. A linha de filhos do mobile e `flex-1` sem
  // rolagem: em 390px, tres botoes tem ~120px cada, e "O plano ate a prova" nao
  // cabe. O titulo inteiro continua no topo da tela.
  const plano = childOf("/plano", "/plano");
  assert.equal(plano.label, "O plano até a prova");
  assert.equal(navChildShortLabel(plano), "Plano");
  const semana = childOf("/preferencias", "/preferencias");
  assert.equal(navChildShortLabel(semana), "Semana");
  // Sem `shortLabel`, o botao cai no titulo — nada a manter em duas listas.
  assert.equal(navChildShortLabel(childOf("/hoje", "/hoje")), "Hoje");
  assert.equal(navChildShortLabel(childOf("/banco", "/banco")), "Questões");
});

test("caminhos legados renderizaveis acendem o destino canonico", () => {
  // ⚠️ A PALAVRA QUE MANDA E' "RENDERIZAVEIS".
  //
  // Este teste afirmava sobre `/today`, `/semana`, `/desempenho` e
  // `/rotina-e-metas`. As quatro paginas foram APAGADAS e viraram redirect em
  // `next.config.js`; `/trilha` sumiu sem nem virar redirect. O redirect
  // resolve ANTES do roteamento de arquivos, entao ninguem para nelas — e o
  // teste passou a guardar estado ativo para URL que o aluno nunca visita.
  //
  // Elas sairam de `LEGACY_PATHS` junto com esta linha, e a guarda contra o
  // retorno delas esta no teste seguinte, com as outras inalcancaveis.
  assert.equal(isNavItemActive("/cronograma", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/agenda-operacional", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/onboarding", findItem("/hoje")), true);
  assert.equal(isNavItemActive("/estatisticas/relatorio", findItem("/evolucao")), true);
});

test("aliases 308 inalcancaveis ficam DE FORA do registro, de proposito", () => {
  // Guarda contra a regressao inversa. Estes caminhos sao `permanent: true` em
  // next.config.js e nao tem diretorio em src/app: o 308 resolve ANTES do
  // roteamento de arquivos, entao o aluno nunca para neles. Readiciona-los faz
  // o menu carregar estado ativo para URL que ninguem alcanca.
  //
  // ⚠️ `/rota` merece nota propria. Ele foi cogitado como URL da primeira aba e
  // esta QUEIMADO: o 308 ja esta em producao, e o navegador de quem o visitou o
  // guarda sem pedir de novo — fazer dele o destino real prenderia esse aluno
  // em `/hoje` para sempre. Com "Conduta" o problema nem chega a existir.
  for (const path of [
    "/praticar",
    "/revisar",
    "/acompanhar",
    "/planejamento",
    "/caderno",
    "/kros",
    "/rota",
    // Estas cinco tinham PAGINA e a perderam: viraram redirect (ou, no caso de
    // `/trilha`, nada). Entram aqui para que ninguem as devolva a
    // `LEGACY_PATHS` por engano — foi de la que elas sairam.
    "/today",
    "/semana",
    "/desempenho",
    "/rotina-e-metas",
    "/trilha",
  ]) {
    assert.equal(getStudentRoute(path), null, `${path} deveria ser 308, nao rota do registro`);
  }
});

test("toda tela do app RESOLVE — nenhuma fica sem aba acesa", () => {
  // ⚠️ ESTE TESTE NASCEU DE UM DEFEITO MEDIDO. `/voce` — o hub que substituiu a
  // linha de secoes quando o rodape perdeu a segunda fileira — existia como
  // pagina e era alcancavel pela sidebar, mas nao estava no registro:
  // `getStudentRoute` devolvia `null`, o titulo saia VAZIO no topo do celular,
  // NENHUMA aba acendia e nao havia pre-aquecimento. O aluno ficava numa tela e
  // a barra nao dizia onde ele estava.
  //
  // Criar a tela e registrar a rota sao dois passos, e o segundo nao avisa
  // quando falta. Esta lista e o aviso.
  for (const path of [
    "/hoje",
    "/banco",
    "/mapa",
    "/evolucao",
    "/conta",
    "/conta/preferencias",
    "/preferencias",
    "/plano",
    "/voce",
  ]) {
    assert.ok(getStudentRoute(path), `${path} precisa estar no registro de rotas`);
    assert.notEqual(getStudentPageTitle(path), "", `${path} nao pode ficar sem titulo`);
    const acesas = NAV_ITEMS.filter((item) => isNavItemActive(path, item));
    assert.equal(acesas.length, 1, `${path} deveria acender UMA aba, acendeu ${acesas.length}`);
  }
});

test("o rotulo da secao ativa nomeia o trecho atual", () => {
  assert.equal(getActiveChildLabel("/cronograma"), "O plano até a prova");
  assert.equal(getActiveChildLabel("/banco/historico"), "Histórico");
  assert.equal(getActiveChildLabel("/rota"), null);
});

test("o registro e dono das sessoes canonicas do banco", () => {
  const route = getStudentRoute("/banco/sessao/abc");
  assert.equal(route?.intent, "pratica");
  assert.equal(route?.icon, "pratica");
  assert.equal(route?.warmup, "pratica");
});

test("as chaves de intencao acompanham os rotulos", () => {
  // Deixar a chave em ingles desalinhada do rotulo foi o que fez "Banco"
  // sobreviver a dois redesenhos: o codigo dizia `bank` e ninguem lia a barra
  // ao mexer nele. Cada destino responde pelo proprio nome.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.icon),
    ["conduta", "pratica", "mapa", "evolucao", "voce"],
  );
  assert.equal(getStudentRoute("/hoje")?.intent, "conduta");
  assert.equal(getStudentRoute("/mapa")?.intent, "mapa");
  assert.equal(getStudentRoute("/evolucao")?.intent, "evolucao");
  assert.equal(getStudentRoute("/conta")?.intent, "voce");
});
