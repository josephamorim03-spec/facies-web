import assert from "node:assert/strict";
import test from "node:test";

import {
  PISO_DE_DIAGNOSTICO,
  ordenarBlocos,
  vozDaSequencia,
} from "../../src/app/inicio/_lib/ordem.ts";

/**
 * A ORDEM DO INÍCIO É UMA DECISÃO, e decisão sem prova é opinião que muda
 * sozinha.
 *
 * O operador escolheu "o sistema decide sozinho" — o que significa que o aluno
 * não tem como corrigir uma ordem errada. Numa tela assim, a regra precisa de
 * estar escrita num sítio que reprova quando alguém a muda sem querer.
 */

/** O estado mais vazio possível: aluno novo, nada medido. */
function alunoNovo(sobrescreve = {}) {
  return {
    sessaoAberta: false,
    temAcaoDoDia: false,
    sequenciaDias: 0,
    sequenciaEmRisco: false,
    diaProtegido: false,
    assuntosQuentes: 0,
    questoesRespondidas: 0,
    ...sobrescreve,
  };
}

test("aluno novo não vê bloco nenhum — e isso é o desenho, não um defeito", () => {
  // ⚠️ A alternativa seria cinco esqueletos a dizer "sem base para medir", que
  // é o que uma tela de painel costuma fazer. O Início é "o que importa agora";
  // nada importa agora quando ainda não há nada.
  assert.deepEqual(ordenarBlocos(alunoNovo()), []);
});

test("sessão aberta vem antes de tudo, inclusive da sequência em risco", () => {
  // Não se abre frente nova com uma aberta. É a mesma regra que faz o
  // `TodayPrimaryAction` ceder a primária quando há sessão a retomar.
  const ordem = ordenarBlocos(
    alunoNovo({
      sessaoAberta: true,
      temAcaoDoDia: true,
      sequenciaDias: 12,
      sequenciaEmRisco: true,
    }),
  );
  assert.equal(ordem[0], "continuar");
  assert.equal(ordem[1], "sequencia");
  assert.equal(ordem[2], "acaoDoDia");
});

test("sequência em risco sobe acima da ação do dia — é o único bloco com prazo", () => {
  const ordem = ordenarBlocos(
    alunoNovo({ temAcaoDoDia: true, sequenciaDias: 5, sequenciaEmRisco: true }),
  );
  assert.deepEqual(ordem, ["sequencia", "acaoDoDia"]);
});

test("sem risco, a sequência desce para depois do trabalho", () => {
  const ordem = ordenarBlocos(alunoNovo({ temAcaoDoDia: true, sequenciaDias: 5 }));
  assert.deepEqual(ordem, ["acaoDoDia", "sequencia"]);
});

test("dia protegido tira a URGÊNCIA da sequência, mas não o bloco", () => {
  // ⚠️ Esta é a prova da escolha do operador: "não quebrar em dia de plantão,
  // mas ficar claro isso no front". Um bloco que sumisse no dia protegido
  // ensinaria que a proteção não existe.
  const ordem = ordenarBlocos(
    alunoNovo({
      temAcaoDoDia: true,
      sequenciaDias: 5,
      sequenciaEmRisco: true,
      diaProtegido: true,
    }),
  );
  assert.deepEqual(ordem, ["acaoDoDia", "sequencia"]);
});

test("sequência zero não aparece — mostrar '0 dias' a quem começou ontem é castigo", () => {
  const ordem = ordenarBlocos(
    alunoNovo({ temAcaoDoDia: true, sequenciaDias: 0, sequenciaEmRisco: true }),
  );
  assert.deepEqual(ordem, ["acaoDoDia"]);
});

