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

test("Cronograma coloca o calendario mensal antes dos paineis auxiliares", () => {
  const source = read("src/app/cronograma/CronogramaClientPage.tsx");

  assert.equal(
    source.includes("<StudentPrimaryAction"),
    false,
    "calendario nao deve renderizar CTA redundante do proprio plano",
  );
  assertComesBefore(
    source,
    "<CronogramaCalendarView",
    "<CronogramaStreakCard",
    "o calendario deve aparecer antes do streak",
  );
  assertComesBefore(
    source,
    "<CronogramaCalendarView",
    "<CronogramaTodayPanel",
    "o calendario deve aparecer antes do painel do dia",
  );
  assert.match(source, /aria-label="Calendário mensal"/);
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

test("Hoje mantem uma acao dominante e no maximo duas alternativas", () => {
  const page = read("src/app/hoje/page.tsx");
  const backupActions = read("src/app/hoje/_components/TodayBackupActions.tsx");

  assertComesBefore(
    page,
    "<TodayPrimaryAction",
    "<TodayBackupActions",
    "a acao protagonista deve preceder as alternativas",
  );
  assert.match(backupActions, /actions\.slice\(0,\s*2\)/);
});
