"use client";

import type { ReactNode } from "react";

import { LoadBar } from "@/components/ui/LoadBar";
import type { QuestionBankAvailability, StudyKind } from "@/lib/api";
import { CORRECTION_MODE_LABEL, type CorrectionMode } from "../_lib/sessionBuilder";
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M9 3h6l1 2h3v16H5V5h3l1-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* Mostrador QUADRADO. O circulo era o mesmo do lucide, e num icone de
          24px ele e a unica curva suave da barra inteira. */}
      <rect x="3" y="3" width="18" height="18" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
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
  stale = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  /** Recalculando: o valor exibido nao vale mais. */
  stale?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-edge py-3 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-surfaceMuted text-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        {stale ? (
          // Reticula no lugar do numero, e nao o numero esmaecido: valor velho
          // continua legivel, e legivel e' o que faz o aluno acreditar nele.
          <div className="paper-skeleton mt-1 h-5 w-24" aria-label="Recalculando" />
        ) : (
          <p className="mt-0.5 text-base font-semibold leading-tight text-ink">{value}</p>
        )}
        {detail && !stale && <p className="mt-0.5 truncate text-xs text-muted">{detail}</p>}
      </div>
    </div>
  );
}

type CreateSessionPanelProps = {
  availability: QuestionBankAvailability | null;
  loadingPreview: boolean;
  busy: boolean;
  clampedLimit: number;
  correctionMode: CorrectionMode;
  studyKind: StudyKind;
  canStartSession?: boolean;
  error?: string | null;
  startLabel: string;
  emptyReason?: string | null;
  onRefreshAvailability: () => void;
  onPreviewQuestions: () => void;
  onStartSession: () => void;
  onRetry?: () => void;
};

export default function CreateSessionPanel({
  availability,
  loadingPreview,
  busy,
  clampedLimit,
  correctionMode,
  studyKind,
  canStartSession = true,
  error,
  startLabel,
  emptyReason,
  onRefreshAvailability,
  onPreviewQuestions,
  onStartSession,
  onRetry,
}: CreateSessionPanelProps) {
  const canStart =
    !busy &&
    !loadingPreview &&
    canStartSession &&
    !!availability &&
    availability.available_count > 0;
  const estimatedMinutes = Math.max(10, Math.ceil(clampedLimit * 1.5));
  const modeLabel = CORRECTION_MODE_LABEL[correctionMode];
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
          {loadingPreview ? (
            <div className="mt-2">
              <LoadBar label="Recalculando a prévia" className="w-40" />
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted" aria-live="polite">{availabilityText(availability)}</p>
          )}
        </div>
        <Button type="button" variant="secondary" size="xs" onClick={onRefreshAvailability} disabled={loadingPreview || busy}>
          Recalcular
        </Button>
      </div>

      <div className="mt-4 space-y-2.5">
        <SummaryRow
          icon={<IconClipboard className="h-5 w-5" />}
          label="Número de questões"
          stale={loadingPreview}
          value={String(clampedLimit)}
          detail={availability ? `${availability.total_count} no filtro` : undefined}
        />
        <SummaryRow
          icon={<IconClock className="h-5 w-5" />}
          label="Tempo estimado"
          stale={loadingPreview}
          value={`${estimatedMinutes} min`}
          detail={displayModeLabel}
        />
        <SummaryRow
          icon={<IconChart className="h-5 w-5" />}
          label="Distribuição"
          stale={loadingPreview}
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

      {/* Estado vazio explicado: zero questões com um botão desabilitado e sem
          motivo era o que fazia a tela parecer quebrada. */}
      {!error && emptyReason && (
        <p className="mt-4 border-l-2 border-edge pl-3 text-sm text-muted" aria-live="polite">
          {emptyReason}
        </p>
      )}

      {/* Acao primaria mora junto do resumo sobre o qual ela age. No mobile a
          BottomActionBar assume (ver banco/page.tsx). */}
      <div className="mt-4 space-y-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onStartSession}
          disabled={busy || !canStart}
          className="hidden w-full md:flex"
        >
          {busy ? "Preparando..." : startLabel}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true">
            <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
          </svg>
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onPreviewQuestions} disabled={busy || !canStart} className="w-full">
          Ver prévia
        </Button>
      </div>
    </aside>
  );
}
