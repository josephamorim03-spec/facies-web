import assert from "node:assert/strict";
import { test } from "node:test";

import { displayAreaLabel, resolveDisplayArea } from "../../src/lib/areaDisplay.ts";

test("normaliza codigos validos de area antes de cair em Outras", () => {
  assert.equal(resolveDisplayArea(" cg "), "CG");
  assert.equal(resolveDisplayArea("cm"), "CM");
  assert.equal(resolveDisplayArea("pd"), "PD");
  assert.equal(resolveDisplayArea("mp"), "MP");
  assert.equal(resolveDisplayArea("go"), "GO");
  assert.equal(resolveDisplayArea("ob"), "OB");
});

test("infere a area pelo tema quando o backend manda OU ou valor invalido", () => {
  assert.equal(resolveDisplayArea("OU", "CG - Abdome agudo"), "CG");
  assert.equal(resolveDisplayArea("OU", "Continuar Avaliacao Pre-Operatoria"), "CG");
  assert.equal(resolveDisplayArea("OU", "Avaliação Pré-Operatória"), "CG");
  assert.equal(resolveDisplayArea("OU", "Pós-operatório de colecistectomia"), "CG");
  assert.equal(resolveDisplayArea("OU", "Laparotomia e obstrucao intestinal"), "CG");
  assert.equal(resolveDisplayArea("OU", "Cardiologia - insuficiencia cardiaca"), "CM");
  assert.equal(resolveDisplayArea("OU", "Medicina interna - pneumonia"), "CM");
  assert.equal(resolveDisplayArea("OU", "Pediatria neonatal"), "PD");
  assert.equal(resolveDisplayArea("OU", "Lactente em puericultura"), "PD");
  assert.equal(resolveDisplayArea("OU", "Epidemiologia e SUS"), "MP");
  assert.equal(resolveDisplayArea("OU", "Medicina de familia e vigilancia epidemiologica"), "MP");
  assert.equal(resolveDisplayArea("OU", "Ginecologia - sangramento uterino"), "GO");
  assert.equal(resolveDisplayArea("OU", "Obstetricia - pre-natal"), "OB");
});

test("flexao de genero e numero em pt-BR nao derruba a inferencia", () => {
  // Estes casos caiam TODOS em "Outras". A causa era `\b` fechando um prefixo:
  // `\bcirurgic\b` so casa a palavra "cirurgic", que nao existe em portugues.
  // A suite antiga passava porque so exercitava as formas que casavam
  // ("Cardiologia", "Pediatria neonatal"), nunca as flexionadas.
  assert.equal(resolveDisplayArea("OU", "Clínica Cirúrgica"), "CG");
  assert.equal(resolveDisplayArea("OU", "Abordagem cirurgica do trauma"), "CG");
  assert.equal(resolveDisplayArea("OU", "Gastroenterologia"), "CM");
  assert.equal(resolveDisplayArea("OU", "Nefrologia - injuria renal aguda"), "CM");
  assert.equal(resolveDisplayArea("OU", "Endocrinologia"), "CM");
  assert.equal(resolveDisplayArea("OU", "Reumatologia"), "CM");
  assert.equal(resolveDisplayArea("OU", "Infectologia"), "CM");
  assert.equal(resolveDisplayArea("OU", "Dermatologia"), "CM");
  assert.equal(resolveDisplayArea("OU", "Emergência pediátrica"), "PD");
  assert.equal(resolveDisplayArea("OU", "Semiologia ginecológica"), "GO");
});

test("o desempate impede o sufixo aberto de chutar area errada", () => {
  // O sufixo aberto AMPLIA o que casa: "gastrosquise" (defeito de parede
  // abdominal do neonato) passa a acionar CM por causa de `gastro\w*`. Quem
  // impede a resposta errada nao e o padrao — e o desempate, que ve CM e PD
  // competindo e devolve OU em vez de chutar. Este teste trava esse par: se
  // alguem afrouxar o desempate, "Outros" vira "Clinica Medica".
  assert.equal(resolveDisplayArea("OU", "Tema inespecifico"), "OU");
  assert.equal(resolveDisplayArea("OU", "Gastrosquise no recem-nascido"), "OU");
});

test("sigla escrita no texto vence palavra tematica", () => {
  // "Resolver bloco clinico de GO" mostrava OU: o titulo acionava GO (a sigla) e
  // CM ("clinico"), a justificativa acionava OB ("pre-eclampsia"), e tres
  // empates viravam "Outras" — num titulo que dizia GO com todas as letras.
  // Sigla escrita a mao e sinal AUTORAL; palavra tematica e inferencia.
  assert.equal(
    resolveDisplayArea(null, "Resolver bloco clinico de GO", "Corrigir pre-eclampsia e hemorragias"),
    "GO",
  );
  assert.equal(resolveDisplayArea(null, "CM - insuficiencia cardiaca na gestante"), "CM");
});

test("a sigla nao pode casar dentro de outra palavra", () => {
  // Sem fronteira de palavra, "go" casaria em "algo"/"jogo"/"logo" e a regra
  // autoral viraria ruido — pior que o empate que ela veio resolver.
  assert.equal(resolveDisplayArea("OU", "Algo importante para logo mais"), "OU");
  assert.equal(resolveDisplayArea("OU", "Jogo rapido de revisao"), "OU");
});

test("o titulo decide antes da justificativa", () => {
  // Concatenar tudo num texto so deixava uma palavra da justificativa empatar
  // com o tema do titulo. O titulo e mais especifico por construcao.
  assert.equal(
    resolveDisplayArea(null, "Apendicite aguda", "Revise tambem cardiologia e pneumonia"),
    "CG",
  );
});

test("preserva codigo explicito valido mesmo quando o texto sugere outra area", () => {
  assert.equal(resolveDisplayArea("CM", "Avaliação Pré-Operatória"), "CM");
});

test("nao chuta area quando sinais fortes competem entre grupos diferentes", () => {
  assert.equal(resolveDisplayArea("OU", "Cardiologia e apendicite"), "OU");
});

test("preserva Outras quando nao ha codigo nem tema reconhecivel", () => {
  assert.equal(resolveDisplayArea("OU", "Tema inespecifico"), "OU");
  assert.equal(displayAreaLabel("OU", "Tema inespecifico"), "Outras");
});
