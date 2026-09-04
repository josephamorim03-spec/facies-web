import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const hook = readFileSync(new URL("../../src/hooks/useDeslizeLateral.ts", import.meta.url), "utf8");
const resolvedor = readFileSync(
  new URL(
    "../../src/app/banco/sessao/[sessionId]/_components/FocusedQuestion.tsx",
    import.meta.url,
  ),
  "utf8",
);

/**
 * "Toda acao de gesto tem um botao equivalente na tela."
 *
 * A regra e do desenho (`Webapp - telas.dc.html:2181`) e da WCAG 2.5.1. O e2e
 * `sessao.deslize.spec.ts` prova o COMPORTAMENTO — que o botao anda, que
 * desligar o gesto nao o remove. Estes dois testes protegem a ESTRUTURA que
 * torna o comportamento dificil de quebrar por acidente, e correm em
 * milissegundos: um teste de navegador que so roda no CI nao impede ninguem de
 * empurrar a mudanca.
 */

test("o gesto nao consegue criar um caminho proprio", () => {
  // Se o hook navegasse sozinho — `router.push`, `window.location`, um `href` —
  // ele passaria a ser um caminho, e nao um atalho. A partir dai o botao
  // poderia divergir dele sem que nada reclamasse, e a equivalencia viraria
  // coincidencia. Ele so pode chamar de volta.
  for (const proibido of [
    /useRouter/,
    /router\s*\.\s*(push|replace|back|forward)/,
    /window\s*\.\s*location/,
    /history\s*\.\s*(push|replace)State/,
  ]) {
    assert.doesNotMatch(
      hook,
      proibido,
      `useDeslizeLateral navegou sozinho (${proibido}) — ele so pode chamar aoAvancar/aoVoltar`,
    );
  }
});

test("o deslize e o botao chamam a MESMA funcao", () => {
  // Nao basta existirem os dois: se o gesto chamasse `avancarPorGesto` e o
  // botao `onNext`, os dois caminhos poderiam divergir em silencio — e a
  // divergencia so apareceria para quem usa um deles, que e sempre a minoria
  // que nao consegue usar o outro.
  //
  // ⚠️ Estas asseveracoes sao TEXTUAIS de proposito. A alternativa seria
  // renderizar o componente, e o runner nao transforma JSX; o custo de manter
  // um segundo runner so para isto e maior que o de reescrever estas duas
  // linhas quando o nome mudar.
  assert.match(
    resolvedor,
    /aoAvancar:\s*onNext/,
    "o deslize deixou de chamar `onNext` — se mudou de nome, mude aqui e confira que o botao mudou junto",
  );
  assert.match(resolvedor, /aoVoltar:\s*onPrev/, "o deslize deixou de chamar `onPrev`");
  assert.match(resolvedor, /onClick=\{onNext\}/, "sumiu o botao que avanca");
  assert.match(resolvedor, /onClick=\{onPrev\}/, "sumiu o botao que volta");
});

test("o rodape da sessao nao volta a sumir na correcao", () => {
  // O `<footer>` estava atras de `!canUsePostAnswerActions`: revelar o gabarito
  // APAGAVA a barra inteira — o avancar mudava de lugar, e "Marcar" e
  // "Anterior" sumiam justamente na hora de decidir se a questao fica guardada.
  assert.doesNotMatch(
    resolvedor,
    /\{!canUsePostAnswerActions && \(\s*<footer/,
    "o rodape voltou a ser condicional: a acao primaria sai da faixa do polegar quando a correcao abre",
  );
});
