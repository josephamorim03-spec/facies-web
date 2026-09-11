import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * 🚨 A CHAVE É LIGADA ANTES DO IMPORT, e o import é dinâmico por causa disso.
 *
 * `FLASHCARDS_LIGADOS` (`lib/flags.ts`) lê `process.env.NEXT_PUBLIC_FLASHCARDS`
 * no CARREGAMENTO do módulo, e `next.config.js` — que declara o default "1" —
 * não corre no runner de provas. Com `import` estático, este ficheiro media a
 * barra com a chave DESLIGADA, ou seja quatro abas: uma configuração que existe,
 * mas não é a de produção.
 *
 * Era um buraco real e recente: enquanto os flashcards estiveram fora, as
 * provas nunca viram o estado ligado, e ninguém notou porque os dois estados
 * coincidiam. A prova do estado desligado tem ficheiro próprio
 * (`navConfig-flashcards-desligados.test.mjs`), porque só um valor por processo
 * é possível.
 */
process.env.NEXT_PUBLIC_FLASHCARDS = "1";

const {
  NAV_GROUPS_CONFIG,
  NAV_ITEMS,
  NAV_ITEMS_DESKTOP,
  getActiveChildLabel,
  getIntentChildren,
  getStudentPageTitle,
  getStudentRoute,
  isNavChildActive,
  isNavItemActive,
  navChildShortLabel,
} = await import("../../src/lib/navConfig.ts");

function findItem(href) {
  return NAV_ITEMS.find((candidate) => candidate.href === href) ?? null;
}

function childOf(pathname, href) {
  return getIntentChildren(pathname).find((child) => child.href === href) ?? null;
}

test("a navegacao e cinco destinos, ordenados por frequencia de uso", () => {
  // A taxonomia mudou de EIXO em 2026-09-10, a pedido do operador: deixou de
  // ser o raciocinio clinico (EXAMINA › PLANO › EVOLUCAO) e passou a ser o que
  // o aluno faz todo dia.
  //
  // As tres taxonomias anteriores, e o erro de cada uma:
  //
  // - "Hoje · Banco · Evolucao · Rotina · Conta" nomeava a NOSSA arquitetura, e
  //   gastava dois pesos permanentes (Rotina e Conta) na mesma pergunta;
  // - "Rota · Treino · Mapa · Dados · Voce" pedia emprestada uma metafora de
  //   GPS que so cobria DUAS das cinco abas;
  // - "Plano · Pratica · Mapa · Evolucao · Voce" acertou a lingua e errou a
  //   frequencia: tres das cinco abas eram tarefas de mes, e as duas de estudo
  //   ativo ficavam espremidas numa so.
  //
  // O Mapa continua no lugar de EXPLORAR, entre o estudo ativo e o menu.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/inicio", "/cards", "/banco", "/mapa", "/mais"],
  );
  // Uma barra so: no mobile e a barra inferior, no desktop o menu bar.
  assert.equal(NAV_GROUPS_CONFIG.length, 1);
});

test("os rotulos sao os novos, e a versal continua no CSS", () => {
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.shortLabel),
    ["Início", "Cards", "Banco", "Mapa", "Mais"],
  );
  // ⚠️ O DADO CONTINUA ACENTUADO E EM CAIXA MISTA. A barra desenha em versal
  // por `text-transform`, e o mesmo campo vira titulo de pagina e breadcrumb —
  // "voce esta em INICIO" nao se escreve assim. O checker de copy pt-BR le o
  // DOM, que segue acentuado.
  for (const item of NAV_ITEMS) {
    assert.notEqual(item.shortLabel, item.shortLabel.toUpperCase(),
      `${item.shortLabel} nao pode chegar em versal pelo dado`);
  }
});

