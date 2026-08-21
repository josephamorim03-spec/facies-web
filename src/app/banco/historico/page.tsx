"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { listQuestionBankSessions, type QuestionBankSession } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { LoadBar } from "@/components/ui/LoadBar";

/**
 * Historico de sessoes finalizadas.
 *
 * Era a quarta aba de `/evolucao`, sem URL propria: `?tab=history` nao existia,
 * entao nao havia como linkar para ela — foi por isso que `/provas` acabou
 * aterrissando na aba Graficos, "sem nada de simulados a vista", como o proprio
 * redirect documentava.
 *
 * Mora sob o Banco porque e o historico das sessoes de QUESTAO (Kros, Banco,
 * combinada e prova sao todas `QuestionBankSession`). Evolucao ficou com as tres
 * leituras analiticas.
 */

const SESSION_LABELS: Record<QuestionBankSession["session_kind"], string> = {
  kros: "Kros",
  bank_topic: "Banco",
  bank_combined: "Sessão combinada",
  institutional_exam: "Prova",
};

function sessionScore(session: QuestionBankSession): {
  correct: number;
  total: number;
  pct: number | null;
} {
  const scorable = session.items.filter((item) => !item.excluded_from_scoring);
  const correct = scorable.filter((item) => item.is_correct === true).length;
  return {
    correct,
    total: scorable.length,
    pct: scorable.length ? Math.round((correct / scorable.length) * 100) : null,
  };
}

export default function BancoHistoricoPage() {
  const { token, tokenResolved } = useAuthToken();

  const sessionsQuery = useQuery({
    queryKey: queryKeys.questionBankSessions("finalized"),
    queryFn: () => listQuestionBankSessions(token, { status: "finalized", limit: 100 }),
    enabled: tokenResolved,
    staleTime: 30_000,
  });

  const sessions = sessionsQuery.data ?? [];

  if (sessionsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 py-8" aria-busy="true">
        <LoadBar label="Carregando seu histórico" className="w-full max-w-xs" />
        <div className="paper-skeleton h-16" />
        <div className="paper-skeleton h-16" />
        <div className="paper-skeleton h-16" />
      </div>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <p className="text-sm text-danger">Não foi possível carregar o histórico.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="flex items-center gap-3 py-4">
        <span className="paper-eyebrow">Sessões finalizadas</span>
        <span className="chrome-leader" aria-hidden="true" />
        <span className="paper-eyebrow">{sessions.length}</span>
      </div>

      {sessions.length ? (
        <ol className="divide-y divide-edge">
          {sessions.map((session) => {
            const score = sessionScore(session);
            return (
              <li
                key={session.session_id}
                className="grid gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_8rem] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{SESSION_LABELS[session.session_kind]}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
                      new Date(session.finalized_at ?? session.updated_at),
                    )}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    {session.full_exam_name ??
                      session.theme ??
                      (session.session_kind === "bank_combined" ? "Conteúdos combinados" : "Sessão concluída")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {score.correct}/{score.total} questões
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xl font-semibold text-ink">{score.pct == null ? "-" : `${score.pct}%`}</span>
                  <Link
                    href={`/banco/sessao/${session.session_id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Resultado
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-8 text-sm text-muted">Sessões finalizadas aparecerão aqui.</p>
      )}
    </div>
  );
}
