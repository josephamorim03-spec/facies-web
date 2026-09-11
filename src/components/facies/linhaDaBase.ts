// ⚠️ RELATIVO E COM `.ts`, e não o alias `@/`. Este módulo é importado pelo
// teste `tests/unit/linha-da-base.test.mjs`, que roda em `node --test
// --experimental-strip-types` e não lê os `paths` do tsconfig.
//
// `Banca` entra como `import type`: o stripping apaga a linha inteira, então o
// `facies.json` de 1 MB que `facies.ts` importa nunca é resolvido aqui.
//
// AS DUAS FRASES DO CABEÇALHO DA PROVA, FORA DO COMPONENTE.
//
// Elas são aritmética pura sobre o dataset e já produziram dois defeitos
// publicados — a troca silenciosa de denominador na nota, e a mistura de duas
// populações na linha "Base". React não tem parte nisso, e enquanto viviam
// dentro do `.tsx` nenhum teste as alcançava.
import type { Banca } from "../../lib/facies.ts";

/**
 * A linha "Base" — N de M, nunca um número sem denominador.
 *
 * `questoes_total` já conta as anuladas (migration 118), então é o número que
 * bate com a prova, e é ele que a linha mostra quando não há denominador.
 *
 * ⚠️ QUAL PAR É COMPARÁVEL DEPENDE DE `edicoes_declaradas === edicoes`.
 *
 * `declaradas` soma só as edições que TÊM denominador. Quando apenas parte
 * declara, `questoes_total` conta edições que ficaram fora dessa soma, e
 * comparar os dois é comparar conjuntos diferentes — foi o que fazia 65 das 86
 * bancas caírem no ramo "sem denominador" e perderem a linha em silêncio. Aí o
 * par válido é `cobertas` × `declaradas`.
 *
 * Mas quando TODAS as edições declaram, os dois falam do mesmo conjunto, e o par
 * honesto passa a ser `questoes_total` × `declaradas` — porque `questoes_total`
 * é o número que a tela mostra. Medido nas 138 bancas: 49 declaram tudo e 36
 * declaram em parte; nas 36, `questoes_total` nunca fica abaixo de `cobertas`.
 *
 * Sem essa distinção a frase juntava duas populações. O ENARE sairia "566
 * questões · cobertura completa das 6 edições medidas", com 566 vindo da
 * projeção de leitura e a completude medida sobre as 600 da fonte — 49 bancas
 * nessa situação, 25 delas afirmando completude. Agora sai "566 de 600 questões
 * declaradas nas 6 edições medidas": os dois números, cada um com o seu sujeito.
 *
 * `estimado` é conservador: basta UMA edição vir da moda para o total ser
 * estimativa, e aí a tela diz "estimadas", nunca "declaradas".
 */
