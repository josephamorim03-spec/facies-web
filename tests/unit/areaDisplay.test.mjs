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
