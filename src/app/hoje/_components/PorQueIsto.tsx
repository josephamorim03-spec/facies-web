import type { StudentTodayExplanation } from "@/lib/api";

/**
 * Os números por trás da recomendação, abertos a pedido.
 *
 * ## Por que existe
 *
 * A constituição do produto exige que "toda recomendação diga o que foi
 * recomendado e por quê", e que "a incerteza seja representada". O herói mostra
 * a frase; até aqui não havia onde ver o que a sustenta — `factors`,
 * `selected_because` e a razão da confiança eram calculados a cada visita e
 * descartados em `student_experience._trainer_action`.
 *
 * ## A forma é emprestada, não inventada
 *
 * Mesmo `<details>` do `TodayDimensioning`: fechado por padrão, uma linha de
 * resumo tocável, e a conta por dentro. Duas gramáticas diferentes para "abrir a
 * conta" na mesma tela seriam duas coisas para o aluno aprender.
 *
 * ## Duas regras que este componente não pode quebrar
 *
 * 1. **O significado é texto visível, nunca `title=`.** O alvo do produto é
 *    celular, e `title` não existe em toque — foi assim que a ressalva do piso
 *    de evidência ficou invisível na Evolução.
 * 2. **Nada é remontado aqui.** Rótulo, valor formatado e significado vêm
 *    prontos do servidor. O cliente não sabe se `0.62` é razão ou contagem, e
 *    adivinhar errado publica um número falso.
 */
export function PorQueIsto({ explanation }: { explanation: StudentTodayExplanation }) {
  const { factors, selected_because: motivos, confidence_label, confidence_reason } = explanation;
  if (factors.length === 0 && motivos.length === 0 && !confidence_label) return null;

  return (
    <details className="group mt-4 border-t border-edge">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm text-muted">
        <span>Por que isto</span>
        <span className="shrink-0 transition group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>

      <div className="border-t border-edge py-3 text-xs">
        {motivos.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-ink">
            {motivos.map((motivo) => (
              <li key={motivo} className="flex gap-2">
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
                <span>{motivo}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {factors.length > 0 ? (
          <dl className="mt-3 flex flex-col divide-y divide-rule border-t border-rule">
            {factors.map((fator) => (
              <div key={fator.key} className="flex flex-col gap-0.5 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink">{fator.label}</dt>
                  <dd className="m-0 font-mono tabular-nums text-ink">{fator.value}</dd>
                </div>
                {/* O significado ao lado do número é o ponto do componente: número
                    sem unidade e sem leitura é exatamente o que a tela já fazia. */}
                <p className="m-0 text-micro leading-5 text-muted">{fator.meaning}</p>
              </div>
            ))}
          </dl>
        ) : null}

        {confidence_label ? (
          <p className="mt-3 text-micro leading-5 text-muted">
            {confidence_label}
            {confidence_reason ? ` — ${confidence_reason}` : ""}
          </p>
        ) : null}
      </div>
    </details>
  );
}