test("🚨 'Banco' VOLTOU como rotulo, e a reversao esta declarada", () => {
  // ⚠️ ESTE TESTE AFIRMAVA O CONTRARIO. Ele chamava-se "nem Kros, nem Rota, nem
  // Banco sobrevivem como rotulo de menu" e provava que "Banco" era nome morto,
  // por descrever o ACERVO em vez do ato.
  //
  // O argumento continua correto e DEIXOU DE DECIDIR. Com Cards ao lado na
  // barra, o par precisa de nomear os dois OBJETOS — "cartao" e "banco de
  // questoes" — porque e o objeto que os separa: os dois sao "praticar", e um
  // rotulo de ato nao distinguiria nenhum.
  //
  // Reversao pedida pelo operador em 2026-09-10, registada aqui em vez de feita
  // em silencio. Se alguem quiser desfaze-la, o caminho e trocar tambem o
  // "Cards" por um nome de ato — nao ha meio-termo coerente.
  const rotulos = NAV_ITEMS.map((item) => item.shortLabel);
  assert.equal(rotulos.includes("Banco"), true);

  // Os que continuam mortos, e por que:
  //  * "Kros" virou nome interno do motor;
  //  * "Rota" saiu com a propria aba, e a URL esta queimada por um 308;
  //  * "Conduta" nomeava um ato pontual e a aba virou o TEMPO;
  //  * "Pratica" era o guarda-chuva que escondia que Cards e Banco sao gestos
  //    diferentes -- foi ele que este redesenho partiu em dois.
  // 🚨 "Rotina" SAIU desta lista em 2026-09-10, e a reversao e' declarada.
  //
  // Ela era proibida como nome de ABA, na taxonomia "Hoje · Banco · Evolucao ·
  // Rotina · Conta", onde gastava um dos cinco pesos permanentes numa tarefa
  // de mes. O argumento era sobre o PESO na barra, nao sobre a palavra.
  //
  // Como nome de TELA ela sempre foi exata, e a tela chamava-se "Minha semana"
  // — um segundo nome para a mesma coisa. Agora e' "Rotina" em todo o lado, e
  // aparece no menu do DESKTOP (`NAV_ITEMS_DESKTOP`), nunca na barra do
  // telemovel: a prova abaixo continua a garantir isso.
  for (const morto of ["Kros", "Rota", "Dados", "Treino", "Conduta", "Prática"]) {
    assert.equal(rotulos.includes(morto), false, `"${morto}" e nome morto`);
  }
  // A barra do telemovel continua sem "Rotina": la' o peso permanente e' o
  // argumento original, e ele nao mudou.
  assert.equal(rotulos.includes("Rotina"), false);
  assert.equal(findItem("/kros"), null);
  assert.equal(findItem("/rota"), null);
});

test("cada aba e dona das suas secoes", () => {
  // O Inicio nao tem secoes: ele E o resumo, e a decisao do que mostrar e do
  // sistema (escolha do operador -- sem tela de configuracao). Sub-abas
  // devolveriam ao aluno a escolha que ele pediu para nao ter.
  assert.deepEqual(getIntentChildren("/inicio"), []);

  // ✅ O CADERNO GANHOU PORTA. `navConfig.ts` registava isto como decisao em
  // aberto -- ele so era alcancavel pelo `matches`, sem botao, porque cinco
  // secoes nao cabiam em 390px enquanto Cards vivia dentro da Pratica.
  assert.deepEqual(
    getIntentChildren("/cards").map((child) => child.href),
    ["/cards", "/cards/registros"],
  );

  assert.deepEqual(
    getIntentChildren("/banco").map((child) => child.href),
    ["/banco", "/banco/guardadas", "/banco/historico"],
  );

  // O Mapa nao tem secoes por DECISAO, e nao por omissao: ele e superficie de
  // exploracao livre, e sub-abas o transformariam em menu.
  assert.deepEqual(getIntentChildren("/mapa"), []);

  // ⚠️ O "Mais" tambem nao, e por outro motivo: a TELA dele ja e a lista
  // agrupada. Uma fileira de botoes por cima de uma lista dos mesmos destinos
  // seria o mesmo menu duas vezes -- e sao nove destinos, que nao cabem numa
  // fileira de 390px.
  assert.deepEqual(getIntentChildren("/mais"), []);

  // `/rota` nao e destino nenhum: sem intencao, sem secoes.
  assert.deepEqual(getIntentChildren("/rota"), []);
});

