import type {
  StudentObjectiveV2,
  StudentTargetExamItem,
} from "@/lib/api/domains/study-plan";

/**
 * A prova-alvo e quantos dias faltam — o `UNIFESP · 63 dias` do projeto de
 * design.
 *
 * Aparece nos artboards 8b (Hoje), 9b (Evolução), 9c (Plano) e 13e (dia
 * começado). É elemento recorrente, não barra fixa: cada tela o coloca onde o
 * desenho o põe, e por isso é um componente e não parte do `AppShell`.
 *
 * ## ⚠️ SÃO DOIS CONTRATOS, e ler só um deixava a linha SEMPRE VAZIA
 *
 * Este componente lia exclusivamente `StudentObjectiveV2`, de
 * `/objectives/v2/mine` — rota atrás de `ENABLE_STUDENT_OBJECTIVES_V2`, que
 * `.env.example` declara `false` e ninguém ligou. Com a flag desligada a rota
 * responde **404**, `items` nunca chega, e a primeira linha do Hoje ficava em
 * branco para todo aluno, inclusive para quem tinha acabado de declarar a prova.
 *
 * O caminho que de fato funciona é `student-target-exam-v1`
 * (`/objectives/target-exam`), ligado por padrão: é ele que o
 * `TargetExamSelector` escreve, e é dele que `/mapa` e a `FaixaDaProva` já
 * liam. Por isso os dois adaptadores abaixo — o v2 continua tendo precedência
 * quando existe, porque só ele carrega data de EDITAL.
 *
 * ## A CONTA VEM DO SERVIDOR, e é de propósito
 *
 * Os dois contratos trazem os dias já resolvidos (`days_remaining`). Calcular
 * aqui seria reimplementar — e reimplementar contagem de dias é como se ganha
 * uma divergência de um dia entre a tela e o plano, nas bordas de fuso e
 * horário de verão, que ninguém reproduz e todo mundo vê.
 *
 * ## O DESENHO MOSTRA "63 DIAS" SECO, E O CONTRATO TEM QUATRO ESTADOS
 *
 * O artboard tem um aluno com uma data certa. O contrato real não:
 *
 *   confirmed + exact   a data saiu no edital        → "63 dias"
 *   estimated + exact   é o calendário provável      → "63 dias, data prevista"
 *   precision: window   a banca deu uma FAIXA        → "entre 58 e 72 dias"
 *   not_published       ainda não há data            → só o nome
 *
 * A faixa é o estado que o desenho mais deixa de fora, e é o mais fácil de
 * errar: espremer `window_start..window_end` num número só é inventar precisão
 * que a fonte não tem — exatamente o que o piso de célula e o limiar de 3
 * pontos existem para impedir no resto do produto.
 *
 * A declaração por banca nunca produz os dois primeiros estados: ela é sempre
 * `estimated`, porque o aluno não é autoridade editorial sobre a data da prova
 * dele. "Data prevista" ali não é ressalva decorativa — é a única coisa que o
 * produto pode honestamente afirmar sobre uma data digitada por quem estuda.
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

export function AlvoEContagem({
  alvo,
  className = "",
}: {
  alvo: AlvoDaTela | null | undefined;
  className?: string;
}) {
  if (!alvo) return null;

  const { dias, diasMin: min, diasMax: max } = alvo;

  let contagem: string | null = null;
  if (alvo.precisao === "window" && min !== null && max !== null && max > 0) {
    // A faixa se escreve como faixa. Nos casos em que ela colapsou num dia só,
    // escrever "entre 63 e 63 dias" seria pedantismo — sai o número.
    contagem = min === max ? `${max} dias` : `entre ${min} e ${max} dias`;
  } else if (dias !== null && dias > 0) {
    contagem = `${dias} dias`;
  }

  // Prova que já passou com o objetivo ainda ativo é caso real: o aluno não
  // volta para apagar. "Faltam -4 dias" seria o pior jeito de dizer isso, então
  // a contagem simplesmente não sai e o nome fica.
  return (
    <p className={`paper-eyebrow ${className}`.trim()} title={alvo.explicacao || undefined}>
      <span className="text-ink">{alvo.nome}</span>
      {contagem ? (
        <>
          {" · "}
          <span className="font-mono text-ink">{contagem}</span>
          {alvo.prevista ? ", data prevista" : ""}
        </>
      ) : null}
    </p>
  );
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
