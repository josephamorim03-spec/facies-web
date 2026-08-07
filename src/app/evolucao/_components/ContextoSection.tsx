"use client";

import { useQuery } from "@tanstack/react-query";

import { getStudentEvolution, type EvolutionAssociation } from "@/lib/api/domains/evolution";
import { useAuthToken } from "@/lib/useAuthToken";
import { Alert } from "@/components/ui/Alert";

const ROUTINE_LABELS: Record<string, string> = {
  sleep_minutes: "Sono",
  sleep_quality: "Qualidade do sono",
  energy: "Energia",
  on_call: "Plantão",
};

const OUTCOME_LABELS: Record<string, string> = {
  observed_study_minutes: "minutos estudados",
  first_attempt_accuracy_pct: "acerto na primeira tentativa",
  calibration_gap_pct: "calibração",
};

function formatMinutes(value: number | null): string {
  if (value == null) return "—";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}

function formatSleep(value: number | null): string {
  return value == null ? "—" : formatMinutes(Math.round(value));
}

/**
 * A leitura de uma associação, em português e sem causalidade.
 *
 * Nunca mostra o valor pontual: só o intervalo, e só quando a amostra existe.
 * Abaixo do piso, diz quantos dias faltam — um número provisório seria lido como
 * conclusão.
 */
function AssociationRow({ item }: { item: EvolutionAssociation }) {
  const routine = ROUTINE_LABELS[item.routine_metric] ?? item.routine_metric;
  const outcome = OUTCOME_LABELS[item.outcome_metric] ?? item.outcome_metric;

  if (item.ci_low == null || item.ci_high == null) {
    return (
      <div className="py-4">
        <p className="text-sm font-semibold text-ink">
          {routine} e {outcome}
        </p>
        <p className="mt-1 text-sm text-muted">
          Faltam {item.days_missing} {item.days_missing === 1 ? "dia" : "dias"} com os
          dois registros para esta leitura existir.
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <p className="text-sm font-semibold text-ink">
        {routine} e {outcome}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted">
        Em {item.n} dias, a associação observada fica entre{" "}
        <span className="tabular-nums text-ink">{item.ci_low.toFixed(2)}</span> e{" "}
        <span className="tabular-nums text-ink">{item.ci_high.toFixed(2)}</span>.{" "}
        {item.conclusive
          ? "O intervalo inteiro fica de um lado do zero."
          : "O intervalo passa pelo zero — não dá para separar de acaso."}
      </p>
      {item.bands.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {item.bands.map((band) => (
            <li key={band.label}>
              {band.label === "menor_volume" ? "Dias de menor volume" : "Dias de maior volume"}
              {": "}
              {band.ci_low == null || band.ci_high == null
                ? "sem leitura"
                : `${band.ci_low.toFixed(2)} a ${band.ci_high.toFixed(2)}`}{" "}
              ({band.n} dias)
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ContextoSection({ range }: { range: string }) {
  const { token, tokenResolved } = useAuthToken();
  const query = useQuery({
    queryKey: ["student", "evolution", range],
    queryFn: () => getStudentEvolution(token, range),
    enabled: tokenResolved,
  });

  if (!tokenResolved || query.isPending) {
    return <div className="h-64 animate-pulse rounded-xl border border-edge bg-surface" />;
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="danger" className="mt-5">
        Não foi possível carregar seu contexto de rotina agora. Tente novamente em instantes.
      </Alert>
    );
  }

  const { points, associations } = query.data;
  const withData = points.filter((point) => point.covered_days > 0);

  if (withData.length === 0) {
    return (
      <div className="py-8">
        <h2 className="text-lg font-semibold text-ink">Ainda sem contexto registrado</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Registre como foi o dia — sono, energia e plantão — e esta aba passa a
          comparar sua rotina com o que você de fato estudou. O registro é opcional
          e leva alguns segundos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-5">
      <section aria-labelledby="contexto-serie-title">
        <h2 id="contexto-serie-title" className="text-lg font-semibold text-ink">
          Rotina e estudo lado a lado
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cada linha mostra também em quantos dias houve registro — uma semana com
          um dia medido não é uma semana fraca.
        </p>

        {/* Tabela é a apresentação, não uma alternativa escondida: com poucos
            baldes ela é mais legível que um gráfico, e é lida por leitor de tela
            sem precisar de espelho `sr-only`. */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Rotina e minutos estudados por período, com cobertura de registro
            </caption>
            <thead>
              <tr className="border-b border-edge text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Período</th>
                <th scope="col" className="py-2 pr-3 font-medium">Estudo</th>
                <th scope="col" className="py-2 pr-3 font-medium">Sono</th>
                <th scope="col" className="py-2 pr-3 font-medium">Energia</th>
                <th scope="col" className="py-2 pr-3 font-medium">Plantões</th>
                <th scope="col" className="py-2 font-medium">Dias com registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {withData.map((point) => (
                <tr key={point.bucket}>
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                    {point.bucket}
                  </th>
                  <td className="py-2 pr-3 tabular-nums text-ink">
                    {formatMinutes(point.observed_minutes)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-muted">
                    {formatSleep(point.sleep_minutes)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-muted">
                    {point.energy == null ? "—" : point.energy.toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-muted">{point.on_call_days}</td>
                  <td className="py-2 tabular-nums text-muted">{point.covered_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {associations.length > 0 ? (
        <section aria-labelledby="contexto-assoc-title">
          <h2 id="contexto-assoc-title" className="text-lg font-semibold text-ink">
            O que os seus dados sugerem
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            São associações observadas nos seus registros, não causas. Um intervalo
            que passa pelo zero significa que a amostra não separa o efeito do
            acaso — e mesmo um intervalo que não passa não diz o que causa o quê.
          </p>
          <div className="mt-2 divide-y divide-edge">
            {associations.map((item) => (
              <AssociationRow
                key={`${item.routine_metric}-${item.outcome_metric}`}
                item={item}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
