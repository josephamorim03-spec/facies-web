import type { StudyPlanActivity } from "../../../lib/api/domains/study-plan.ts";

/**
 * As fases do plano — artboard `9c`.
 *
 * O desenho mostra três blocos: "Esta semana", "Semanas 2 e 3" e "Últimas N
 * semanas". Eles não existem no contrato: `study-plan-v1` entrega uma LISTA de
 * atividades com data, e nada que as agrupe.
 *
 * ## Por que agrupar aqui, e não pedir ao backend
 *
 * O agrupamento é uma pergunta de leitura ("o que vem primeiro, o que vem
 * depois"), não uma decisão de planejamento. O motor já decidiu o quê e quando;
 * transformar isso em três blocos é apresentação, e apresentação que sobe para o
 * contrato vira versão nova toda vez que o desenho muda de ideia.
 *
 * ## O horizonte manda, e ele pode ser curto
 *
 * Quando faltam dez dias para a prova, "Semanas 2 e 3" não existe — e inventar a
 * caixa vazia seria dizer que há plano onde não há. Fase sem atividade nenhuma
 * não é devolvida.
 */

export type FaseDoPlano = {
  chave: "esta_semana" | "semanas_2_3" | "restante";
  rotulo: string;
  /** Dias corridos que a janela cobre, limitada pelo horizonte. */
  dias: number;
  atividades: number;
  questoes: number;
  minutos: number;
  /** O que essa janela pede, em português — nunca o nome do `kind`. */
  resumo: string;
};

const JANELAS = [
  { chave: "esta_semana" as const, rotulo: "Esta semana", de: 0, ate: 6 },
  { chave: "semanas_2_3" as const, rotulo: "Semanas 2 e 3", de: 7, ate: 20 },
  { chave: "restante" as const, rotulo: "Depois disso", de: 21, ate: Infinity },
];

/**
 * O nome de cada tipo de atividade na fala do aluno.
 *
 * ⚠️ `kind` é vocabulário interno (`dna_drill`, `multi_topic_simulado`) e o
 * handoff proíbe nome de schema na tela: "ele lê 'saiu aqui', não
 * `risk_stratification`".
 */
const NOME_DO_TIPO: Record<string, string> = {
  diagnostic_kros: "diagnóstico",
  topic_practice: "prática por assunto",
  multi_topic_simulado: "simulado",
  adaptive_simulado: "simulado",
  dna_drill: "treino dirigido",
  review: "revisão",
  rest: "descanso",
};

function diasEntre(deISO: string, ateISO: string): number {
  const de = new Date(`${deISO}T00:00:00`);
  const ate = new Date(`${ateISO}T00:00:00`);
  if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) return 0;
  return Math.round((ate.getTime() - de.getTime()) / 86_400_000);
}

/** Os tipos dominantes, em ordem de peso, com no máximo dois nomes. */
function resumoDosTipos(atividades: StudyPlanActivity[]): string {
  const contagem = new Map<string, number>();
  for (const atividade of atividades) {
    if (atividade.kind === "rest") continue;
    const nome = NOME_DO_TIPO[atividade.kind] ?? "prática";
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  const ordenados = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  if (ordenados.length === 0) return "Só descanso.";
  // "Só revisão" e' uma frase do desenho, e ela so' vale quando e' verdade:
  // um tipo unico na janela inteira.
  if (ordenados.length === 1) {
    const [nome] = ordenados[0];
    return `Só ${nome}.`;
  }
  const [primeiro, segundo] = ordenados;
  return `${primeiro[0]} e ${segundo[0]}`.replace(/^./, (c) => c.toUpperCase()) + ".";
}

export function fasesDoPlano(
  atividades: StudyPlanActivity[],
  hojeISO: string,
  horizonteFimISO: string,
): FaseDoPlano[] {
  const ultimoDia = diasEntre(hojeISO, horizonteFimISO);

  return JANELAS.flatMap((janela) => {
    // A janela que comeca depois do horizonte nao existe. Caixa vazia seria
    // dizer que ha' plano onde nao ha'.
    if (janela.de > ultimoDia) return [];

    const daJanela = atividades.filter((atividade) => {
      if (!atividade.scheduled_date) return false;
      const offset = diasEntre(hojeISO, atividade.scheduled_date);
      return offset >= janela.de && offset <= janela.ate;
    });
    if (daJanela.length === 0) return [];

    const fim = Math.min(janela.ate, ultimoDia);
    return [
      {
        chave: janela.chave,
        rotulo: janela.rotulo,
        dias: Math.max(1, fim - janela.de + 1),
        atividades: daJanela.length,
        questoes: daJanela.reduce((s, a) => s + (a.estimated_questions ?? 0), 0),
        minutos: daJanela.reduce((s, a) => s + (a.estimated_minutes ?? 0), 0),
        resumo: resumoDosTipos(daJanela),
      },
    ];
  });
}

/**
 * Atividades que o motor não conseguiu encaixar na rotina.
 *
 * `scheduled_date` nulo com `unscheduled_reason` é o motor dizendo "não coube".
 * A tela precisa disso: um plano que esconde o que não coube promete um estudo
 * que a semana do aluno não comporta — e é exatamente a queixa que a Rotina
 * existe para resolver.
 */
export function naoCoube(atividades: StudyPlanActivity[]): StudyPlanActivity[] {
  return atividades.filter((atividade) => atividade.scheduled_date === null);
}
