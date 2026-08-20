import { Skeleton } from "@/components/Skeleton";
import type { AnalyzeSimulationErrorsProgressiveStatusItem } from "@/lib/api";

import { normalizeAnalysis } from "../_lib/resultadosHelpers";

type ProgressivePendingListProps = {
  items: AnalyzeSimulationErrorsProgressiveStatusItem[];
  onGoToCorrection: (questionId: string) => void;
};

function PendingSkeletonBlock(props: { title: string; lines?: number }) {
  const { title, lines = 3 } = props;
  return (
    <div className="border border-edge p-2 space-y-2">
      <p className="text-xs uppercase tracking-wide text-ink">{title}</p>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={`${title}_${index}`}
            className={`h-4 ${index === lines - 1 ? "w-8/12" : index === 0 ? "w-11/12" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ProgressivePendingList(props: ProgressivePendingListProps) {
  const { items, onGoToCorrection } = props;
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const normalized = item.analysis ? normalizeAnalysis(item.analysis) : null;
        return (
          <div key={`progressive_${item.record_id}_${item.question_id}`} id={`analysis-${item.question_id}`} className="border border-edge p-3 space-y-3 scroll-mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onGoToCorrection(item.question_id)}
                className="text-sm font-medium underline text-left text-ink"
              >
                Q{item.question_id.split("_q").pop()}
              </button>
              <span className="text-xs border px-2 py-0.5 border-warning bg-surfaceMuted text-warning">
                Em processamento
              </span>
            </div>

            {item.stage === "analysis_ready" && normalized ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {normalized.essence && (
                    <div className="border border-edge p-2">
                      <p className="text-xs uppercase tracking-wide text-ink">Essencia</p>
                      <p className="mt-1 text-xs break-words [overflow-wrap:anywhere] text-ink">{normalized.essence}</p>
                    </div>
                  )}
                  {normalized.mainClue && (
                    <div className="border border-edge p-2">
                      <p className="text-xs uppercase tracking-wide text-ink">Pista principal</p>
                      <p className="mt-1 text-xs break-words [overflow-wrap:anywhere] text-ink">{normalized.mainClue}</p>
                    </div>
                  )}
                  {normalized.killerDetail && (
                    <div className="border border-edge p-2">
                      <p className="text-xs uppercase tracking-wide text-ink">Detalhe decisivo</p>
                      <p className="mt-1 text-xs break-words [overflow-wrap:anywhere] text-ink">{normalized.killerDetail}</p>
                    </div>
                  )}
                </div>
                {(normalized.microDrillPrompt || normalized.microDrillAnswer) && (
                  <div className="border border-edge p-2 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-ink">Micro treino</p>
                    {normalized.microDrillPrompt && (
                      <p className="text-xs break-words [overflow-wrap:anywhere] text-ink"><strong>Pergunta:</strong> {normalized.microDrillPrompt}</p>
                    )}
                    {normalized.microDrillAnswer && (
                      <p className="text-xs break-words [overflow-wrap:anywhere] text-ink"><strong>Gabarito:</strong> {normalized.microDrillAnswer}</p>
                    )}
                  </div>
                )}
                <PendingSkeletonBlock title="Flashcards em montagem" />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <PendingSkeletonBlock title="Lendo a questão" />
                <PendingSkeletonBlock title="Montando a análise" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
