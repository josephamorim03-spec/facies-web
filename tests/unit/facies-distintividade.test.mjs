import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  cohenH,
  diferencaEhReal,
  proporcaoDistintiva,
  H_MINIMO,
  BASE_MINIMA,
  decidirExibicao,
} from "../../src/lib/distintividade.ts";

/**
 * A pagina exibia a distribuicao de formato inteira, sem criterio nenhum. O
 * aluno lia "correlacionar colunas 0% -0" — 5 questoes em 1.486 — ocupando a
 * mesma linha visual de um achado real.
 *
 * O criterio tem DUAS metades e cada teste abaixo trava uma. Se algum passar com
 * a regra removida, ele nao esta medindo nada.
 *
 * O dataset e' lido por caminho relativo de proposito: `node --test` nao resolve
 * o alias `@/`, e prender o teste ao alias custaria a cobertura contra o acervo
 * real — que e' justamente onde os casos interessantes moram.
 */

const DATASET = JSON.parse(
  readFileSync(new URL("../../src/data/facies/facies.json", import.meta.url), "utf8"),
);
const NACIONAL = DATASET.nacional.formato_pct;

function distintivos(banca) {
  return banca.formato.distribuicao
    .filter(
      (l) =>
        l.codigo !== "direta" &&
        proporcaoDistintiva(l.qtd, banca.questoes_total, l.pct, NACIONAL[l.codigo] ?? 0),
    )
    .sort(
      (a, b) =>
        Math.abs(cohenH(b.pct, NACIONAL[b.codigo] ?? 0)) -
        Math.abs(cohenH(a.pct, NACIONAL[a.codigo] ?? 0)),
    );
}

test("Wilson sozinho nao basta: diferenca real mas minuscula fica fora", () => {
  // 3.000 em 10.000 (30%) contra 28%: com essa base o IC exclui a referencia —
  // a diferenca e' real — mas o efeito e' desprezivel e nao muda preparo nenhum.
  assert.equal(diferencaEhReal(3000, 10000, 28), true);
  assert.ok(Math.abs(cohenH(30, 28)) < H_MINIMO);
  assert.equal(proporcaoDistintiva(3000, 10000, 30, 28), false);
});

test("efeito grande sozinho nao basta: base pequena demais fica fora", () => {
  // 1 questao em 120 (0,8%) contra 0,5%: com base realista, Wilson ja segura.
  assert.equal(diferencaEhReal(1, 120, 0.5), false);
  assert.equal(proporcaoDistintiva(1, 120, 0.8, 0.5), false);
});

test("base abaixo do minimo nunca e' distintiva, por maior que seja o efeito", () => {
  // Buraco medido: com base 20 e referencia 0,5%, UMA ocorrencia ja faz o IC de
  // Wilson excluir a referencia. O dataset atual so publica bancas acima de 120
  // questoes, o que esconde o problema — a funcao nao pode depender disso.
  assert.equal(diferencaEhReal(1, 20, 0.5), true, "Wilson sozinho deixa passar");
  assert.ok(Math.abs(cohenH(5, 0.5)) > H_MINIMO, "e o efeito parece enorme");
  assert.equal(proporcaoDistintiva(1, 20, 5, 0.5), false, "a base minima segura");
});

test("desvio NEGATIVO com base grande e' exibido", () => {
  // O caso que um piso de contagem na celula mataria: a banca quase nunca pede a
  // incorreta, e a celula e' pequena PORQUE essa e' a caracteristica dela.
  assert.ok(cohenH(0.5, 7.1) < 0);
  assert.equal(proporcaoDistintiva(5, 1000, 0.5, 7.1), true);
});

