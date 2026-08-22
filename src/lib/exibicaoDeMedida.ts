/**
 * §13.3 — o que nunca vira número na tela.
 *
 * A regra já existia, e só do lado público: `facies.ts` tem `PISO_N_CELULA` e
 * cada linha do dataset carrega `exibivel: boolean`. No app do aluno não havia
 * equivalente, e a consequência era literal — `/evolucao` filtrava
 * `questions_seen > 0`, então **uma** questão bastava para a tela anunciar
 * "Melhor área: 100%" ou "Área a observar: 0%".
 *
 * Um percentual sobre n=1 não é uma medida imprecisa; é uma medida que não
 * existe. Exibi-lo é pior que omiti-lo, porque o aluno não tem como saber que o
 * denominador é 1 e vai estudar contra ruído.
 *
 * Três distinções que este módulo mantém separadas, e que a tela colapsava:
 *
 * 1. **Não avaliado** — nunca respondeu nada aqui. Não é zero.
 * 2. **Sem base suficiente** — respondeu, mas abaixo do piso. O que se mostra é
 *    a CONTAGEM ("3 de 5 respostas"), nunca a taxa.
 * 3. **Medido** — o percentual, com o n ao lado.
 *
 * O piso é 5, e não foi escolhido aqui: é o mesmo `piso_n_celula` do dataset
 * público, o mesmo `PRIOR_STRENGTH` do Beta-Binomial de `mastery_estimate.py` e
 * o mesmo `MIN_EXPOSURE_FOR_DEDICATED_ACTIVITY` do plano. Três derivações
 * independentes convergiram no mesmo número; mudar aqui sem mudar lá faria a
 * mesma célula ser exibível numa tela e não noutra.
 */
export const PISO_N_CELULA = 5;

export type Medida =
  | { estado: "nao_avaliado" }
  | { estado: "sem_base"; n: number }
  | { estado: "medido"; n: number; fracao: number };

/**
 * Classifica uma célula antes de qualquer formatação.
 *
 * `taxa` é a fração 0..1 já calculada pelo servidor; `n` é o denominador. Ela
 * existe para o sítio não poder pular a decisão: chamar `formatar` sem passar
 * por aqui é o que produzia "100% · 1 questão".
 */
export function classificar(taxa: number | null | undefined, n: number | null | undefined): Medida {
  const total = Math.max(0, Math.trunc(n ?? 0));
  if (total === 0 || taxa == null || Number.isNaN(taxa)) return { estado: "nao_avaliado" };
  if (total < PISO_N_CELULA) return { estado: "sem_base", n: total };
  return { estado: "medido", n: total, fracao: taxa };
}

/** O valor de destaque. Só é percentual quando há base. */
export function valorDaMedida(medida: Medida): string {
  switch (medida.estado) {
    case "nao_avaliado":
      // NÃO é "0%". Zero é um resultado; isto é a ausência de resultado, e a
      // tela que escreve "0%" aqui acusa o aluno de errar o que ele não tentou.
      return "Não avaliado";
    case "sem_base":
      return `${medida.n} de ${PISO_N_CELULA}`;
    case "medido":
      return `${Math.round(medida.fracao * 100)}%`;
  }
}

/** A linha de baixo: o denominador, sempre, porque taxa sem n não é medida. */
export function baseDaMedida(medida: Medida, unidade = "questões"): string {
  switch (medida.estado) {
    case "nao_avaliado":
      return `Sem ${unidade} respondidas`;
    case "sem_base":
      return `Base insuficiente — ${PISO_N_CELULA} ${unidade} é o mínimo`;
    case "medido":
      return `${medida.n} ${unidade}`;
  }
}

/** `true` quando a célula pode entrar em comparação (melhor/pior, ordenação). */
export function comparavel(medida: Medida): medida is { estado: "medido"; n: number; fracao: number } {
  return medida.estado === "medido";
}
