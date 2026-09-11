import assert from "node:assert/strict";
import { test } from "node:test";

import {
  KROS_MAX_SIZE,
  KROS_MIN_SIZE,
  KROS_SIZE_STEP,
  ajustarAoPassoDoKros,
  ehTamanhoDeKrosValido,
  questionBankCtaLabel,
  ressalvaDoTreinoDirigido,
} from "../../src/app/banco/_lib/sessionBuilder.ts";

/**
 * O DEFEITO QUE ESTE ARQUIVO PRENDE — "o Treino dirigido não inicia".
 *
 * `app/domain/kros_modes.is_valid_kros_size` recusa com 422
 * (`invalid_kros_size`) qualquer sessão dirigida fora de 20–120 em múltiplos de
 * 5. O Banco abria em `limit = 10` e oferecia uma barra de passo 1, então o
 * caminho padrão do modo — escolher "Treino dirigido" e premir começar —
 * falhava SEMPRE, com um toast e nenhuma sessão.
 *
 * ⚠️ E falhava de forma que parecia intermitente: quem calhasse de parar a
 * barra num múltiplo de 5 acima de 20 conseguia iniciar. Modo que funciona às
 * vezes não é reportado como quebrado, e foi por isso que sobreviveu.
 */

test("os tres numeros sao os do servidor, e nao um palpite da tela", () => {
  // ⚠️ CÓPIA DELIBERADA de `app/domain/kros_modes.py`. Este teste existe para
  // que uma mudança lá apareça como teste vermelho aqui — e não como 422 na
  // cara do aluno, que é a forma como a divergência se manifestava.
  assert.equal(KROS_MIN_SIZE, 20);
  assert.equal(KROS_MAX_SIZE, 120);
  assert.equal(KROS_SIZE_STEP, 5);
});

test("o padrao do Banco era invalido — e agora sobe para o piso", () => {
  // 10 era o valor com que a tela abria. Era exatamente este número que o
  // servidor recusava.
  assert.equal(ehTamanhoDeKrosValido(10), false);
  assert.equal(ajustarAoPassoDoKros(10), KROS_MIN_SIZE);
});

test("encosta para BAIXO, nunca para cima", () => {
  // Para cima entregaria mais questões do que o aluno pediu — e, no teto, mais
  // do que o acervo tem.
  assert.equal(ajustarAoPassoDoKros(37), 35);
  assert.equal(ajustarAoPassoDoKros(24), 20);
  assert.equal(ajustarAoPassoDoKros(119), 115);
});

test("o teto do acervo entra, e o teto do produto tambem", () => {
  assert.equal(ajustarAoPassoDoKros(100, 63), 60);
  assert.equal(ajustarAoPassoDoKros(999), KROS_MAX_SIZE);
  assert.equal(ajustarAoPassoDoKros(999, 200), KROS_MAX_SIZE);
});

test("acervo abaixo do piso devolve o PISO, nao um tamanho invalido", () => {
  // Um filtro com 12 questões não permite nenhum tamanho que o servidor aceite.
  // Devolver 12 seria voltar ao 422; devolver 20 deixa o motor entregar o que
  // houver, e a tela diz separadamente que o filtro tem menos que isso.
  assert.equal(ajustarAoPassoDoKros(12, 12), KROS_MIN_SIZE);
  assert.equal(ajustarAoPassoDoKros(0, 0), KROS_MIN_SIZE);
});

test("a grade do SERVIDOR vence a copia local quando a previa responde", () => {
  // `KrosPreviewOut` publica `min_size`, `max_size` e `size_step` — a mesma
  // regra que `is_valid_kros_size` aplica. Se o motor mudar o piso, a barra
  // acompanha sem esperar por um deploy do front.
  const grade = { min: 30, max: 90, passo: 10 };
  assert.equal(ajustarAoPassoDoKros(10, 90, grade), 30);
  assert.equal(ajustarAoPassoDoKros(47, 90, grade), 40);
  assert.equal(ajustarAoPassoDoKros(999, 90, grade), 90);
});

