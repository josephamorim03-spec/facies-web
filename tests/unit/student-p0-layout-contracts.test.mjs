import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function assertComesBefore(source, firstNeedle, secondNeedle, message) {
  const firstIndex = source.indexOf(firstNeedle);
  const secondIndex = source.indexOf(secondNeedle);

  assert.notEqual(firstIndex, -1, `${firstNeedle} nao encontrado`);
  assert.notEqual(secondIndex, -1, `${secondNeedle} nao encontrado`);
  assert.ok(firstIndex < secondIndex, message);
}

test("Cronograma abre na semana e preserva o calendario mensal como modo secundario", () => {
  const page = read("src/app/cronograma/page.tsx");
  const mes = read("src/app/cronograma/mes/page.tsx");
  const source = read("src/app/cronograma/CronogramaClientPage.tsx");
  const month = read("src/app/cronograma/CronogramaMonthView.tsx");
  const week = read("src/app/cronograma/_components/CronogramaWeekView.tsx");

  assert.equal(
    source.includes("<StudentPrimaryAction"),
    false,
    "calendario nao deve renderizar CTA redundante do proprio plano",
  );
  // ⚠️ A VISAO DEIXOU DE VIR DA QUERY e passou a vir da ROTA.
  //
  // Era `initialView={view}` lido de `?view=`, e as duas leituras dividiam
  // `/cronograma`. `navConfig` casa secao por PATHNAME, entao com "Semana" e
  // "Mes" na barra as duas empatavam e a barra acendia sempre a mesma. O mes
  // ganhou `/cronograma/mes`; `?view=month` encaminha para la em
  // `next.config.js`.
  assert.match(page, /initialView="week"/);
  assert.match(mes, /initialView="month"/);
  assert.match(source, /initialView = "week"/);
  assert.match(source, /<CronogramaWeekView/);
  assert.match(source, /<CronogramaMonthView/);
  assert.match(month, /<CronogramaCalendarView/);
  // A meta semanal voltou, mas como painel auxiliar: o calendario continua
  // sendo o heroi da tela, entao ela so pode aparecer depois dele.
  assertComesBefore(
    month,
    "<CronogramaCalendarView",
    "<WeeklyGoalControl",
    "a meta semanal nao pode competir com o calendario pelo topo da tela",
  );
  assert.match(month, /aria-label="Calendário mensal"/);
  assert.match(week, /data-week-strip="true"/, "a semana deve ser uma faixa horizontal do calendario");
  assert.match(week, /grid-cols-7/, "os sete dias devem ocupar uma unica linha");
  assert.match(week, /resolveDisplayArea/, "as bolinhas da semana devem usar a area canonica");
  assert.match(week, /AREA_BG_CLASS/, "as bolinhas da semana devem reutilizar a paleta de areas");
  assert.match(week, /activityCount > 5/, "o excesso deve comecar acima de cinco atividades");
  assert.match(week, /items\.slice\(0, 4\)/, "o excesso deve reservar a quinta posicao para reticencias");
  assert.match(week, /items\.slice\(0, 5\)/, "dias sem excesso devem mostrar ate cinco bolinhas");
  assert.match(week, /data-week-day-overflow="true"/, "o excesso deve ter marcador testavel");
  assert.match(week, /data-week-detail="true"/, "o dia selecionado deve abrir detalhes abaixo da faixa");
  assert.match(week, /<CronogramaStreakCard/, "a constancia do aluno deve permanecer visivel na semana");
  assert.match(week, /<WeeklyGoalControl/, "a meta semanal deve permanecer editavel na semana");
  assert.match(week, /href="\/preferencias"/, "a semana deve levar as preferencias de meta e capacidade");
  assertComesBefore(
    week,
    'data-week-strip="true"',
    "<WeeklyGoalControl",
    "a faixa e o detalhe diario devem continuar protagonistas antes da meta auxiliar",
  );
  // ⚠️ ESTE CONTRATO AFIRMAVA UMA AUSENCIA, E A AUSENCIA VIROU UM BURACO.
  //
  // O que ele prendia: nenhuma das duas telas podia ter
  // `data-testid="schedule-view-*"`, porque a troca entre semana e mes tinha
  // migrado para a linha de secoes (`IntentSubNav`), igual nas duas larguras.
  // Era verdade — enquanto "Semana" e "Mes" fossem secoes do Plano.
  //
  // Quando o calendario virou destino do "Mais", `CHILDREN.mais` ficou vazio e
  // `getIntentChildren("/cronograma")` passou a devolver lista vazia: a linha
  // NAO desenha nada nestas duas rotas. O guard continuou verde, porque medir
  // ausencia nunca ve o que sumiu do outro lado — e o aluno ficou sem troca
  // nenhuma, em largura nenhuma.
  //
  // O contrato agora e' POSITIVO, que e' o unico que nao pode ser satisfeito
  // por remocao: cada tela leva ao OUTRO lado, pelo mesmo componente.
  assert.match(week, /<AlternarVista para="month"/, "a semana deve levar ao mes");
  assert.match(month, /<AlternarVista para="week"/, "o mes deve levar a semana");
  // ⚠️ E o botao e' UM SO'. A queixa que matou a versao anterior era tres
  // desenhos para a mesma troca, cada um numa largura — entao a marcacao de
  // teste tem de nascer no componente partilhado, e nao copiada em cada tela.
  const alternador = read("src/app/cronograma/_components/AlternarVista.tsx");
  for (const marca of ["schedule-view-month", "schedule-view-week"]) {
    assert.equal(
      alternador.includes(marca),
      true,
      `a marcacao ${marca} deve vir do componente partilhado`,
    );
  }
  for (const [nome, fonte] of [["a semana", week], ["o mes", month]]) {
    assert.equal(
      /data-testid="schedule-view-(week|month)"/.test(fonte),
      false,
      `${nome} nao deve desenhar um segundo botao de troca por fora do partilhado`,
    );
  }
  // ⚠️ CASA O USO, e nao a PALAVRA: o proprio arquivo explica em comentario
  // porque o `ScheduleViewTabs` saiu, e um `includes("ScheduleViewTabs")`
  // reprovava pela explicacao. Guard que le prosa mede a prosa.
  assert.equal(
    /<ScheduleViewTabs/.test(source),
    false,
    "a troca de visao nao volta para dentro do conteudo",
  );
});

