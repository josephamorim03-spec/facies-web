/**
 * A manchete do Hoje — a única linha que responde "dá tempo agora?".
 *
 * Dois estados, dois artboards:
 *
 * - `8b`, dia intocado: "Hoje são 24 questões, cerca de 35 minutos".
 * - `13e`, dia começado: "Faltam 16 das 24 de hoje".
 *
 * A inversão é deliberada. Com o dia em curso, o que já foi feito é consolo e o
 * que falta é decisão — e é a decisão que merece a linha mais valiosa da tela.
 *
 * A regra que atravessa os dois: **degradar em vez de mentir**. Sem número para
 * uma das pontas, a frase encolhe; sem número nenhum, ela some e a tela abre na
 * ação principal, que é o que ela tem a dizer. Número inventado para completar
 * a frase seria pior que frase curta.
 */
export function manchetteDoDia({
  questoesDoDia,
  respondidasHoje,
  minutosDoDia,
  temSessaoAberta,
}: {
  /** Questões planejadas para hoje, somando todos os blocos. */
  questoesDoDia: number;
  /** Questões já respondidas hoje. */
  respondidasHoje: number;
  /** Estimativa de minutos do dia. */
  minutosDoDia: number;
  /** Há sessão em andamento, mesmo sem nenhuma resposta ainda. */
  temSessaoAberta: boolean;
}): string | null {
  const comecado = respondidasHoje > 0 || temSessaoAberta;
  const faltam = Math.max(0, questoesDoDia - respondidasHoje);

  if (comecado && questoesDoDia > 0) {
    // ⚠️ "Faltam 0 das 24" nao e' uma frase que alguem escreveria. Dia
    // cumprido tem manchete propria — e ela NAO comemora com exagero: o
    // produto registra o feito, nao premia.
    return faltam > 0
      ? `Faltam ${faltam} ${faltam === 1 ? "questão" : "questões"} das ${questoesDoDia} de hoje`
      : "Você fechou o dia";
  }

  const q =
    questoesDoDia > 0
      ? `${questoesDoDia} ${questoesDoDia === 1 ? "questão" : "questões"}`
      : null;
  // "cerca de" nao e' enfeite: `estimated_minutes` e' estimativa, e anunciar
  // "35 minutos" seco seria decreto com cara de dado.
  const m = minutosDoDia > 0 ? `cerca de ${minutosDoDia} minutos` : null;

  if (q && m) return `Hoje são ${q}, ${m}`;
  if (q) return `Hoje são ${q}`;
  if (m) return `Hoje, ${m}`;
  return null;
}