test("grade com piso fora do passo nao sai deslocada", () => {
  // Encostar a partir do zero (`floor(v / passo) * passo`) devolveria 20 numa
  // grade que comeca em 22 — um valor que o servidor recusaria na mesma. A
  // conta parte do PISO.
  const grade = { min: 22, max: 100, passo: 5 };
  assert.equal(ajustarAoPassoDoKros(30, 100, grade), 27);
  assert.equal(ajustarAoPassoDoKros(22, 100, grade), 22);
  assert.equal(ajustarAoPassoDoKros(1, 100, grade), 22);
});

test("tudo o que a funcao devolve e aceite pelo servidor", () => {
  for (const pedido of [0, 1, 7, 10, 19, 20, 21, 33, 50, 99, 120, 121, 4000]) {
    for (const teto of [0, 12, 20, 47, 100, 120, 500]) {
      const ajustado = ajustarAoPassoDoKros(pedido, teto);
      assert.equal(
        ehTamanhoDeKrosValido(ajustado),
        true,
        `pedido ${pedido} com teto ${teto} devolveu ${ajustado}, que o servidor recusa`,
      );
    }
  }
});

/**
 * O DEFEITO QUE A CORREÇÃO DO PISO CRIOU — e que só apareceu ao reanalisar.
 *
 * Com o piso de 20, um filtro com 12 questões trava a barra em 20 e manda 20.
 * O servidor aceita (o número é teto para ele), mas o botão anunciava "Começar
 * 20 questões" e a sessão saía com 12. É a mesma mentira que o piso veio
 * corrigir, com o sinal trocado: antes a barra aceitava 37 e mandava 35.
 *
 * ⚠️ Nada bloqueia: 12 questões valem a pena, e negá-las castigaria justamente
 * quem tem pouco acervo. O que muda é a PALAVRA — "até".
 */

test("acervo abaixo do piso vira ressalva, e o botao diz 'ate'", () => {
  const ressalva = ressalvaDoTreinoDirigido({
    treinoDirigido: true,
    availableCount: 12,
    piso: KROS_MIN_SIZE,
  });
  assert.ok(ressalva, "12 questoes com piso 20 tem de produzir ressalva");
  assert.match(ressalva, /12 questões/);
  assert.match(ressalva, /20/);
  // O rótulo do botão deixa de prometer e passa a dar teto.
  assert.equal(
    questionBankCtaLabel(20, "guided_choice", "topic", true),
    "Começar até 20 questões · corrige ao terminar, uma a uma",
  );
  assert.equal(
    questionBankCtaLabel(20, "guided_choice", "topic", false),
    "Começar 20 questões · corrige ao terminar, uma a uma",
  );
});

test("a ressalva CALA-SE quando nao ha o que ressalvar", () => {
  const casos = [
    // Acervo suficiente: o número do botão é promessa, e cumpre-se.
    { treinoDirigido: true, availableCount: 40, piso: 20 },
    // Acervo zero: quem fala é `motivoParaNaoComecar`, não esta. Duas funções
    // para duas perguntas — ver o docstring.
    { treinoDirigido: true, availableCount: 0, piso: 20 },
    // A prévia ainda não respondeu: afirmar aqui seria inventar.
    { treinoDirigido: true, availableCount: null, piso: 20 },
    // Fora do Treino dirigido não há piso nenhum.
    { treinoDirigido: false, availableCount: 3, piso: 20 },
  ];
  for (const caso of casos) {
    assert.equal(ressalvaDoTreinoDirigido(caso), null, JSON.stringify(caso));
  }
});

test("a fronteira e' exatamente o piso", () => {
  assert.ok(ressalvaDoTreinoDirigido({ treinoDirigido: true, availableCount: 19, piso: 20 }));
  assert.equal(ressalvaDoTreinoDirigido({ treinoDirigido: true, availableCount: 20, piso: 20 }), null);
  // Singular, porque uma questão não são "1 questões".
  assert.match(
    ressalvaDoTreinoDirigido({ treinoDirigido: true, availableCount: 1, piso: 20 }),
    /1 questão,/,
  );
});