test("uma rota filha acende a aba do pai", () => {
  // O calendario inteiro mudou de casa: era secao do Plano, virou destino do
  // "Mais".
  assert.equal(isNavItemActive("/cronograma", findItem("/mais")), true);
  assert.equal(isNavItemActive("/cronograma/mes", findItem("/mais")), true);
  assert.equal(isNavItemActive("/plano", findItem("/mais")), true);
  assert.equal(isNavItemActive("/preferencias", findItem("/mais")), true);
  assert.equal(isNavItemActive("/conta", findItem("/mais")), true);
  assert.equal(isNavItemActive("/voce", findItem("/mais")), true);
  // A Evolucao saiu da barra e entrou no menu -- sair da barra nao pode virar
  // sumir.
  assert.equal(isNavItemActive("/evolucao", findItem("/mais")), true);
  // A agenda do dia continua a ser tela viva, sob o Inicio.
  assert.equal(isNavItemActive("/hoje", findItem("/inicio")), true);
  assert.equal(isNavItemActive("/banco/historico", findItem("/banco")), true);
  assert.equal(isNavItemActive("/banco/sessao/abc", findItem("/banco")), true);
  assert.equal(isNavItemActive("/cards/registros", findItem("/cards")), true);
});

test("a secao mais profunda vence a irma que e seu prefixo", () => {
  // Casamento por prefixo simples acenderia as DUAS em `/banco/historico`,
  // porque ele tambem casa com `/banco`. Vence o alvo mais longo.
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco/historico")), true);
  assert.equal(isNavChildActive("/banco/historico", childOf("/banco/historico", "/banco")), false);
  // E o pai continua ganhando quando a rota e exatamente ele.
  assert.equal(isNavChildActive("/banco", childOf("/banco", "/banco")), true);
  // ⚠️ MESMO CASO DENTRO DO CARDS, e ele e novo: `/cards/registros` casa por
  // prefixo com `/cards`, e as duas secoes acenderiam juntas.
  assert.equal(
    isNavChildActive("/cards/registros", childOf("/cards/registros", "/cards/registros")),
    true,
  );
  assert.equal(isNavChildActive("/cards/registros", childOf("/cards/registros", "/cards")), false);
});

test("o titulo vem da secao quando ha secao, e da rota quando nao ha", () => {
  assert.equal(getStudentPageTitle("/inicio"), "Início");
  // ⚠️ A ABA continua "Cards" e as SECÇÕES passaram a nomear o ato
  // (2026-09-10, a pedido do operador). "Cards | Cards" — aba e primeira
  // secção com o mesmo nome — não dizia o que mudava ao tocar.
  assert.equal(getStudentPageTitle("/cards"), "Praticar");
  assert.equal(getStudentPageTitle("/cards/registros"), "Registros");
  assert.equal(getStudentPageTitle("/banco/historico"), "Histórico");
  assert.equal(getStudentPageTitle("/banco/guardadas"), "Guardadas");
  assert.equal(getStudentPageTitle("/mapa"), "Mapa");
  assert.equal(getStudentPageTitle("/mais"), "Mais");

  // 🚨 AS NOVE TELAS DO "MAIS" TEM TITULO PROPRIO, e e por isso que
  // `LEGACY_PATHS` passou a aceitar `{ path, title }`.
  //
  // Enquanto cada caminho legado era um alias da propria aba (`/estatisticas`
  // sob Evolucao), herdar o rotulo do pai era exato. O "Mais" nao e isso: ele
  // guarda nove telas com nomes proprios, e herdar daria a TODAS o titulo
  // "Mais" -- no topo do telemovel e no breadcrumb. Um alias herda; um destino
  // tem nome.
  assert.equal(getStudentPageTitle("/hoje"), "Hoje");
  assert.equal(getStudentPageTitle("/plano"), "O plano até a prova");
  // 🚨 "Rotina", e era "Minha semana" — um nome só, em todo o lado. Ver a
  // ressalva em `LEGACY_PATHS.mais`: a palavra estava proibida como nome de
  // ABA, não como nome de TELA.
  assert.equal(getStudentPageTitle("/preferencias"), "Rotina");
  assert.equal(getStudentPageTitle("/voce"), "Você");
  assert.equal(getStudentPageTitle("/conta"), "Conta");
  assert.equal(getStudentPageTitle("/conta/preferencias"), "Preferências");
  assert.equal(getStudentPageTitle("/evolucao"), "Evolução");
  assert.equal(getStudentPageTitle("/cronograma"), "Semana");
  assert.equal(getStudentPageTitle("/cronograma/mes"), "Mês");

  // ⚠️ NENHUM pode ficar vazio: era o defeito medido de `/voce`, que existia
  // como pagina e nao estava no registro -- titulo vazio no topo do celular e
  // nenhuma aba acesa.
  for (const path of ["/hoje", "/plano", "/preferencias", "/voce", "/evolucao"]) {
    assert.notEqual(getStudentPageTitle(path), "", `${path} nao pode ficar sem titulo`);
  }
});

