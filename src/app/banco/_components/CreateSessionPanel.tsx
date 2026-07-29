"use client";

import type { ReactNode } from "react";
import type { QuestionBankAvailability, QuestionBankResolutionMode, StudyKind } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

function availabilityText(availability: QuestionBankAvailability | null): string {
  if (!availability) return "Calculando";
  if (availability.answer_status === "answered") return `${availability.answered_count} já realizadas`;
  if (availability.answer_status === "wrong") return `${availability.available_count} erros disponíveis`;
  if (availability.answer_status === "correct") return `${availability.available_count} acertos disponíveis`;
  if (availability.answer_status === "all") return `${availability.total_count} questões encontradas`;
  return `${availability.available_count} questões disponíveis`;
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 3h6l1 2h3v16H5V5h3l1-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3 19h18" />
    </svg>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-edge py-3 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-surfaceMuted text-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-base font-semibold leading-tight text-ink">{value}</p>
        {detail && <p className="mt-0.5 truncate text-xs text-muted">{detail}</p>}
      </div>
    </div>
  );
}

type CreateSessionPanelProps = {
  availability: QuestionBankAvailability | null;
  loadingPreview: boolean;
  busy: boolean;
  clampedLimit: number;
  resolutionMode: QuestionBankResolutionMode;
  studyKind: StudyKind;
  canStartSession?: boolean;
  error?: string | null;
  onRefreshAvailability: () => void;
  onPreviewQuestions: () => void;
  onRetry?: () => void;
};

export default function CreateSessionPanel({
  availability,
  loadingPreview,
  busy,
  clampedLimit,
  resolutionMode,
  studyKind,
  canStartSession = true,
  error,
  onRefreshAvailability,
  onPreviewQuestions,
  onRetry,
}: CreateSessionPanelProps) {
  const canStart = !busy && canStartSession && !!availability && availability.available_count > 0;
  const estimatedMinutes = Math.max(10, Math.ceil(clampedLimit * (resolutionMode === "simulation" || studyKind === "full_exam" ? 1.5 : 2)));
  const modeLabel = resolutionMode === "simulation" ? "Correção pós-resultado" : "Correção imediata";
  const displayModeLabel = studyKind === "full_exam" ? "Prova institucional" : modeLabel;
  const distribution = availability
    ? `${availability.unanswered_count} novas · ${availability.answered_count} respondidas`
    : "Aguardando filtros";

  return (
    <aside className="border-y border-edge py-4 lg:sticky lg:top-6 lg:self-start lg:border-y-0 lg:border-l lg:py-0 lg:pl-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sessão configurada</p>
          <h2 className="mt-1 font-serif text-xl font-semibold leading-tight">Resumo</h2>
          <p className="mt-1 text-sm text-muted" aria-live="polite">{loadingPreview ? "Atualizando prévia..." : availabilityText(availability)}</p>
        </div>
        <Button type="button" variant="secondary" size="xs" onClick={onRefreshAvailability} disabled={loadingPreview || busy}>
          Recalcular
        </Button>
      </div>

      <div className="mt-4 space-y-2.5">
        <SummaryRow
          icon={<IconClipboard className="h-5 w-5" />}
          label="Número de questões"
          value={String(clampedLimit)}
          detail={availability ? `${availability.total_count} no filtro` : undefined}
        />
        <SummaryRow
          icon={<IconClock className="h-5 w-5" />}
          label="Tempo estimado"
          value={`${estimatedMinutes} min`}
          detail={displayModeLabel}
        />
        <SummaryRow
          icon={<IconChart className="h-5 w-5" />}
          label="Distribuição"
          value={distribution}
          detail={availability?.answer_status === "wrong" ? "Foco em erros recentes" : "Atualiza conforme os filtros"}
        />
      </div>

      {error && (
        <Alert
          variant="danger"
          className="mt-4"
          action={
            onRetry ? (
              <button type="button" onClick={onRetry} className="text-xs font-semibold text-danger underline">
                Tentar novamente
              </button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}

      <div className="mt-4">
        <Button type="button" variant="secondary" size="md" onClick={onPreviewQuestions} disabled={busy || !canStart} className="w-full">
          Ver prévia
        </Button>
      </div>
    </aside>
  );
}
