import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * A integridade do artefato da Semana Final de Revisão.
 *
 * A promessa do ebook e do app mora inteira dentro de `revisao_final.json`,
 * gerado uma vez pelo kbank. Nenhuma outra ferramenta pegaria uma divergência
 * aqui: um dia com 5 temas onde deviam ser 6, um gabarito cuja letra não existe
 * nas alternativas, ou uma questão repetida em dois dias não quebram typecheck,
 * lint nem build — mas quebram a promessa na página pública. Este teste é o
 * guard.
 *
 * Lê o JSON direto, e não `lib/revisao.ts`, pela mesma razão do
 * `previsao-hash.test.mjs`: o runner de `node --test` não resolve o alias `@/`, e
 * o alvo do guard é o artefato, não o acessor.
 *
 * ## ⚠️ POR QUE NÃO HÁ MAIS NÚMERO LITERAL AQUI
 *
 * Este arquivo fixava `TOTAL_ESPERADO = 30` e `CARGA_ESPERADA = [5,5,5,4,4,4,3]`.
 * Quando o artefato passou a 42 assuntos em 7 dias com 6 questões cada
 * (`e1fb3301`), oito testes ficaram vermelhos de uma vez — e a correção óbvia,
 * trocar 30 por 252, apenas adiaria o mesmo dia.
 *
 * As asserções agora são de CONSISTÊNCIA INTERNA: o artefato declara a própria
 * estrutura em `estrutura` (`dias`, `temas_por_dia`, `questoes_por_tema`,
 * `total_temas`, `total_questoes`), e o teste verifica que o conteúdo cumpre o
 * que ele mesmo declarou. Isso é mais forte que o número fixo, não mais fraco:
 * continua reprovando um dia curto, uma questão repetida ou um gabarito
 * inválido, e ainda reprova um cabeçalho que mente sobre o próprio corpo — coisa
 * que a versão anterior não olhava.
 *
 * ## ⚠️ TRÊS TESTES ESTAVAM INERTES
 *
 * `conteudo_educativo` foi renomeado para `conteudo` e ninguém atualizou este
 * arquivo. `paginasEducativas()` passou a devolver lista vazia, e três testes
 * que iteram essa lista continuaram VERDES sem verificar nada — o pior estado
 * possível para um guard. Eles voltaram a ler o artefato real.
 */

const REVISAO = JSON.parse(
  readFileSync(new URL("../../src/data/facies/revisao_final.json", import.meta.url), "utf8"),
);
const PREVISAO = JSON.parse(
  readFileSync(new URL("../../src/data/facies/previsao.json", import.meta.url), "utf8"),
);

const ESTRUTURA = REVISAO.estrutura;

/** Os 42 temas, na ordem em que o aluno os encontra: dia 1 primeiro. */
function todosOsTemas() {
  return REVISAO.dias.flatMap((dia) => dia.temas);
}

function todasAsQuestoes() {
  return todosOsTemas().flatMap((tema) => tema.questoes);
}

test("o cabeçalho não mente sobre o corpo", () => {
  assert.equal(REVISAO.schema_version, "revisao_final_dataset.v1");
  assert.equal(REVISAO.dias.length, ESTRUTURA.dias, "`estrutura.dias` diverge dos dias presentes");
  assert.equal(
    todosOsTemas().length,
    ESTRUTURA.total_temas,
    "`estrutura.total_temas` diverge dos temas presentes",
  );
  assert.equal(
    todasAsQuestoes().length,
    ESTRUTURA.total_questoes,
    "`estrutura.total_questoes` diverge das questões presentes",
  );
  // A multiplicação tem de fechar: um cabeçalho coerente consigo mesmo é a
  // primeira coisa que um gerador quebrado perde.
  assert.equal(ESTRUTURA.dias * ESTRUTURA.temas_por_dia, ESTRUTURA.total_temas);
  assert.equal(ESTRUTURA.total_temas * ESTRUTURA.questoes_por_tema, ESTRUTURA.total_questoes);
});

