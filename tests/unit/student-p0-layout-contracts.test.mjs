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

  assert.notEqual(firstIndex, -1, `${firstNeedle} não encontrado`);
  assert.notEqual(secondIndex, -1, `${secondNeedle} não encontrado`);
  assert.ok(firstIndex < secondIndex, message);
}

test("Cronograma coloca o calendário mensal antes dos painéis auxiliares", () => {
  const source = read("src/app/cronograma/CronogramaClientPage.tsx");

  assertComesBefore(
    source,
    "<CronogramaCalendarView",
    "<StudentPrimaryAction",
    "o calendário deve aparecer antes da ação/carga do plano",
  );
  assertComesBefore(
    source,
    "<CronogramaCalendarView",
    "<CronogramaStreakCard",
    "o calendário deve aparecer antes do streak",
  );
  assertComesBefore(
    source,
    "<CronogramaCalendarView",
    "<CronogramaTodayPanel",
    "o calendário deve aparecer antes do painel do dia",
  );
  assert.match(source, /aria-label="Calendário mensal"/);
});

test("Acompanhar começa por gráficos antes de interpretação textual", () => {
  const source = read("src/app/estatisticas/EstatisticasClientPage.tsx");
  const graphUses = source.match(/<GraficosSection \/>/g) ?? [];

  assert.equal(graphUses.length, 1, "a tela deve renderizar a seção de gráficos uma única vez");
  assertComesBefore(
    source,
    "<GraficosSection />",
    "<StudentSurfaceInsight",
    "os gráficos devem vir antes do insight textual",
  );
  assertComesBefore(
    source,
    "<GraficosSection />",
    "<StudentPrimaryAction",
    "os gráficos devem vir antes da ação recomendada textual",
  );
  assertComesBefore(
    source,
    "<GraficosSection />",
    "<DesempenhoTab",
    "os gráficos devem abrir a tela antes da grade detalhada",
  );
});

test("Hoje mantém uma ação dominante e no máximo duas alternativas", () => {
  const page = read("src/app/hoje/page.tsx");
  const backupActions = read("src/app/hoje/_components/TodayBackupActions.tsx");

  assertComesBefore(
    page,
    "<TodayPrimaryAction",
    "<TodayBackupActions",
    "a ação protagonista deve preceder as alternativas",
  );
  assert.match(backupActions, /actions\.slice\(0,\s*2\)/);
});