// Le `/evolucao`, que e a tela do Acompanhar que o aluno realmente ve.
// Antes lia `estatisticas/EstatisticasClientPage.tsx`, uma pagina sem `page.tsx`
// e com 308 na raiz: o contrato era verificado sobre uma tela inalcancavel
// enquanto a viva passava sem guarda nenhuma.
//
// As duas asserções de ORDEM sairam por nao terem contraparte aqui:
// `<StudentSurfaceInsight>` e `<DesempenhoTab>` nao existem em `/evolucao`, que
// organiza o conteudo em abas em vez de secoes empilhadas. Afirmar ordem entre
// componentes ausentes passaria por vacuidade, que e' pior que nao afirmar.
test("Evolucao nao concorre com a acao do dia", () => {
  // Era "renderiza graficos uma vez": a tela tinha uma `<GraficosSection />` e o
  // contrato garantia que ela nao aparecesse duas vezes nem dividisse espaco com
  // um CTA. Os graficos SAIRAM -- a Evolucao virou os sete cartoes-pergunta do
  // artboard `9b`, e nenhum deles e um grafico de painel.
  //
  // O que o contrato protegia continua valendo, e e a parte que sobrevive: esta
  // tela e de CONSULTA. Quem decide o que fazer agora e o Hoje, e duas telas
  // disputando a acao dominante foi o defeito que este teste nasceu para pegar.
  const source =
    read("src/app/evolucao/page.tsx") + read("src/app/evolucao/EvolucaoClientPage.tsx");

  // ⚠️ ESTE CONTRATO AFIRMAVA UM PROXY, E O PROXY MORREU.
  //
  // Ele nomeava dois componentes -- `StudentPrimaryAction` e o strip do
  // treinador. O segundo foi apagado em 2026-09-06 por nunca ter sido montado,
  // e o primeiro nao existe nesta tela: as duas assercoes passavam por
  // VACUIDADE, e teriam continuado a passar se alguem enchesse a Evolucao de
  // botoes primarios com outro nome.
  //
  // A regra de verdade e sobre PESO VISUAL: quem decide o que fazer agora e o
  // Hoje, e duas telas a disputar a acao dominante foi o defeito que este teste
  // nasceu para pegar. Entao ele passou a medir isso -- nenhum preenchimento
  // primario na Evolucao.
  //
  // Isto e o que deixou as linhas de "Onde mais escapa?" praticarem o assunto
  // que nomeiam sem quebrar o contrato: elas sao links do peso que ja tinham.
  assert.equal(
    source.includes("<StudentPrimaryAction"),
    false,
    "Evolucao nao deve renderizar CTA primario concorrendo com a leitura",
  );
  // ⚠️ POR LINHA, e nao por string adjacente. A primeira versao procurava o
  // literal "bg-primary text-primaryInk" -- e eu provei que era inerte
  // injetando `bg-primary py-2 text-primaryInk`, que passa incolume. O que
  // define o preenchimento e a COOCORRENCIA das duas classes no mesmo
  // `className`, em qualquer ordem.
  //
  // `bg-primary` sozinho fica de fora de proposito: ele pinta as barras e o
  // mosaico desta tela, que sao marca grafica e nao convite.
  for (const linha of source.split("\n")) {
    const preenchido = linha.includes("bg-primary") && linha.includes("text-primaryInk");
    assert.equal(
      preenchido,
      false,
      `Evolucao nao deve ter preenchimento primario -- ele compete com a acao do Hoje: ${linha.trim()}`,
    );
  }
  assert.equal(
    source.includes('variant="primary"'),
    false,
    "Evolucao nao deve usar o Button primario",
  );
});

test("Hoje mantem uma acao dominante, uma lista unica e no maximo duas alternativas", () => {
  const page = read("src/app/hoje/_components/CanonicalTodayDashboard.tsx");
  const backupActions = read("src/app/hoje/_components/TodayBackupActions.tsx");

  assertComesBefore(
    page,
    "<TodayPrimaryAction",
    'aria-labelledby="today-after-title"',
    "a acao protagonista deve preceder a lista restante",
  );
  assertComesBefore(
    page,
    'aria-labelledby="today-after-title"',
    "<TodayBackupActions",
    "as alternativas devem permanecer em detalhe progressivo depois da agenda do dia",
  );
  assert.match(page, /uniqueAgendaItems\(/);
  assert.match(backupActions, /actions\.slice\(0,\s*2\)/);
});
