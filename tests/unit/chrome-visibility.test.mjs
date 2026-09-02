import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { rotaEhPublica } from "../../src/lib/rotasPublicas.ts";

/**
 * Onde o chrome do app não aparece — e por que isso mora em UM lugar.
 *
 * A regra existia duas vezes e as duas cópias divergiram: o `AppShell` conhecia
 * as superfícies públicas da Fácies, o `Nav` não. Como a `SidebarNav` consultava
 * a segunda, quem abria `/prova/enamed` pelo link do grupo via a barra lateral
 * do app autenticado do lado.
 *
 * O que torna o caso instrutivo: **alguém já tinha consertado no `AppShell`**,
 * com um comentário descrevendo exatamente o sintoma. O defeito sobreviveu ao
 * conserto porque a segunda cópia não estava à vista. Um teste que só checasse
 * "a lista contém /facies" teria passado o tempo todo.
 */
const RAIZ = fileURLToPath(new URL("../../src", import.meta.url));
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");

test("a regra do chrome cobre as superficies publicas", () => {
  const regra = ler("lib/chromeVisibility.ts");
  for (const rota of ["/", "/login", "/auth", "/facies", "/prova", "/banco/sessao"]) {
    assert.ok(
      regra.includes(`"${rota}"`),
      `deveEsconderChrome nao cobre ${rota} — o funil publico veria a barra do app`,
    );
  }
});

test("existe UMA regra, e os dois consumidores a importam", () => {
  // A asserção que importa é a negativa: nenhuma cópia local. Sem ela, alguém
  // reintroduz a lista no componente "só para não importar" e o defeito volta
  // exatamente do mesmo jeito.
  for (const rel of ["components/AppShell.tsx", "components/Nav.tsx"]) {
    const fonte = ler(rel);
    assert.match(
      fonte,
      /import \{ deveEsconderChrome \} from "@\/lib\/chromeVisibility"/,
      `${rel} nao importa a regra`,
    );
    assert.doesNotMatch(
      fonte,
      /function (shouldHideNavigationChrome|useNavHideCompletely)/,
      `${rel} voltou a ter copia local da regra`,
    );
    // `startsWith("/facies")` escrito no componente é o sinal de que a lista foi
    // copiada de volta, com ou sem nome de função.
    assert.doesNotMatch(
      fonte,
      /pathname\.startsWith\("\/facies"\)/,
      `${rel} tem a lista inline`,
    );
  }
});

test("o proxy e o chrome tratam a colisao /prova x /provas de forma DIFERENTE", () => {
  // No guard de borda o prefixo termina em barra: sem ela, "/provas" (rota
  // autenticada) casaria "/prova" e passaria pelo gate. Ali a colisão é furo de
  // autenticação.
  //
  // A asserção passou a EXECUTAR a regra em vez de casar regex no fonte do
  // `proxy.ts`: a lista mora em `lib/rotasPublicas.ts`, que não importa
  // `next/server` e por isso pode ser importada aqui. Ler o fonte verificava a
  // posição do código, não o efeito — e quebrava em refatoração sem nada ter
  // mudado de comportamento. A bateria completa está em
  // `proxy-public-routes.test.mjs`.
  assert.equal(rotaEhPublica("/prova/enamed"), true, "/prova/[slug] e publica");
  assert.equal(rotaEhPublica("/provas"), false, "/provas exige sessao");

  // No chrome a colisão é inofensiva e até desejável — `/provas` só redireciona,
  // e esconder a barra evita uma piscada antes do salto. Os dois arquivos
  // divergem de propósito, e o comentário registra isso.
  const regra = ler("lib/chromeVisibility.ts");
  assert.match(regra, /startsWith\("\/prova"\)/);
  assert.match(regra, /provas/, "a divergencia com o proxy precisa estar explicada");
});