test("os dias são 1..N em ordem, cada um com a carga do seu dia", () => {
  assert.deepEqual(
    REVISAO.dias.map((dia) => dia.dia),
    Array.from({ length: ESTRUTURA.dias }, (_, i) => i + 1),
    "os dias foram reordenados ou perderam um dia",
  );
  for (const dia of REVISAO.dias) {
    assert.equal(
      dia.temas.length,
      ESTRUTURA.temas_por_dia,
      `dia ${dia.dia} tem ${dia.temas.length} temas`,
    );
    for (const tema of dia.temas) {
      assert.ok(tema.subtema, `dia ${dia.dia}: tema sem nome`);
      assert.equal(
        tema.questoes.length,
        ESTRUTURA.questoes_por_tema,
        `dia ${dia.dia}, ${tema.subtema}: ${tema.questoes.length} questões`,
      );
    }
  }
});

test("nenhuma questão se repete entre temas ou dias", () => {
  const questoes = todasAsQuestoes();
  const ids = new Set(questoes.map((q) => q.question_id));
  assert.equal(ids.size, questoes.length, "há questão repetida na revisão");
});

test("nenhum tema se repete entre dias", () => {
  // Assunto repetido em dois dias gasta duas das sete manhãs do aluno com a
  // mesma coisa, e a revisão perde justamente a cobertura que promete.
  const nomes = todosOsTemas().map((tema) => tema.subtema);
  assert.equal(new Set(nomes).size, nomes.length, "há assunto repetido em dois dias");
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
  assert.equal(c.total, ESTRUTURA.total_questoes);
  assert.equal(c.com_comentario + c.sem_comentario, c.total);
});

/**
 * A revisão precisa nascer da aposta CONGELADA, não de um recálculo.
 *
 * ⚠️ A aposta tem 30 assuntos e a revisão precisa de 42 — então nem todos os
 * temas podem vir dela, e o artefato modela isso: cada tema traz
 * `na_aposta_registrada`. A asserção é sobre os que AFIRMAM vir da aposta, e é
 * dupla: eles têm de ser exatamente a lista congelada, na ordem dela, e nenhum
 * outro pode alegar o mesmo. Um tema que se marca como previsto sem estar na
 * aposta publicaria "a sua prova cobra isto" sem a medida por trás.
 */
test("os temas da aposta são a aposta congelada, na ordem, e só eles", () => {
  const listaDaAposta = PREVISAO.predictions[ESTRUTURA.grao].lista
    .slice()
    .sort((a, b) => a.posicao - b.posicao)
    .map((item) => item.rotulo);

  const temas = todosOsTemas();
  const daAposta = temas.filter((tema) => tema.na_aposta_registrada);

  assert.deepEqual(
    daAposta.map((tema) => tema.subtema),
    listaDaAposta,
    "os temas marcados como previstos divergem da aposta registrada",
  );

  const forasDaAposta = temas.filter((tema) => !tema.na_aposta_registrada);
  assert.equal(
    daAposta.length + forasDaAposta.length,
    ESTRUTURA.total_temas,
    "`na_aposta_registrada` faltando em algum tema",
  );
  for (const tema of forasDaAposta) {
    assert.ok(
      !listaDaAposta.includes(tema.subtema),
      `${tema.subtema} está na aposta mas foi marcado como fora dela`,
    );
  }
});

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
 *
 * ⚠️ A chave é `conteudo`, e é indexada por SUBTEMA — não por dia, como era
 * quando havia um assunto por dia. Enquanto este arquivo procurava
 * `conteudo_educativo`, os três testes abaixo iteravam uma lista vazia e
 * passavam sem ler nada.
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
  return Object.entries(REVISAO.conteudo ?? {});
}

