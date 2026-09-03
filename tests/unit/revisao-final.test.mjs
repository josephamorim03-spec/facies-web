import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * A integridade do artefato da Semana Final de Revisão.
 *
 * O ebook e o app prometem "as mesmas 30 questões". Essa promessa mora inteira
 * dentro de `revisao_final.json`, gerado uma vez pelo kbank. Nenhuma outra
 * ferramenta pegaria uma divergência aqui: um dia com 4 questões onde deviam ser
 * 5, um gabarito cuja letra não existe nas alternativas, ou uma questão repetida
 * em dois dias não quebram typecheck, lint nem build — mas quebram a promessa na
 * página pública. Este teste é o guard.
 *
 * Lê o JSON direto, e não `lib/revisao.ts`, pela mesma razão do
 * `previsao-hash.test.mjs`: o runner de `node --test` não resolve o alias `@/`, e
 * o alvo do guard é o artefato, não o acessor.
 */

const REVISAO = JSON.parse(
  readFileSync(new URL("../../src/data/facies/revisao_final.json", import.meta.url), "utf8"),
);
const PREVISAO = JSON.parse(
  readFileSync(new URL("../../src/data/facies/previsao.json", import.meta.url), "utf8"),
);

const CARGA_ESPERADA = [5, 5, 5, 4, 4, 4, 3];
const TOTAL_ESPERADO = 30;

function todasAsQuestoes() {
  return REVISAO.dias.flatMap((dia) => dia.questoes);
}

test("a estrutura declara 7 dias e 30 questões na carga combinada", () => {
  assert.equal(REVISAO.schema_version, "revisao_final_dataset.v1");
  assert.deepEqual(REVISAO.estrutura.carga_por_dia, CARGA_ESPERADA);
  assert.equal(REVISAO.estrutura.total_questoes, TOTAL_ESPERADO);
  assert.equal(REVISAO.dias.length, CARGA_ESPERADA.length);
});

test("os dias são 1..7 em ordem, cada um com a carga do seu dia", () => {
  assert.deepEqual(
    REVISAO.dias.map((dia) => dia.dia),
    [1, 2, 3, 4, 5, 6, 7],
    "os dias foram reordenados ou perderam um dia",
  );
  for (const dia of REVISAO.dias) {
    assert.equal(
      dia.questoes.length,
      CARGA_ESPERADA[dia.dia - 1],
      `dia ${dia.dia} (${dia.subtema}) tem ${dia.questoes.length} questões`,
    );
    assert.ok(dia.subtema, `dia ${dia.dia} sem subtema`);
  }
});

test("o total bate e nenhuma questão se repete entre dias", () => {
  const questoes = todasAsQuestoes();
  assert.equal(questoes.length, TOTAL_ESPERADO);
  const ids = new Set(questoes.map((q) => q.question_id));
  assert.equal(ids.size, TOTAL_ESPERADO, "há questão repetida na revisão");
});

test("toda questão tem enunciado, alternativas e um gabarito que existe", () => {
  for (const q of todasAsQuestoes()) {
    assert.ok(q.enunciado && q.enunciado.trim().length > 0, `sem enunciado: ${q.question_id}`);
    const letras = Object.keys(q.alternativas ?? {});
    assert.ok(letras.length > 0, `sem alternativas: ${q.question_id}`);
    assert.ok(
      letras.includes(q.gabarito),
      `gabarito "${q.gabarito}" não está entre as alternativas de ${q.question_id}`,
    );
  }
});

test("a cobertura de comentário fecha a conta", () => {
  const c = REVISAO.cobertura_comentario;
  assert.equal(c.total, TOTAL_ESPERADO);
  assert.equal(c.com_comentario + c.sem_comentario, c.total);
});

test("os dias são o top-7 da aposta congelada, na ordem", () => {
  const grao = REVISAO.estrutura.grao;
  const esperado = PREVISAO.predictions[grao].lista
    .slice()
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, REVISAO.dias.length)
    .map((item) => item.rotulo);
  assert.deepEqual(
    REVISAO.dias.map((dia) => dia.subtema),
    esperado,
    "os dias da revisão divergem do top-7 da aposta registrada",
  );
});

/**
 * A revisão precisa nascer da aposta CONGELADA, não de um recálculo. O
 * `fonte_previsao.content_sha256` é o elo: se a aposta for registrada de novo ou
 * a revisão for gerada de outra fonte, o elo quebra e a página publicaria uma
 * revisão que não corresponde ao que foi prometido na `/aposta`.
 */
test("a revisão aponta para a mesma aposta publicada", () => {
  assert.equal(
    REVISAO.fonte_previsao.content_sha256,
    PREVISAO.content_sha256,
    "a revisão não foi gerada a partir da aposta congelada publicada",
  );
});

/* ────────────────────────────────────────────────────────────────────────────
 * O conteúdo educativo (D13/D15) — o corpo do ebook desde que as questões
 * saíram da página pública.
 *
 * O julgador do kbank (`judge_revisao_educativa.py`) já reprova o que dá para
 * reprovar por medida antes do conteúdo virar dataset. O que estes testes
 * protegem é o que acontece DEPOIS: o artefato atravessou a fronteira entre os
 * dois repositórios e precisa continuar renderizável e honesto do lado do web.
 * ──────────────────────────────────────────────────────────────────────────── */

