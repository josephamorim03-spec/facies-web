/**
 * O que a tela diz sobre a prova escolhida, antes de o aluno começar.
 *
 * Duas perguntas que ele tinha e a tela não respondia:
 *
 * **"Esta prova já aconteceu?"** — a fonte rotula pela TURMA: as questões da
 * "ENARE 2026" nasceram em 20/10/2025, porque o processo seletivo para ingresso
 * em 2026 é aplicado no fim de 2025. Medido em seis edições seguidas. Quem lê
 * "2026" entende "a prova deste ano" e se engana. Dizer *quando ela caiu*
 * desfaz a confusão sem renomear a edição — o rótulo continua batendo com o
 * edital e com os outros cursinhos.
 *
 * **"Está completa?"** — o aluno pedia "ENARE 2024" e recebia 95 de 100 sem
 * nada dizer que faltava. Agora recebe as 100, mas continuaria sem saber que
 * são 100.
 *
 * ⚠️ Função pura, e o `null` importa: **nada é afirmado sem evidência**. Sem
 * data, não há frase de data; sem denominador, o texto diz quantas questões há
 * e não "de quantas" — inventar o denominador seria pior que omiti-lo.
 */

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export type ResumoDaProva = {
  /** "aplicada em out/2025", ou `null` quando ninguém sabe. */
  quando: string | null;
  /** "100 questões · 5 anuladas", sempre presente. */
  tamanho: string;
  /** Só quando o acervo NÃO fecha o denominador. `null` = fecha, ou não há. */
  alerta: string | null;
};

export function resumoDaProva(edicao: {
  applied_on: string | null;
  declared_count: number | null;
  captured_count: number;
  annulled_count: number;
  completeness: string;
}): ResumoDaProva {
  const quando = mesEAno(edicao.applied_on);

  const partes: string[] = [];
  if (edicao.declared_count && edicao.completeness !== "over") {
    partes.push(`${edicao.declared_count} questões`);
  } else {
    partes.push(`${edicao.captured_count} questões`);
  }
  if (edicao.annulled_count > 0) {
    partes.push(
      `${edicao.annulled_count} ${edicao.annulled_count === 1 ? "anulada" : "anuladas"}`,
    );
  }

  return { quando, tamanho: partes.join(" · "), alerta: alertaDeFalta(edicao) };
}

/**
 * "out/2025" — a data curta o bastante para caber num chip de ano.
 *
 * Exportada porque o seletor de ano precisa dela ANTES de haver prova
 * escolhida: é ali, e não depois, que o aluno lê "2026" e entende "a prova
 * deste ano".
 */
export function mesEAnoCurto(iso: string | null): string | null {
  if (!iso) return null;
  // Fatiar o ISO em vez de `new Date`: `new Date("2025-10-20")` é UTC, e num
  // fuso a oeste vira 19/10 — a prova mudaria de dia, e às vezes de mês.
  const [ano, mes] = iso.split("-");
  const indice = Number(mes) - 1;
  if (!ano || !MESES[indice]) return null;
  return `${MESES[indice]}/${ano}`;
}

function mesEAno(iso: string | null): string | null {
  const curto = mesEAnoCurto(iso);
  return curto === null ? null : `aplicada em ${curto}`;
}

function alertaDeFalta(edicao: {
  declared_count: number | null;
  captured_count: number;
  completeness: string;
}): string | null {
  if (edicao.completeness !== "partial" || !edicao.declared_count) return null;
  const faltam = edicao.declared_count - edicao.captured_count;
  if (faltam <= 0) return null;
  // Dito ANTES de começar, e não descoberto no meio: o aluno decide se quer uma
  // prova incompleta sabendo disso.
  return `o acervo tem ${edicao.captured_count} das ${edicao.declared_count} — ${faltam} não ${faltam === 1 ? "foi capturada" : "foram capturadas"}`;
}
