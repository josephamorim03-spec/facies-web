"use client";

import type { ReactNode } from "react";
import type { QuestionBankAvailability, QuestionBankResolutionMode } from "@/lib/api";

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

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10h12" />
      <path d="m11 5 5 5-5 5" />
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
    <div className="flex items-center gap-4 rounded-lg border border-edge bg-surface px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold leading-tight text-ink">{value}</p>
        {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
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
  onRefreshAvailability: () => void;
  onPreviewQuestions: () => void;
  onStartSession: () => void;
};

export default function CreateSessionPanel({
  availability,
  loadingPreview,
  busy,
  clampedLimit,
  resolutionMode,
  onRefreshAvailability,
  onPreviewQuestions,
  onStartSession,
}: CreateSessionPanelProps) {
  const startLabel = resolutionMode === "training" ? "Iniciar treino" : "Iniciar simulado";
  const canStart = !busy && !!availability && availability.available_count > 0;
  const estimatedMinutes = Math.max(10, Math.ceil(clampedLimit * (resolutionMode === "simulation" ? 1.5 : 2)));
  const modeLabel = resolutionMode === "simulation" ? "Correção ao final" : "Correção item a item";
  const distribution = availability
    ? `${availability.unanswered_count} novas · ${availability.answered_count} vistas`
    : "Aguardando filtros";

  return (
    <aside className="km-card rounded-lg p-5 lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold leading-tight">Resumo da sessão</h2>
          <p className="mt-1 text-sm text-muted">{loadingPreview ? "Atualizando prévia..." : availabilityText(availability)}</p>
        </div>
        <button
          type="button"
          onClick={onRefreshAvailability}
          disabled={loadingPreview || busy}
          className="rounded-lg border border-edge px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-ink disabled:opacity-50"
        >
          Recalcular
        </button>
      </div>

      <div className="mt-5 space-y-3">
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
          detail={modeLabel}
        />
        <SummaryRow
          icon={<IconChart className="h-5 w-5" />}
          label="Distribuição"
          value={distribution}
          detail={availability?.answer_status === "wrong" ? "Foco em erros recentes" : "Atualiza conforme os filtros"}
        />
      </div>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={onStartSession}
          disabled={busy || !canStart}
          className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? "Preparando..." : startLabel}
          <IconArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onPreviewQuestions}
          disabled={busy || !canStart}
          className="rounded-lg border border-edge bg-surface px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary disabled:opacity-50"
        >
          Ver prévia
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-muted">
        <IconShield className="h-5 w-5 shrink-0 text-success" />
        <span>Sua sessão será salva automaticamente ao finalizar.</span>
      </div>
    </aside>
  );
}
