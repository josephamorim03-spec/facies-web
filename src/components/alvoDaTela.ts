// ⚠️ RELATIVO E COM `.ts`, e não o alias `@/`. Este módulo é importado pelo
// runner (`node --test --experimental-strip-types`), que não lê os `paths` do
// tsconfig — com `@/lib/...` o teste morre em `ERR_MODULE_NOT_FOUND` antes de
// rodar. É a mesma forma que `components/facies/comparacaoDeProvas.ts` usa.
//
// Tudo entra como `import type`: o stripping apaga a linha inteira, então nem o
// cliente HTTP de `study-plan.ts` nem o `facies.json` de 1 MB que ele alcança
// por tipo são resolvidos aqui.
import type {
  StudentObjectiveV2,
  StudentTargetExamItem,
} from "../lib/api/domains/study-plan.ts";

/**
 * A ESCOLHA da prova-alvo, separada da tela que a desenha.
 *
 * ## Por que este arquivo existe
 *
 * `AlvoEContagem.tsx` decide três coisas que não são desenho: qual dos dois
 * contratos de objetivo vence, qual nome sai, e qual frase de prazo o estado da
 * data autoriza. Nenhuma delas tinha teste, porque JSX não passa pelo
 * `--experimental-strip-types` — um `.tsx` não é importável pelo runner de
 * unidade deste repositório.
 *
 * Era exatamente a lógica que já tinha falhado em silêncio: o componente lia só
 * o contrato v2, atrás de uma flag desligada, e a primeira linha do `/hoje`
 * ficava vazia para todo aluno que declarasse a prova. Um defeito de escolha de
 * fonte, invisível para typecheck e para lint.
 *
 * ## SÃO DOIS CONTRATOS, e a precedência não é arbitrária
 *
 *   `student-objectives-v2`   por EDITAL, atrás de `ENABLE_STUDENT_OBJECTIVES_V2`
 *   `student-target-exam-v1`  por BANCA, ligado por padrão
 *
 * O v2 vem primeiro quando resolve, porque só ele carrega data confirmada por
 * revisão editorial — é a única origem que pode escrever "63 dias" sem a
 * ressalva de estimativa. O v1 é o que existe hoje em produção.
 */
export type AlvoDaTela = {
  nome: string;
  dias: number | null;
  diasMin: number | null;
  diasMax: number | null;
  precisao: "exact" | "window" | null;
  /** A data é estimativa, e não edital. */
  prevista: boolean;
  /** A frase que explica o estado; vira `title`, sem gastar linha do chrome. */
  explicacao: string;
};

/** O objetivo canônico (por edital) como a tela o exibe. */
export function alvoDoObjetivoV2(
  objetivo: StudentObjectiveV2 | null | undefined,
): AlvoDaTela | null {
  const resolvido = objetivo?.resolved;
  if (!resolvido) return null;
  const nome = resolvido.destination.institution_name?.trim();
  if (!nome) return null;
  const data = resolvido.planning_date;
  return {
    nome,
    dias: data.days_remaining,
    diasMin: data.days_remaining_min,
    diasMax: data.days_remaining_max,
    precisao: data.precision,
    prevista: data.status === "estimated",
    explicacao: data.explanation || "",
  };
}

/**
 * A prova alvo declarada por banca como a tela a exibe.
 *
 * `label` é o rótulo da instituição — o backend passou a preferi-lo ao
 * `exam_name` justamente porque este consumidor precisa do nome que o aluno
 * reconhece, e não do qualificador opcional que ele digitou.
 */
export function alvoDaProvaAlvo(
  item: StudentTargetExamItem | null | undefined,
): AlvoDaTela | null {
  const nome = (item?.label || "").trim();
  if (!item || !nome) return null;
  return {
    nome,
    dias: item.days_remaining,
    // Este contrato não tem faixa: a data é um campo só, digitado ou herdado da
    // próxima aplicação conhecida. Inventar `min`/`max` aqui produziria "entre
    // X e Y dias" a partir de uma fonte que nunca deu intervalo.
    diasMin: null,
    diasMax: null,
    precisao: item.exam_date ? "exact" : null,
    // Sempre estimativa: `/objectives/target-exam` fixa `date_status` em
    // `estimated` na escrita, e é isso que o campo devolve.
    prevista: item.date_status !== "confirmed",
    explicacao: item.exam_date
      ? `Data informada por você: ${item.exam_date.split("-").reverse().join("/")}.`
      : "",
  };
}

/**
 * A FRASE de prazo, ou `null` quando não há prazo que se possa afirmar.
 *
 * Pura e exportada para poder ser testada: são quatro estados de contrato
 * caindo em três frases, e a regra que decide entre elas não é óbvia lendo o
 * JSX.
 */
export function textoDaContagem(alvo: AlvoDaTela): string | null {
  const { dias, diasMin: min, diasMax: max } = alvo;
  if (alvo.precisao === "window" && min !== null && max !== null && max > 0) {
    // A faixa se escreve como faixa. Nos casos em que ela colapsou num dia só,
    // escrever "entre 63 e 63 dias" seria pedantismo — sai o número.
    return min === max ? `${max} dias` : `entre ${min} e ${max} dias`;
  }
  // Prova que já passou com o objetivo ainda ativo é caso real: o aluno não
  // volta para apagar. "Faltam -4 dias" seria o pior jeito de dizer isso, então
  // a contagem simplesmente não sai e o nome fica.
  if (dias !== null && dias > 0) return `${dias} dias`;
  return null;
}

/**
 * O alvo PRINCIPAL é o ativo de menor `priority`.
 *
 * O artboard 8a diz "até três. A primeira é a principal: é o peso dela que
 * monta o seu dia", e o backend já sustenta isso (`MAX_TARGET_BOARDS = 3`, com
 * `priority` no objetivo).
 *
 * Ler por `priority` e não pela ordem do array: ordem de array é acidente de
 * serialização; prioridade é o campo que carrega a decisão do aluno.
 *
 * `status` filtra antes: um objetivo `retracted` ou `unavailable` continua na
 * lista — é assim que o aluno vê que ele existiu — mas não pode ser o alvo que
 * monta o dia.
 */
export function objetivoPrincipal(
  objetivos: StudentObjectiveV2[] | undefined,
): StudentObjectiveV2 | null {
  const ativos = (objetivos ?? []).filter((o) => o.status === "active" && o.resolved);
  if (ativos.length === 0) return null;
  return ativos.reduce((menor, atual) => (atual.priority < menor.priority ? atual : menor));
}

/**
 * A mesma regra de prioridade, para a declaração por banca.
 *
 * Não há `status` a filtrar aqui: este contrato só devolve o que o aluno
 * declarou, e uma banca que deixou de aplicar prova aparece com a situação ao
 * lado do nome no seletor — não como item inativo na lista.
 */
export function provaAlvoPrincipal(
  itens: StudentTargetExamItem[] | undefined,
): StudentTargetExamItem | null {
  const lista = [...(itens ?? [])];
  if (lista.length === 0) return null;
  return lista.reduce((menor, atual) => (atual.priority < menor.priority ? atual : menor));
}