export function linhaBase(banca: Banca): string {
  const totalTxt = banca.questoes_total.toLocaleString("pt-BR");
  const den = banca.denominador;

  // A FASE QUE NÃO MEDIMOS é independente da cobertura, e por isso fecha
  // QUALQUER frase — menos a de completude, que já a nomeia por dentro.
  //
  // ⚠️ Ela vivia só dentro do ramo "cobertura completa", que exige
  // `cobertas === declaradas`. Nenhuma das três bancas com fase fora da leitura
  // cumpre isso: o Revalida não tem denominador, a SUS-BA sobra (300 contra
  // 270) e a UNICAMP falta uma (959 contra 960). O aviso existia no código e
  // nunca chegou a uma tela — e é justamente na UNICAMP, que aplica respostas
  // curtas no acesso direto, que ele mais pesa.
  const fase = den?.fase_nao_coberta
    ? ` · a ${den.fase_nao_coberta} não entra nesta leitura`
    : "";

  if (!den || den.declaradas == null || den.cobertas == null) {
    return `${totalTxt} questões${fase}`;
  }
  const { cobertas, declaradas } = den;
  const declaradasTxt = declaradas.toLocaleString("pt-BR");
  const rotulo = den.estimado ? " estimadas" : " declaradas";
  const uma = den.edicoes_declaradas === 1;
  const emEdicoes = uma ? "na edição medida" : `nas ${den.edicoes_declaradas} edições medidas`;
  const dasEdicoes = uma ? "da edição medida" : `das ${den.edicoes_declaradas} edições medidas`;

  // "Completa" só vale para a fase que medimos. A UNICAMP fecha as 80 objetivas
  // E aplica uma fase dissertativa inteira que a leitura não cobre — dizer
  // "cobertura completa" sem nomeá-la seria a afirmação mais cara desta linha.
  const completa = den.fase_nao_coberta
    ? `${totalTxt} questões · fase objetiva completa; a ${den.fase_nao_coberta} não entra nesta leitura`
    : `${totalTxt} questões · cobertura completa ${dasEdicoes}`;

  if (den.edicoes_declaradas === den.edicoes) {
    if (banca.questoes_total === declaradas) {
      return completa;
    }
    // SOBRA: temos MAIS do que a prova declarou. É anomalia — ou a moda errou,
    // ou há questão atribuída a uma edição que não a teve. Some da tela era o
    // pior desfecho: some justamente o caso que pede investigação.
    if (banca.questoes_total > declaradas) {
      return `${totalTxt} questões · ${declaradasTxt}${rotulo} ${emEdicoes}${fase}`;
    }
    return `${totalTxt} de ${declaradasTxt} questões${rotulo} ${emEdicoes}${fase}`;
  }

  // SÓ PARTE DAS EDIÇÕES DECLARA. Aqui o total da banca cobre edições que não
  // entram na soma, então ele não pode dividir a frase com `declaradas` — mas
  // também não pode SUMIR dela. Liderar por `cobertas` era o que fazia a linha
  // contradizer a nota logo abaixo, no mesmo cabeçalho: a SES-PE dizia "995
  // questões" na Base e "1.416 de 1.431 questões classificadas" na nota.
  //
  // Então o total lidera sempre (é a população que o resto do cabeçalho usa) e
  // a cláusula do denominador vira uma afirmação com sujeito próprio — "as N
  // edições medidas" —, carregando os dois números que pertencem a ela.
  const oQueDeclaram = `${uma ? "a edição medida soma" : `as ${den.edicoes_declaradas} edições medidas somam`} ${declaradasTxt}${rotulo}`;
  if (cobertas === declaradas) {
    return `${totalTxt} questões · ${oQueDeclaram}, e a base tem todas${fase}`;
  }
  return `${totalTxt} questões · ${oQueDeclaram}, e a base tem ${cobertas.toLocaleString("pt-BR")}${fase}`;
}

/**
 * A nota do painel 01 — quantas questões estão classificadas, e SOBRE O QUÊ.
 *
 * `mais_cai.cobertura` é medida contra as questões VÁLIDAS (total menos
 * anuladas), nunca contra `questoes_total`. Verificado nas 138 bancas do
 * dataset, sem exceção. Escrever só "% da base" ao lado de um cabeçalho que
 * mostra o total faz o leitor dividir pelos números errados — e foi assim que
 * este número chegou como defeito.
 *
 * ⚠️ As anuladas ficam FORA de `mais_cai` por decisão, não por falha: elas foram
 * cobradas na prova (e por isso contam no total), mas não descrevem o que a
 * banca cobra de conteúdo. O `<details>` "De onde vem este número" já explica
 * isso; a nota só precisa não contradizê-lo.
 *
 * ⚠️ "NESTA LEITURA", E JÁ DISSE "CLASSIFICADAS" — a palavra estava errada e o
 * erro nasceu em 2026-09-10, quando `questoes_total` passou a ser o total da
 * PROVA em vez da projeção de treino somada às anuladas.
 *
 * Com o denominador novo, "529 de 564 questões classificadas" afirmaria que 35
 * questões estão por classificar. Elas não estão: medido em produção no ENARE,
 * **600 de 600** têm especialidade e subtema. O que aconteceu com essas 35 é
 * outra coisa — saíram do acervo servível por duplicata ou atualização —, e é
 * isso que a frase agora diz, com o número ao lado. Trocar o denominador sem
 * trocar o substantivo teria transformado um defeito de contagem num defeito de
 * afirmação, que é pior: o primeiro se vê, o segundo se acredita.
 */
export function notaDaClassificacao(banca: Banca): string {
  const base = banca.mais_cai.base;
  const anuladas = banca.questoes_anuladas ?? 0;
  const fora = banca.questoes_fora_da_leitura ?? 0;
  const validas = banca.questoes_total - anuladas;
  const inicio = `${base.toLocaleString("pt-BR")} de ${validas.toLocaleString("pt-BR")} questões nesta leitura`;
  const partes: string[] = [];
  if (anuladas > 0) {
    partes.push(`${anuladas.toLocaleString("pt-BR")} anuladas ficam fora desta conta`);
  }
  if (fora > 0) {
    partes.push(
      `${fora.toLocaleString("pt-BR")} ${fora === 1 ? "saiu" : "saíram"} do acervo por duplicata ou atualização`,
    );
  }
  return partes.length > 0 ? `${inicio} · ${partes.join(" · ")}` : inicio;
}
