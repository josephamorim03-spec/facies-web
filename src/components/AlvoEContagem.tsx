import type { StudentObjectiveV2 } from "@/lib/api/domains/study-plan";

/**
 * A prova-alvo e quantos dias faltam — o `UNIFESP · 63 dias` do projeto de
 * design.
 *
 * Aparece nos artboards 8b (Hoje), 9b (Evolução), 9c (Plano) e 13e (dia
 * começado). É elemento recorrente, não barra fixa: cada tela o coloca onde o
 * desenho o põe, e por isso é um componente e não parte do `AppShell`.
 *
 * ## A CONTA VEM DO SERVIDOR, e é de propósito
 *
 * `ObjectivePlanningDateV2` já traz `days_remaining` resolvido. Calcular aqui
 * seria reimplementar — e reimplementar contagem de dias é como se ganha uma
 * divergência de um dia entre a tela e o plano, nas bordas de fuso e horário de
 * verão, que ninguém reproduz e todo mundo vê.
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
 * `explanation` vem pronta do servidor e é a frase que explica o estado; ela
 * entra como `title` para quem quiser o porquê, sem gastar a linha do chrome.
 */
export function AlvoEContagem({
  objetivo,
  className = "",
}: {
  objetivo: StudentObjectiveV2 | null | undefined;
  className?: string;
}) {
  const resolvido = objetivo?.resolved;
  if (!resolvido) return null;

  const nome = resolvido.destination.institution_name?.trim();
  if (!nome) return null;

  const data = resolvido.planning_date;
  const dias = data.days_remaining;
  const min = data.days_remaining_min;
  const max = data.days_remaining_max;

  let contagem: string | null = null;
  if (data.precision === "window" && min !== null && max !== null && max > 0) {
    // A faixa se escreve como faixa. Nos casos em que ela colapsou num dia só,
    // escrever "entre 63 e 63 dias" seria pedantismo — sai o número.
    contagem = min === max ? `${max} dias` : `entre ${min} e ${max} dias`;
  } else if (dias !== null && dias > 0) {
    contagem = `${dias} dias`;
  }

  // Prova que já passou com o objetivo ainda ativo é caso real: o aluno não
  // volta para apagar. "Faltam -4 dias" seria o pior jeito de dizer isso, então
  // a contagem simplesmente não sai e o nome fica.
  const prevista = data.status === "estimated";

  return (
    <p className={`paper-eyebrow ${className}`.trim()} title={data.explanation || undefined}>
      <span className="text-ink">{nome}</span>
      {contagem ? (
        <>
          {" · "}
          <span className="font-mono text-ink">{contagem}</span>
          {prevista ? ", data prevista" : ""}
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