test("SES-PE perde correlacionar colunas e mantem o que e' acionavel", () => {
  const pe = DATASET.bancas.find((b) => /SES PE/i.test(b.nome));
  assert.ok(pe, "SES-PE tem que existir no dataset");
  const codigos = distintivos(pe).map((l) => l.codigo);

  // A PROPRIEDADE, e nao os numeros daquela geracao.
  //
  // Este teste afirmava "172 questoes contra 7,1%" e "pede_incorreta entra".
  // Quando o dataset foi regerado sem as provas de R+, o SES-PE passou de 172
  // para 146 questoes de `pede_incorreta` E a referencia nacional se moveu
  // junto -- porque ela e calculada sobre o mesmo acervo. O gerador entao
  // decidiu que aquele formato deixou de ser distintivo, o que e uma decisao
  // legitima dele.
  //
  // Numero cravado num teste sobre dado gerado quebra a cada regeracao e nao
  // protege nada: o que importa e que o filtro CORTE o irrelevante e DEIXE
  // passar o que tem massa. Os dois lados continuam afirmados.
  assert.ok(!codigos.includes("correlacionar_colunas"), "5 questoes nao e' fato");
  assert.ok(
    codigos.length > 0,
    "o SES-PE tem formato caracteristico de sobra; zero significa filtro quebrado",
  );
  const linha = distintivos(pe)[0];
  assert.ok(linha.qtd >= 20, `formato exibido com base minuscula: ${linha.codigo} (${linha.qtd})`);
});

test("formato raro com massa real sobrevive", () => {
  // 64 questoes de correlacionar colunas, 12x a media: suprimir o codigo inteiro
  // jogaria fora o achado mais util dessa banca.
  const caron = DATASET.bancas.find((b) => /Angelina Caron/i.test(b.nome));
  assert.ok(caron);
  assert.ok(distintivos(caron).some((l) => l.codigo === "correlacionar_colunas"));
});

test("a maioria das bancas nao tem formato distintivo — e isso e' o esperado", () => {
  const vazias = DATASET.bancas.filter((b) => distintivos(b).length === 0).length;
  // Se desabar para perto de zero, o filtro parou de filtrar.
  assert.ok(vazias >= 40, `esperava muitas bancas sem formato distintivo, veio ${vazias}`);
  assert.ok(vazias < DATASET.bancas.length, "nem todas podem ficar vazias");
});

test("o filtro corta a grande maioria das linhas", () => {
  let total = 0;
  let exibidas = 0;
  for (const b of DATASET.bancas) {
    total += b.formato.distribuicao.filter((l) => l.codigo !== "direta").length;
    exibidas += distintivos(b).length;
  }
  assert.ok(total > 300, `dataset menor que o esperado: ${total}`);
  assert.ok(exibidas < total / 2, `esperava corte agressivo, ficou ${exibidas}/${total}`);
});

test("ordena da caracteristica mais forte para a mais fraca", () => {
  const caron = DATASET.bancas.find((b) => /Angelina Caron/i.test(b.nome));
  const hs = distintivos(caron).map((l) => Math.abs(cohenH(l.pct, NACIONAL[l.codigo] ?? 0)));
  assert.deepEqual(hs, [...hs].sort((a, b) => b - a));
});

test("a flag do gerador manda quando existe", () => {
  // Transicao: enquanto o dataset em producao for anterior a Fase 2, a regra e'
  // recalculada aqui. Quando o gerador passar a emitir `exibivel`, ele decide —
  // e regerar o dataset nao exige novo deploy de codigo.

  // Linha que a regra local suprimiria, marcada como exibivel pelo gerador.
  assert.equal(decidirExibicao(true, 5, 1486, 0.3, 0.5), true);

  // E o contrario: linha forte que o gerador decidiu esconder.
  assert.equal(decidirExibicao(false, 172, 1486, 11.6, 7.1), false);

  // Sem a flag, a regra local decide — que e' o estado do dataset hoje.
  assert.equal(decidirExibicao(undefined, 5, 1486, 0.3, 0.5), false);
  assert.equal(decidirExibicao(undefined, 172, 1486, 11.6, 7.1), true);
});
