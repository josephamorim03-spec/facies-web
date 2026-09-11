import type { ReactNode } from "react";

/**
 * O cabeçalho de um cartão de gráfico — a MESMA casca dos sete cartões da
 * Evolução (`app/evolucao/_components/Cartao.tsx`).
 *
 * ## Por que ele existe
 *
 * Os seis gráficos escreviam o próprio título à mão, e os seis escreviam-no
 * `<h2 className="font-medium">` — 22/500 em sans, um degrau que as 22
 * artboards não têm (elas pesam 600 a partir dos 19px, e a mono nunca pesa).
 * A tela de onde o aluno chega usa serifa em 600, e o subtítulo dela é o
 * rótulo em mono que diz **o que a medida é**. Duas telas, duas tipografias,
 * para o mesmo tipo de objeto.
 *
 * ## O rótulo em mono não é decoração
 *
 * É a procedência do número — "acerto por semana", "primeira tentativa". Os
 * gráficos diziam isto numa frase em sans ("Acurácia diagnóstica acumulada
 * pela primeira tentativa"), que é prosa a explicar um eixo. O sistema já tem
 * o lugar dessa informação, e ele é `paper-eyebrow`.
 *
 * ⚠️ Sem classe de TAMANHO no `h2`: a escala do app vive em `.tela-app h2`
 * (`globals.css`), com especificidade (0,2,1) — qualquer `text-*` aqui seria
 * uma classe que o navegador ignora. Ver `scripts/check-escala-viva.mjs`.
 */
export function CabecalhoDoGrafico({
  titulo,
  medida,
  acao,
}: {
  titulo: string;
  /** O que a medida é, em mono. */
  medida?: string;
  /** O controlo que troca a visão deste gráfico, à direita do título. */
  acao?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-serif font-semibold text-ink">{titulo}</h2>
        {medida ? <p className="paper-eyebrow mt-1">{medida}</p> : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
