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
  assert.equal(resolveDisplayArea("OU", "Cardiologia - insuficiencia cardiaca"), "CM");
  assert.equal(resolveDisplayArea("OU", "Pediatria neonatal"), "PD");
  assert.equal(resolveDisplayArea("OU", "Epidemiologia e SUS"), "MP");
  assert.equal(resolveDisplayArea("OU", "Ginecologia - sangramento uterino"), "GO");
  assert.equal(resolveDisplayArea("OU", "Obstetricia - pre-natal"), "OB");
});

test("preserva Outras quando nao ha codigo nem tema reconhecivel", () => {
  assert.equal(resolveDisplayArea("OU", "Tema inespecifico"), "OU");
  assert.equal(displayAreaLabel("OU", "Tema inespecifico"), "Outras");
});