test("o botao da linha de secoes cai no titulo quando nao ha rotulo curto", () => {
  // ⚠️ HOJE NENHUMA SECAO USA `shortLabel`, e isso e' consequencia do redesenho,
  // nao esquecimento: quem precisava dele era "Minha semana" (que virava
  // "Semana" na fileira), e essa tela saiu das secoes para a lista do "Mais".
  //
  // O campo e a funcao ficam porque o `IntentSubNav` continua a chama-la, e
  // porque a medida que os justificou nao mudou: em 390px a fileira tem ~120px
  // por botao, e rotulo longo nao cabe. A proxima secao com nome comprido volta
  // a precisar.
  assert.equal(navChildShortLabel(childOf("/banco", "/banco")), "Questões");
  assert.equal(navChildShortLabel(childOf("/cards", "/cards")), "Praticar");
  assert.equal(navChildShortLabel(childOf("/cards/registros", "/cards/registros")), "Registros");
});

test("caminhos legados renderizaveis acendem o destino canonico", () => {
  // ⚠️ A PALAVRA QUE MANDA E' "RENDERIZAVEIS".
  //
  // Este teste afirmava sobre `/today`, `/semana`, `/desempenho` e
  // `/rotina-e-metas`. As quatro paginas foram APAGADAS e viraram redirect em
  // `next.config.js`; `/trilha` sumiu sem nem virar redirect. O redirect
  // resolve ANTES do roteamento de arquivos, entao ninguem para nelas.
  assert.equal(isNavItemActive("/onboarding", findItem("/inicio")), true);
  assert.equal(isNavItemActive("/estatisticas/relatorio", findItem("/mais")), true);
  // ⚠️ `/agenda-operacional` SAIU do registro pela mesma regra: ele e 307 para
  // `/cronograma/mes`, entao o aluno nunca para nele.
  assert.equal(getStudentRoute("/agenda-operacional"), null);
});

