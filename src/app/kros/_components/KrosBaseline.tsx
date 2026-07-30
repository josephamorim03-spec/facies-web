import { ProgressRing } from "@/components/ui/ProgressRing";
import { Skeleton } from "@/components/Skeleton";
import type { QuestionBankPerformance } from "@/lib/api";

type KrosBaselineProps = {
  performance: QuestionBankPerformance | null;
  loading: boolean;
};

/**
 * Linha de base do aluno. Antes era um parágrafo solto; virou o número que
 * importa em um anel, porque é a única métrica que muda a decisão nesta tela
 * (fazer 50 ou 100 questões).
 */
export function KrosBaseline({ performance, loading }: KrosBaselineProps) {
  if (loading) {
    return (
      <div className="surface-cozy flex items-center gap-4 p-4">
        <Skeleton className="h-[84px] w-[84px] rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24 rounded-control" />
          <Skeleton className="h-3 w-full rounded-control" />
        </div>
      </div>
    );
  }

  const accuracy = performance?.first_attempt_accuracy;

  if (accuracy == null) {
    return (
      <div className="surface-cozy p-4">
        <p className="text-sm font-semibold text-ink">Ainda sem linha de base</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          O primeiro Kros estabelece a sua.
        </p>
      </div>
    );
  }

  const pct = Math.round(accuracy * 100);

  return (
    <div className="surface-cozy flex items-center gap-4 p-4">
      <ProgressRing
        pct={pct}
        size={84}
        strokeWidth={7}
        color="var(--color-primary)"
        trackColor="var(--color-edge)"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Sua linha de base</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {pct}% de acerto na primeira tentativa.
        </p>
      </div>
    </div>
  );
}