const BLOCOS = [
  "resumo_30s",
  "como_a_prova_cobra",
  "armadilhas",
  "estrutura",
  "checklist_vespera",
  "fontes",
  "exemplo_de_cobranca",
];

function paginasEducativas() {
  return Object.entries(REVISAO.conteudo_educativo ?? {});
}

test("cada página educativa é de um dia que existe e traz os blocos", () => {
  const diasValidos = new Set(REVISAO.dias.map((dia) => String(dia.dia)));
  for (const [dia, pagina] of paginasEducativas()) {
    assert.ok(diasValidos.has(dia), `página educativa do dia ${dia}, que não existe`);
    for (const bloco of BLOCOS) {
      assert.ok(pagina[bloco], `dia ${dia} sem o bloco ${bloco}`);
    }
  }
});

/**
 * O assunto da página tem de ser o assunto do dia. Um deslocamento de índice
 * aqui — a página do dia 3 no dia 4 — não quebra nada tecnicamente: o ebook
 * publicaria conteúdo de dependência química sob o título de diabetes.
 */
test("o assunto da página bate com o assunto do dia", () => {
  for (const [dia, pagina] of paginasEducativas()) {
    const doDia = REVISAO.dias.find((item) => String(item.dia) === dia);
    assert.equal(pagina.subtema, doDia.subtema, `dia ${dia}: página de outro assunto`);
  }
});

/**
 * `revisado` é o campo que autoriza a página a aparecer sem aviso. Ele precisa
 * existir e ser booleano em toda página: `undefined` renderizaria como falso
 * numa condição e como "não avisar" em outra, dependendo de quem escreveu o JSX
 * — e a diferença entre as duas é publicar conteúdo médico não revisado.
 */
test("toda página declara se foi revisada, e a contagem fecha", () => {
  const paginas = paginasEducativas();
  for (const [dia, pagina] of paginas) {
    assert.equal(typeof pagina.revisado, "boolean", `dia ${dia} sem 'revisado' booleano`);
  }
  const cobertura = REVISAO.cobertura_educativa;
  assert.equal(
    cobertura.aprovados + cobertura.rascunhos,
    paginas.length,
    "a cobertura declarada não bate com as páginas presentes",
  );
  assert.equal(
    paginas.filter(([, pagina]) => pagina.revisado).length,
    cobertura.aprovados,
    "a contagem de aprovados não bate com o campo 'revisado' das páginas",
  );
});

/**
 * A tabela é desenhada célula a célula contra o cabeçalho. Uma linha com
 * comprimento diferente das colunas desalinha a tabela inteira, e no papel isso
 * é um erro que ninguém corrige depois de impresso.
 */
test("a estrutura de cada página é bem formada", () => {
  for (const [dia, pagina] of paginasEducativas()) {
    const estrutura = pagina.estrutura;
    assert.ok(estrutura.titulo, `dia ${dia}: estrutura sem título`);
    if (estrutura.tipo === "tabela") {
      for (const linha of estrutura.linhas) {
        assert.equal(
          linha.length,
          estrutura.colunas.length,
          `dia ${dia}: linha com ${linha.length} células para ${estrutura.colunas.length} colunas`,
        );
      }
    } else {
      assert.equal(estrutura.tipo, "fluxograma", `dia ${dia}: tipo de estrutura inválido`);
      assert.ok(estrutura.passos.length >= 3, `dia ${dia}: fluxograma curto demais`);
    }
  }
});

/**
 * O eixo citado no texto tem de existir na medição daquele assunto. É a regra
 * que separa "é assim que a sua prova cobra" (afirmação sobre a base, que a
 * contagem sustenta) de "acho que cai assim" (opinião com número decorativo).
 */
test("os eixos citados existem na evidência medida do próprio assunto", () => {
  for (const [dia, pagina] of paginasEducativas()) {
    const medidas = new Set(
      ["answer_type", "charge_pattern", "reasoning_type", "trap_pattern"].flatMap(
        (eixo) => (pagina.evidencia?.[eixo] ?? []).map((linha) => linha.classe),
      ),
    );
    for (const citado of pagina.eixos_citados ?? []) {
      assert.ok(medidas.has(citado), `dia ${dia}: cita '${citado}', que a medição não tem`);
    }
  }
});

/**
 * A procedência pública nunca pode ser o identificador interno de ingestão.
 * Medido em 02/09/2026: `exam_name` valia o mesmo slug de lote nas 1.673
 * questões da base — um identificador que carrega o nome de um CONCORRENTE, e
 * que a página renderizava por extenso embaixo de cada questão.
 */
test("nenhum identificador interno de ingestão vaza no artefato público", () => {
  const bruto = JSON.stringify(REVISAO).toLowerCase();
  for (const proibido of ["estrategia-med", "residencia-ad-revalida"]) {
    assert.ok(!bruto.includes(proibido), `o artefato público contém '${proibido}'`);
  }
  for (const questao of todasAsQuestoes()) {
    assert.ok(
      questao.fonte === null || /^(ENARE \/ ENAMED|Revalida INEP)$/.test(questao.fonte),
      `fonte pública inesperada: ${questao.fonte}`,
    );
  }
});