test("aliases 308 inalcancaveis ficam DE FORA do registro, de proposito", () => {
  // Guarda contra a regressao inversa. Estes caminhos sao `permanent: true` em
  // next.config.js e nao tem diretorio em src/app: o 308 resolve ANTES do
  // roteamento de arquivos, entao o aluno nunca para neles.
  //
  // ⚠️ `/rota` merece nota propria. Ele foi cogitado como URL da primeira aba —
  // duas vezes — e esta QUEIMADO: o 308 ja esta em producao, e o navegador de
  // quem o visitou o guarda sem pedir de novo. Foi por isso que a aba nova se
  // chama `/inicio`.
  //
  // ⚠️ `/revisar` e `/caderno` continuam aqui DEPOIS de os flashcards voltarem:
  // eles sao 308 para `/cards` e `/cards/registros`, que sao as rotas vivas.
  for (const path of [
    "/praticar",
    "/revisar",
    "/acompanhar",
    "/planejamento",
    "/caderno",
    "/kros",
    "/rota",
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
  // ⚠️ ESTE TESTE NASCEU DE UM DEFEITO MEDIDO. `/voce` existia como pagina e
  // nao estava no registro: `getStudentRoute` devolvia `null`, o titulo saia
  // VAZIO no topo do celular, NENHUMA aba acendia e nao havia pre-aquecimento.
  //
  // Criar a tela e registrar a rota sao dois passos, e o segundo nao avisa
  // quando falta. Esta lista e o aviso — e ela cresceu com as rotas novas
  // (`/inicio`, `/mais`) e com as que voltaram (`/cards`).
  for (const path of [
    "/inicio",
    "/hoje",
    "/cards",
    "/cards/registros",
    "/banco",
    "/banco/guardadas",
    "/banco/historico",
    "/mapa",
    "/mais",
    "/voce",
    "/evolucao",
    "/conta",
    "/conta/preferencias",
    "/preferencias",
    "/plano",
    "/cronograma",
    "/cronograma/mes",
  ]) {
    assert.ok(getStudentRoute(path), `${path} precisa estar no registro de rotas`);
    assert.notEqual(getStudentPageTitle(path), "", `${path} nao pode ficar sem titulo`);
    const acesas = NAV_ITEMS.filter((item) => isNavItemActive(path, item));
    assert.equal(acesas.length, 1, `${path} deveria acender UMA aba, acendeu ${acesas.length}`);
  }
});

test("o rotulo da secao ativa nomeia o trecho atual", () => {
  assert.equal(getActiveChildLabel("/banco/historico"), "Histórico");
  assert.equal(getActiveChildLabel("/cards/registros"), "Registros");
  assert.equal(getActiveChildLabel("/rota"), null);
  // ⚠️ O calendario deixou de ter secao: ele e destino do "Mais", que nao tem
  // fileira. O titulo dele vem da ROTA -- ver a prova de titulos acima.
  assert.equal(getActiveChildLabel("/cronograma"), null);
  assert.equal(getActiveChildLabel("/plano"), null);
});

test("o registro e dono das sessoes canonicas do banco", () => {
  const route = getStudentRoute("/banco/sessao/abc");
  assert.equal(route?.intent, "banco");
  assert.equal(route?.icon, "banco");
  assert.equal(route?.warmup, "banco");
});

test("as chaves de intencao acompanham os rotulos", () => {
  // Deixar a chave em ingles desalinhada do rotulo foi o que fez "Banco"
  // sobreviver a dois redesenhos: o codigo dizia `bank` e ninguem lia a barra
  // ao mexer nele. Cada destino responde pelo proprio nome.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.icon),
    ["inicio", "cards", "banco", "mapa", "mais"],
  );
  assert.equal(getStudentRoute("/inicio")?.intent, "inicio");
  assert.equal(getStudentRoute("/hoje")?.intent, "inicio");
  assert.equal(getStudentRoute("/cards")?.intent, "cards");
  assert.equal(getStudentRoute("/mapa")?.intent, "mapa");
  assert.equal(getStudentRoute("/evolucao")?.intent, "mais");
  assert.equal(getStudentRoute("/conta")?.intent, "mais");
  assert.equal(getStudentRoute("/preferencias")?.intent, "mais");
});

test("o DESKTOP mostra oito destinos, e o 'Mais' fica sempre por ultimo", () => {
  // A barra do telemovel tem cinco; a rail do desktop tem oito. E' a primeira
  // vez que as duas larguras divergem, e a razao e' de ESPACO, nao de
  // taxonomia: no telemovel sao cinco pesos e ~78px por aba; no desktop e' uma
  // coluna que rola.
  assert.deepEqual(
    NAV_ITEMS_DESKTOP.map((item) => item.href),
    ["/inicio", "/cards", "/banco", "/mapa", "/evolucao", "/cronograma", "/preferencias", "/mais"],
  );
  assert.deepEqual(
    NAV_ITEMS_DESKTOP.map((item) => item.shortLabel),
    ["Início", "Cards", "Banco", "Mapa", "Evolução", "Calendário", "Rotina", "Mais"],
  );
  // O "Mais" e' a gaveta. Gaveta no meio da lista deixa de se ler como gaveta.
  assert.equal(NAV_ITEMS_DESKTOP.at(-1)?.href, "/mais");
});

test("🚨 no desktop, um destino promovido acende UMA aba -- nunca duas", () => {
  // ESTE E' O PONTO DELICADO DA PROMOCAO. `isNavItemActive` casa por PREFIXO
  // sobre `groupPaths`. Os tres promovidos continuam a ser caminhos legados do
  // "Mais" (e tem de continuar: no telemovel e' por la' que se chega), entao
  // sem os subtrair do item "Mais" DO DESKTOP eles acendiam os dois ao mesmo
  // tempo.
  for (const caminho of [
    "/evolucao",
    "/estatisticas",
    "/cronograma",
    "/cronograma/mes",
    "/preferencias",
  ]) {
    const acesas = NAV_ITEMS_DESKTOP.filter((item) => isNavItemActive(caminho, item));
    assert.equal(
      acesas.length,
      1,
      `${caminho} deveria acender UMA aba no desktop, acendeu ${acesas.length}` +
        ` (${acesas.map((a) => a.href).join(", ")})`,
    );
  }
});

test("no desktop, o promovido acende O PROMOVIDO -- e no telemovel, o 'Mais'", () => {
  // Nao basta ser UMA: tem de ser a certa. Um bug que acendesse so' o "Mais"
  // no desktop passaria na prova de contagem acima.
  const doDesktop = (caminho) =>
    NAV_ITEMS_DESKTOP.find((item) => isNavItemActive(caminho, item))?.href ?? null;
  assert.equal(doDesktop("/evolucao"), "/evolucao");
  assert.equal(doDesktop("/estatisticas"), "/evolucao");
  assert.equal(doDesktop("/cronograma/mes"), "/cronograma");
  assert.equal(doDesktop("/preferencias"), "/preferencias");
  // O "Mais" do desktop continua a acender no que NAO foi promovido.
  assert.equal(doDesktop("/conta"), "/mais");
  assert.equal(doDesktop("/plano"), "/mais");
  assert.equal(doDesktop("/voce"), "/mais");

  // ⚠️ E no telemovel nada mudou: os promovidos continuam a acender o "Mais",
  // porque la' eles nao sao itens. Sem esta metade, promover no desktop podia
  // ter apagado a aba acesa no telemovel sem ninguem ver.
  for (const caminho of ["/evolucao", "/estatisticas", "/cronograma/mes", "/preferencias"]) {
    const acesas = NAV_ITEMS.filter((item) => isNavItemActive(caminho, item));
    assert.equal(acesas.length, 1, `${caminho} no telemovel`);
    assert.equal(acesas[0].href, "/mais");
  }
});

test("todo item do desktop tem icone declarado", () => {
  // `ICON_MAP` e' um `Record` exaustivo em `navIcons.tsx`, entao destino sem
  // icone e' erro de compilacao la'. Aqui garante-se o outro lado: que o item
  // TRAZ a chave, e nao `undefined` — que compilaria e renderizaria nada.
  for (const item of NAV_ITEMS_DESKTOP) {
    assert.equal(typeof item.icon, "string", `${item.href} sem icone`);
    assert.ok(item.icon.length > 0, `${item.href} com icone vazio`);
  }
  assert.deepEqual(NAV_ITEMS_DESKTOP.map((i) => i.icon), [
    "inicio", "cards", "banco", "mapa", "evolucao", "calendario", "rotina", "mais",
  ]);
});
