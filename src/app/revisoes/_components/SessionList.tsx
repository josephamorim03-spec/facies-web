import Link from "next/link";
import type { QuestionBankSession } from "@/lib/api";
import { formatDurationMs } from "@/lib/formatDuration";
import { resolutionModeLabel } from "@/lib/guidanceCopy";
import {
  sessionAccuracy,
  sessionCta,
  sessionDurationMs,
  type SessionsTab,
} from "@/lib/sessionsPanel";
import { formatDate } from "./format";

const EMPTY_COPY: Record<SessionsTab, string> = {
  inacabadas: "Nenhuma sessão em andamento. Comece uma nova no banco de questões.",
  resultados: "Nenhum resultado ainda. Finalize uma sessão para ver o desempenho aqui.",
  provas: "Nenhum simulado ainda. Inicie um em Questões (cartão “Simular prova”).",
  todas: "Nenhuma sessão do banco registrada ainda.",
};

function statusChip(session: QuestionBankSession): { label: string; tone: string } {
  if (session.status === "invalidated") return { label: "Invalidada", tone: "text-muted" };
  if (session.status === "finalized") return { label: "Finalizada", tone: "text-success" };
  return { label: "Em andamento", tone: "text-info" };
}

function sessionTitle(session: QuestionBankSession): string {
  if (session.theme) return session.theme;
  if (session.full_exam_name) {
    return session.full_exam_year
      ? `${session.full_exam_name} · ${session.full_exam_year}`
      : session.full_exam_name;
  }
  return "Sessão do banco";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[4.5rem]">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function SessionRow({ session }: { session: QuestionBankSession }) {
  const cta = sessionCta(session);
  const chip = statusChip(session);
  const pct = sessionAccuracy(session);
  const duration = formatDurationMs(sessionDurationMs(session));
  const invalidated = session.status === "invalidated";

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-ink">{sessionTitle(session)}</p>
          <span className={`rounded-full border border-edge px-2 py-0.5 text-xs font-semibold ${chip.tone}`}>
            {chip.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {session.area ?? "Área"} · {resolutionModeLabel(session.resolution_mode)} ·{" "}
          {formatDate(session.finalized_at ?? session.updated_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Stat
          label={session.status === "finalized" ? "Acerto" : "Progresso"}
          value={`${pct}%`}
        />
        <Stat label="Questões" value={`${session.answered_count}/${session.total_questions}`} />
        <Stat label="Tempo" value={duration ?? "—"} />
        {cta && (
          <span
            data-session-cta={cta.label}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold ${
              cta.variant === "primary"
                ? "border-primary bg-primary text-primaryInk"
                : "border-primary text-primary"
            }`}
          >
            {cta.label}
          </span>
        )}
      </div>
    </>
  );

  const rowClassName =
    "flex flex-col gap-3 border-b border-edge bg-paper p-4 last:border-b-0 md:flex-row md:items-center md:justify-between";

  if (invalidated) {
    return (
      <div data-session-id={session.session_id} className={`${rowClassName} opacity-60`}>
        {content}
      </div>
    );
  }
  return (
    <Link
      href={`/banco-de-questoes/sessao/${session.session_id}`}
      data-session-id={session.session_id}
      className={`${rowClassName} transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {content}
    </Link>
  );
}

export function SessionList({ sessions, tab }: { sessions: QuestionBankSession[]; tab: SessionsTab }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-paper p-8 text-center text-sm text-muted">
        <p>{EMPTY_COPY[tab]}</p>
        <Link
          href="/banco-de-questoes"
          className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Ir para o banco de questões
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-edge">
      {sessions.map((session) => (
        <SessionRow key={session.session_id} session={session} />
      ))}
    </div>
  );
}
