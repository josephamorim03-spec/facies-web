import { Skeleton } from "@/components/Skeleton";
import type { QuestionBankPerformance } from "@/lib/api";

type KrosBaselineProps = {
  performance: QuestionBankPerformance | null;
  loading: boolean;
};

/**
 * Linha de base do aluno: a unica metrica que muda a decisao desta tela (fazer
 * 50 ou 100 questoes).
 *
 * Era um bloco `surface-cozy` com anel de 84px. Virou uma regua `border-y`, no
 * mesmo idioma do `TodayLoadNote` -- um numero so nao justifica a geometria de
 * heroi, e a caixa arredondada era parte do que fazia esta pagina destoar do
 * resto do produto.
 */
export function KrosBaseline({ performance, loading }: KrosBaselineProps) {
  if (loading) {
    return (
      <section className="border-y border-edge py-4" aria-label="Carregando sua linha de base">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3.5 w-36 rounded-control" />
          <Skeleton className="h-3 w-52 rounded-control" />
        </div>
      </section>
    );
  }

  const accuracy = performance?.first_attempt_accuracy;

  if (accuracy == null) {
    return (
      <section className="border-y border-edge py-4" aria-label="Linha de base">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-ink">Ainda sem linha de base</p>
          <p className="text-xs text-muted">O primeiro Kros estabelece a sua.</p>
        </div>
      </section>
    );
  }

  const pct = Math.round(accuracy * 100);

  return (
    <section className="border-y border-edge py-4" aria-label="Linha de base">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink">Sua linha de base</p>
        <p className="text-xs text-muted">
          <span className="font-semibold tabular-nums text-ink">{pct}%</span> de acerto na primeira
          tentativa
        </p>
      </div>
    </section>
  );
}
