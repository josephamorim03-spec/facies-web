/**
 * QUANTAS QUESTÕES A PROVA VAI TER — e por que a tela precisava saber.
 *
 * O backend passou a servir a prova inteira (100 do ENARE, e não 10). Mas os
 * três números que o aluno lê antes de começar continuavam saindo do seletor de
 * quantidade:
 *
 *     Número de questões    10        ← `clampedLimit`
 *     Tempo estimado        15 min    ← `clampedLimit * 1.5`
 *     [ Começar prova · 10 questões ] ← `clampedLimit`
 *
 * A sessão entregava 100 e o botão prometia 10. Consertar o servidor e deixar a
 * tela mentindo é meio conserto: para quem usa, nada mudou.
 *
 * ⚠️ O tamanho depende de INCLUIR OU NÃO AS ANULADAS, e é o mesmo eixo que o
 * backend usa (`include_annulled`). Sem isso o número dançaria ao marcar a
 * caixa — que é justamente quando o aluno olha para ele.
 */

import type { QuestionBankExamEdition } from "@/lib/api";

import { mesEAnoCurto } from "./resumoDaProva.ts";

/**
 * O QUE SEPARA UMA PROVA DE OUTRA no recorte — e muda por modalidade.
 *
 * No acesso direto é o NÚMERO da aplicação: a PE aplica `n=1` e `n=2` no mesmo
 * ano, cada uma uma prova inteira. No R+ é o CADERNO, porque ali a
 * especialidade é que separa: os cadernos partilham o número "1" e chavear por
 * ele juntava todos. Medido em produção (2026-09-10): **101 recortes** de R+
 * fundidos, **20.559 questões** — a SES-DF 2021 servia 2.400 como "a prova".
 *
 * ⚠️ Esta função é o par de `_chave_da_prova` no serviço. As duas TÊM de
 * concordar: a tela manda a chave escolhida e o servidor procura por ela. Se
 * divergirem, o aluno escolhe um caderno e recebe `None` — a sessão cai calada
 * no recorte de treino.
 */
export function chaveDaProva(edicao: QuestionBankExamEdition): string {
  if (edicao.access_group === "RPLUS") return (edicao.access_type ?? "").trim();
  return edicao.exam_number;
}

/** As edições de UMA aplicação somam: metades do mesmo caderno. */
export function tamanhoDaProva(
  edicoes: QuestionBankExamEdition[],
  incluirAnuladas: boolean,
): number | null {
  if (edicoes.length === 0) return null;
  let total = 0;
  for (const edicao of edicoes) {
    total += edicao.captured_count;
    if (!incluirAnuladas) total -= edicao.annulled_count;
  }
  // Zero não é tamanho: uma prova só de anuladas, sem incluí-las, não é sessão.
  return total > 0 ? total : null;
}

/**
 * O tamanho de cada ano, para o seletor de ano parar de anunciar o do treino.
 *
 * O aluno via "2026 · 67" e a prova tem 100 — 67 é a contagem do índice de
 * treino, que exclui anulada, desatualizada e duplicata. Certo para treino,
 * errado num seletor que está escolhendo qual PROVA fazer.
 */
/**
 * QUANDO A PROVA DE CADA ANO CAIU — o que o rótulo do ano não diz.
 *
 * A fonte rotula pela TURMA: a "ENARE 2026" foi aplicada em 20/10/2025, porque
 * o processo seletivo para ingresso em 2026 acontece no fim de 2025. Quem lê
 * "2026" no seletor entende "a prova deste ano" — foi exatamente o que a tela
 * provocou em 2026-09-10, sobre uma prova que o aluno acreditava ainda não ter
 * ocorrido.
 *
 * ⚠️ POR QUE A DATA AO LADO, E NÃO O ANO RENUMERADO.
 *
 * Renumerar — exibir 2025 no lugar de 2026 — foi medido contra produção em
 * 2026-09-10 e **colide**: das 2.043 edições de prova, só **662** têm data
 * provada. Renumerar onde há prova e manter o rótulo onde não há junta duas
 * edições diferentes no mesmo número: **133 grupos, 266 edições**. O ENARE é um
 * deles — 2022 vira 2021 e encontra o 2021 sem data, e o seletor mostra dois
 * chips "2021" oferecendo provas diferentes. Isso é pior do que o rótulo
 * confuso que se queria consertar.
 *
 * Dizer QUANDO caiu resolve a mesma confusão sem renomear nada, e o rótulo
 * continua batendo com o edital e com os outros cursinhos.
 *
 * Sem data, nada é dito: `applied_on` nulo nunca vira `year - 1` aqui.
 */
export function aplicacaoPorAno(
  edicoes: QuestionBankExamEdition[],
): Map<number, string> {
  const vistos = new Map<number, Set<string>>();
  for (const edicao of edicoes) {
    const quando = mesEAnoCurto(edicao.applied_on);
    if (quando === null) continue;
    const conjunto = vistos.get(edicao.year);
    if (conjunto) conjunto.add(quando);
    else vistos.set(edicao.year, new Set([quando]));
  }
  const saida = new Map<number, string>();
  // Cadernos do mesmo ano que discordam da data não viram uma data só: o ENARE
  // tem oito cadernos por ano, e eleger o primeiro seria afirmar por sorteio.
  for (const [ano, conjunto] of vistos) {
    if (conjunto.size === 1) saida.set(ano, [...conjunto][0]);
  }
  return saida;
}

export function tamanhoPorAno(
  edicoes: QuestionBankExamEdition[],
  incluirAnuladas: boolean,
): Map<number, number> {
  const porAno = new Map<number, QuestionBankExamEdition[]>();
  for (const edicao of edicoes) {
    const lista = porAno.get(edicao.year);
    if (lista) lista.push(edicao);
    else porAno.set(edicao.year, [edicao]);
  }
  const saida = new Map<number, number>();
  for (const [ano, lista] of porAno) {
    const tamanho = tamanhoDaProva(lista, incluirAnuladas);
    if (tamanho !== null) saida.set(ano, tamanho);
  }
  return saida;
}