test("há uma página educativa por tema, e ela traz os blocos", () => {
  const paginas = paginasEducativas();
  assert.ok(paginas.length > 0, "nenhuma página educativa — a chave do artefato mudou de novo?");

  const temasPorNome = new Map(todosOsTemas().map((tema) => [tema.subtema, tema]));
  for (const [assunto, pagina] of paginas) {
    assert.ok(temasPorNome.has(assunto), `página de "${assunto}", que não é tema de nenhum dia`);
    for (const bloco of BLOCOS) {
      assert.ok(pagina[bloco], `${assunto} sem o bloco ${bloco}`);
    }
  }
  assert.equal(paginas.length, ESTRUTURA.total_temas, "há tema sem página educativa");
});

/**
 * A página tem de saber a que dia pertence, e concordar com o artefato. Um
 * deslocamento aqui — a página de dependência química anunciada no dia 4 — não
 * quebra nada tecnicamente: o ebook publicaria o conteúdo certo sob o dia
 * errado, e o aluno estudaria fora da ordem que a revisão promete.
 */
test("cada página aponta o dia em que o seu assunto realmente cai", () => {
  const diaDoTema = new Map(
    REVISAO.dias.flatMap((dia) => dia.temas.map((tema) => [tema.subtema, dia.dia])),
  );
  for (const [assunto, pagina] of paginasEducativas()) {
    assert.equal(pagina.subtema, assunto, `a página indexada em "${assunto}" diz ser de outra`);
    assert.equal(
      pagina.dia,
      diaDoTema.get(assunto),
      `${assunto}: a página diz dia ${pagina.dia}, o artefato põe no dia ${diaDoTema.get(assunto)}`,
    );
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
  for (const [assunto, pagina] of paginas) {
    assert.equal(typeof pagina.revisado, "boolean", `${assunto} sem 'revisado' booleano`);
  }
  const cobertura = REVISAO.cobertura_educativa;
  assert.equal(
    cobertura.aprovados + cobertura.rascunhos,
    paginas.length,
    "a cobertura declarada não bate com as páginas presentes",
  );
  assert.equal(
    cobertura.aprovados + cobertura.rascunhos + cobertura.ausentes,
    ESTRUTURA.total_temas,
    "aprovados + rascunhos + ausentes não fecha o total de temas",
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
  for (const [assunto, pagina] of paginasEducativas()) {
    const estrutura = pagina.estrutura;
    assert.ok(estrutura.titulo, `${assunto}: estrutura sem título`);
    if (estrutura.tipo === "tabela") {
      for (const linha of estrutura.linhas) {
        assert.equal(
          linha.length,
          estrutura.colunas.length,
          `${assunto}: linha com ${linha.length} células para ${estrutura.colunas.length} colunas`,
        );
      }
    } else {
      assert.equal(estrutura.tipo, "fluxograma", `${assunto}: tipo de estrutura inválido`);
      assert.ok(estrutura.passos.length >= 3, `${assunto}: fluxograma curto demais`);
    }
  }
});

/**
 * O eixo citado no texto tem de existir na medição daquele assunto. É a regra
 * que separa "é assim que a sua prova cobra" (afirmação sobre a base, que a
 * contagem sustenta) de "acho que cai assim" (opinião com número decorativo).
 */
test("os eixos citados existem na evidência medida do próprio assunto", () => {
  for (const [assunto, pagina] of paginasEducativas()) {
    const medidas = new Set(
      ["answer_type", "charge_pattern", "reasoning_type", "trap_pattern"].flatMap(
        (eixo) => (pagina.evidencia?.[eixo] ?? []).map((linha) => linha.classe),
      ),
    );
    for (const citado of pagina.eixos_citados ?? []) {
      assert.ok(medidas.has(citado), `${assunto}: cita '${citado}', que a medição não tem`);
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

/* ────────────────────────────────────────────────────────────────────────────
 * "O que mudou desde a última prova" — o bloco por assunto.
 *
 * O painel do rodapé já listava as dezenove atualizações, e ninguém as ligava ao
 * assunto que estava lendo. `atualizacoesDoAssunto` faz a ligação por
 * `subtemas`, e ela é frágil de um jeito silencioso: o campo guarda o RÓTULO do
 * subtema por extenso, então basta a taxonomia renomear "Tuberculose (TB)" para
 * a ligação virar zero — sem erro, sem página quebrada, só um bloco que some.
 *
 * ⚠️ Estes testes leem o ARTEFATO, não a função. `lib/revisao.ts` importa
 * `@/data/...` e o runner de `node --test` não resolve o alias — a mesma razão
 * pela qual `previsao-hash.test.mjs` lê o JSON. O que se fixa aqui é o dado de
 * que a função depende.
 * ────────────────────────────────────────────────────────────────────────── */

const TEMAS = new Set(REVISAO.dias.flatMap((dia) => dia.temas.map((t) => t.subtema)));

test("toda atualização publicada pertence a um assunto da revisão", () => {
  for (const item of REVISAO.atualizacoes) {
    const casa = (item.subtemas ?? []).filter((s) => TEMAS.has(s));
    assert.ok(
      casa.length > 0,
      `"${item.titulo}" não casa com nenhum dos ${TEMAS.size} assuntos — ` +
        "ela aparece só no rodapé, longe do assunto a que se refere",
    );
  }
});

/**
 * Sem isto, uma renomeação na taxonomia zeraria a ligação e o bloco viraria
 * código morto — verde, publicado e invisível.
 */
test("a ligação por subtema não está vazia", () => {
  const comAtualizacao = new Set(
    REVISAO.atualizacoes.flatMap((item) =>
      (item.subtemas ?? []).filter((s) => TEMAS.has(s)),
    ),
  );
  assert.ok(
    comAtualizacao.size > 0,
    "nenhum dos assuntos tem atualização ligada — o bloco nunca renderiza",
  );
});

/**
 * `vigencia` é ordenada por comparação de strings, e isso só funciona em
 * `YYYY-MM-DD`. Um formato brasileiro entraria sem erro e ordenaria por dia.
 */
test("a vigência é ISO, que é o que torna a ordenação cronológica", () => {
  for (const item of REVISAO.atualizacoes) {
    assert.match(item.vigencia, /^\d{4}-\d{2}-\d{2}$/, `vigência não-ISO: ${item.vigencia}`);
  }
});

/**
 * O bloco publica um link "fonte primária". Um item sem fonte renderizaria a
 * afirmação sem o documento que a sustenta, que é exatamente o que o painel
 * existe para não fazer.
 */
test("toda atualização tem fonte primária com URL", () => {
  for (const item of REVISAO.atualizacoes) {
    assert.ok(item.fontes?.length > 0, `"${item.titulo}" sem fonte`);
    for (const fonte of item.fontes) {
      assert.match(fonte.url, /^https?:\/\//, `"${item.titulo}": fonte sem URL válida`);
    }
  }
});

/**
 * O rodapé só existe para as ÓRFÃS.
 *
 * Enquanto as atualizações viviam só no fim da página, listá-las todas ali era a
 * única forma de publicá-las. Com cada uma ao lado do seu assunto, repetir a
 * lista inteira virou duplicação pura — 19 de 19, com título, resumo, vigência e
 * fonte iguais. Uma página que diz a mesma coisa duas vezes ensina a pular a
 * segunda, e a segunda é onde mora a ressalva.
 *
 * Este teste fixa a conta que decide o que o rodapé mostra. Se ela inverter, ou
 * a página duplica tudo de novo, ou some com uma atualização que não tem outra
 * casa.
 */
test("a soma fecha: toda atualização ou tem assunto, ou é órfã", () => {
  const comAssunto = REVISAO.atualizacoes.filter((item) =>
    (item.subtemas ?? []).some((s) => TEMAS.has(s)),
  );
  const orfas = REVISAO.atualizacoes.filter(
    (item) => !(item.subtemas ?? []).some((s) => TEMAS.has(s)),
  );
  assert.equal(
    comAssunto.length + orfas.length,
    REVISAO.atualizacoes.length,
    "há atualização que não é nem uma coisa nem outra",
  );
  assert.equal(
    orfas.length,
    0,
    "hoje nenhuma é órfã — se isto mudar, o rodapé volta a ter lista e é de propósito",
  );
});
