import assert from "node:assert/strict";
import test from "node:test";

import {
  excecoesDaSemana,
  horasPorExtenso,
  minutosPorExtenso,
  resumoDaSemana,
  semanaPadrao,
} from "../../src/lib/rotina.ts";

const HOJE = "2026-09-02"; // quarta-feira

function rotina(weekday, horas, label = "__WORK__:Plantao") {
  return {
    event_id: `r${weekday}-${horas}`,
    user_id: "u",
    label,
    event_type: "routine",
    weekday,
    event_date: null,
    active_until: null,
    duration_hours: horas,
    created_at: `${HOJE}T00:00:00Z`,
  };
}

function pontual(dataISO, horas, label = "__WORK__:Troca") {
  return {
    event_id: `p${dataISO}`,
    user_id: "u",
    label,
    event_type: "event",
    weekday: null,
    event_date: dataISO,
    active_until: null,
    duration_hours: horas,
    created_at: `${HOJE}T00:00:00Z`,
  };
}

test("plantao de 24h faz o dia seguinte virar pos-plantao", () => {
  // Segunda com 24h => terca e' pos-plantao, mesmo sem evento nenhum nela.
  const linhas = semanaPadrao([rotina(0, 24)], {}, HOJE);
  assert.equal(linhas[0].tipo, "plantao");
  assert.equal(linhas[0].rotulo, "Plantão 24h");
  assert.equal(linhas[1].tipo, "pos_plantao");
  assert.equal(linhas[1].rotulo, "Pós-plantão");
  // Quarta ja' nao e': o efeito dura um dia.
  assert.equal(linhas[2].tipo, "livre");
});

test("o pos-plantao atravessa a virada da semana", () => {
  // Domingo (6) com 24h => segunda (0) e' pos-plantao. Sem a aritmetica
  // circular, o primeiro dia da lista nunca herdaria nada.
  const linhas = semanaPadrao([rotina(6, 24)], {}, HOJE);
  assert.equal(linhas[0].tipo, "pos_plantao");
});

test("plantao curto NAO produz pos-plantao", () => {
  // 12h e' plantao (>= 10) mas nao e' plantao LONGO (>= 20), e o motor so'
  // trata como recuperacao o dia seguinte ao longo.
  const linhas = semanaPadrao([rotina(0, 12)], {}, HOJE);
  assert.equal(linhas[0].rotulo, "Plantão 12h");
  assert.equal(linhas[1].tipo, "livre");
});

test("trabalho comum mantem o nome que o aluno escreveu", () => {
  const linhas = semanaPadrao([rotina(3, 6, "__WORK__:Ambulatório")], {}, HOJE);
  assert.equal(linhas[3].tipo, "trabalho");
  assert.equal(linhas[3].rotulo, "Ambulatório");
});

test("dia nunca declarado e' null, e nao zero", () => {
  // A distincao decide a frase da tela: "nada" e' escolha do aluno, "—" e'
  // ausencia de resposta. Trata-las igual fazia todo dia parecer descanso.
  const linhas = semanaPadrao([], { 0: 10 }, HOJE);
  assert.equal(linhas[0].minutos, 10);
  assert.equal(linhas[1].minutos, null);
  assert.equal(minutosPorExtenso(linhas[1].minutos), "—");
  assert.equal(minutosPorExtenso(0), "nada");
});

test("minutos por extenso nunca imprime 0 min", () => {
  assert.equal(minutosPorExtenso(10), "10 min");
  assert.equal(minutosPorExtenso(60), "1 h");
  assert.equal(minutosPorExtenso(90), "1 h 30");
});

test("o resumo da semana soma e converte pela taxa recebida", () => {
  const linhas = semanaPadrao([], { 0: 10, 1: 20, 2: 60, 3: 35, 4: 0, 5: 60, 6: 35 }, HOJE);
  const resumo = resumoDaSemana(linhas, 2);
  assert.equal(resumo.minutosTotais, 220);
  assert.equal(resumo.questoes, 110);
  assert.equal(resumo.diasComEstudo, 6);
  assert.equal(resumo.vazia, false);
  assert.equal(horasPorExtenso(260), "4h20");
  assert.equal(horasPorExtenso(120), "2h");
});

test("semana sem nenhuma declaracao e' 'vazia', nao 'zero'", () => {
  const resumo = resumoDaSemana(semanaPadrao([], {}, HOJE), 2);
  assert.equal(resumo.vazia, true);
  assert.equal(resumo.minutosTotais, 0);
});

test("excecoes so' cobrem os proximos sete dias", () => {
  const eventos = [
    pontual("2026-09-01", 24), // ontem
    pontual("2026-09-05", 24), // dentro
    pontual("2026-09-20", 24), // longe
  ];
  const dentro = excecoesDaSemana(eventos, HOJE);
  assert.equal(dentro.length, 1);
  assert.equal(dentro[0].event_date, "2026-09-05");
});