test("a evolução só entra a partir do piso de diagnóstico, e o piso é o DA evolução", () => {
  // ⚠️ Importado de `evolucao/_lib/leitura`, não copiado: dois pisos diferentes
  // dariam duas respostas para "já dá para medir?" na mesma sessão.
  assert.equal(typeof PISO_DE_DIAGNOSTICO, "number");
  assert.ok(PISO_DE_DIAGNOSTICO > 0);

  const abaixo = ordenarBlocos(alunoNovo({ questoesRespondidas: PISO_DE_DIAGNOSTICO - 1 }));
  assert.deepEqual(abaixo, []);

  const noPiso = ordenarBlocos(alunoNovo({ questoesRespondidas: PISO_DE_DIAGNOSTICO }));
  assert.deepEqual(noPiso, ["evolucao"]);
});

test("os assuntos quentes só entram quando há assunto quente", () => {
  assert.deepEqual(ordenarBlocos(alunoNovo({ assuntosQuentes: 0 })), []);
  assert.deepEqual(ordenarBlocos(alunoNovo({ assuntosQuentes: 3 })), ["quentes"]);
});

test("a ordem completa, com tudo ligado, é continuar › sequência › dia › quentes › evolução", () => {
  const ordem = ordenarBlocos({
    sessaoAberta: true,
    temAcaoDoDia: true,
    sequenciaDias: 30,
    sequenciaEmRisco: true,
    diaProtegido: false,
    assuntosQuentes: 4,
    questoesRespondidas: 900,
  });
  assert.deepEqual(ordem, ["continuar", "sequencia", "acaoDoDia", "quentes", "evolucao"]);
});

test("nenhum bloco aparece duas vezes, em nenhuma combinação", () => {
  // A sequência é empurrada por dois ramos diferentes (urgente e não urgente),
  // e um `if` mal escrito poria os dois. Varre as 32 combinações booleanas.
  for (let mascara = 0; mascara < 32; mascara += 1) {
    const estado = {
      sessaoAberta: Boolean(mascara & 1),
      temAcaoDoDia: Boolean(mascara & 2),
      sequenciaDias: mascara & 4 ? 7 : 0,
      sequenciaEmRisco: Boolean(mascara & 8),
      diaProtegido: Boolean(mascara & 16),
      assuntosQuentes: 2,
      questoesRespondidas: 500,
    };
    const ordem = ordenarBlocos(estado);
    assert.equal(
      new Set(ordem).size,
      ordem.length,
      `bloco repetido com máscara ${mascara}: ${ordem.join(", ")}`,
    );
  }
});

test("a voz da sequência diz a proteção, e diz as duas metades", () => {
  const protegida = vozDaSequencia({
    diaProtegido: true,
    sequenciaEmRisco: true,
    diasProtegidosNaSemana: 1,
  });
  assert.equal(protegida.estado, "protegida");
  // As duas metades: que hoje está protegido, e que a sequência não cai. Só a
  // primeira soaria a desculpa; só a segunda, a erro de contagem.
  assert.match(protegida.frase, /protegido/i);
  assert.match(protegida.frase, /não cai/i);
});

test("o risco é dito com o prazo, porque o prazo é o que faz o bloco existir", () => {
  const risco = vozDaSequencia({
    diaProtegido: false,
    sequenciaEmRisco: true,
    diasProtegidosNaSemana: 0,
  });
  assert.equal(risco.estado, "em-risco");
  assert.match(risco.frase, /meia-noite/i);
});

test("com plantão na semana, a frase firme contabiliza os dias que não contaram contra", () => {
  const um = vozDaSequencia({
    diaProtegido: false,
    sequenciaEmRisco: false,
    diasProtegidosNaSemana: 1,
  });
  assert.equal(um.estado, "firme");
  assert.match(um.frase, /1 dia protegido/);

  const dois = vozDaSequencia({
    diaProtegido: false,
    sequenciaEmRisco: false,
    diasProtegidosNaSemana: 2,
  });
  // ⚠️ Plural: "2 dia protegido" é o defeito mais barato de produzir e o mais
  // caro de notar, porque só aparece com dado real.
  assert.match(dois.frase, /2 dias protegidos/);
});
