import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * As TRÊS saídas da sessão — o artboard 13b.
 *
 * Este teste existe porque a versão anterior tinha DUAS, e a segunda escondia
 * uma decisão que o aluno não tomou: "Sair" deixava a sessão pendente sem dizer
 * isso nem oferecer a alternativa de corrigir o que já foi feito. Quem sai às
 * 23h40 com 7 de 24 respondidas quer a correção das 7 — e a ação já existia na
 * página, só não era oferecida no momento da decisão.
 *
 * O projeto de design escreve a regra na própria prancheta: "três saídas,
 * porque são três intenções diferentes". Colapsá-las de volta é a regressão
 * fácil, porque um diálogo com dois botões parece mais limpo.
 */

const dialogo = readFileSync(
  new URL("../../src/app/banco/sessao/[sessionId]/_components/SaidaDaSessao.tsx", import.meta.url),
  "utf8",
);
const pagina = readFileSync(
  new URL("../../src/app/banco/sessao/[sessionId]/page.tsx", import.meta.url),
  "utf8",
);

test("o dialogo de saida oferece as tres intencoes", () => {
  for (const rotulo of [
    "Continuar respondendo",
    "Sair e deixar pendente",
    "Encerrar por hoje",
  ]) {
    assert.ok(
      dialogo.includes(rotulo),
      `a saida "${rotulo}" sumiu do dialogo — sao tres intencoes, nao duas`,
    );
  }
});

test("a pagina liga as tres a acoes DIFERENTES", () => {
  // Sem isto, dois botoes poderiam apontar para o mesmo lugar e o dialogo
  // pareceria correto enquanto oferecesse duas saidas com tres rotulos.
  for (const handler of ["onContinuar", "onDeixarPendente", "onEncerrar"]) {
    assert.match(pagina, new RegExp(`${handler}=\\{`), `${handler} nao esta ligado na pagina`);
  }
  // `encerrar` e o unico que finaliza; `pendente` e o unico que navega embora.
  const trecho = pagina.slice(pagina.indexOf("<SaidaDaSessao"), pagina.indexOf("<SaidaDaSessao") + 900);
  assert.match(trecho, /onEncerrar=\{[\s\S]*?finalize\(\)/);
  assert.match(trecho, /onDeixarPendente=\{[\s\S]*?router\.push/);
});

test("fechar por Esc ou pelo fundo CONTINUA, nunca sai", () => {
  // Acao acidental tem de cair na opcao que nao muda nada. Um `onOpenChange`
  // que chamasse `onDeixarPendente` faria o Esc abandonar a sessao.
  const trecho = dialogo.slice(dialogo.indexOf("onOpenChange"), dialogo.indexOf("onOpenChange") + 260);
  assert.match(trecho, /onContinuar\(\)/);
  assert.doesNotMatch(trecho, /onDeixarPendente|onEncerrar/);
});

test("nenhuma das tres e marcada como destrutiva", () => {
  // O trabalho e preservado nas tres — o que muda e o destino do que ficou por
  // fazer. Pintar uma de `danger` diria ao aluno que ele vai perder algo.
  assert.doesNotMatch(dialogo, /variant="danger"/);
});

test("encerrar so aparece quando ha o que corrigir", () => {
  // "Corrige as 0 que voce fez" e uma frase que nao deveria existir, e a acao
  // seria identica a sair pendente.
  assert.match(dialogo, /respondidas > 0 \?/);
});
