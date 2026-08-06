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
  const source = read("src/app/cronograma/CronogramaClientPage.tsx");
  const month = read("src/app/cronograma/CronogramaMonthView.tsx");
  const week = read("src/app/cronograma/_components/CronogramaWeekView.tsx");
  const viewTabs = read("src/app/cronograma/_components/ScheduleViewTabs.tsx");

  assert.equal(
    source.includes("<StudentPrimaryAction"),
    false,
    "calendario nao deve renderizar CTA redundante do proprio plano",
  );
  assert.match(page, /initialView=\{view\}/);
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
  assert.match(viewTabs, /TAB_LIST_CLASS/);
  assert.match(viewTabs, /TAB_TRIGGER_CLASS/);
});

test("Acompanhar comeca por graficos e nao duplica CTA dominante", () => {
  const source = read("src/app/estatisticas/EstatisticasClientPage.tsx");
  const graphUses = source.match(/<GraficosSection \/>/g) ?? [];

  assert.equal(graphUses.length, 1, "a tela deve renderizar a secao de graficos uma unica vez");
  assertComesBefore(
    source,
    "<GraficosSection />",
    "<StudentSurfaceInsight",
    "os graficos devem vir antes do insight textual",
  );
  assert.equal(
    source.includes("<StudentPrimaryAction"),
    false,
    "Acompanhar nao deve renderizar CTA primario concorrendo com os graficos",
  );
  assert.equal(
    source.includes("<TrainerContextStrip"),
    false,
    "Acompanhar nao deve duplicar a acao do dia",
  );
  assertComesBefore(
    source,
    "<GraficosSection />",
    "<DesempenhoTab",
    "os graficos devem abrir a tela antes da grade detalhada",
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
