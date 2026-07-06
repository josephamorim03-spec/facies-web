// Regras puras do painel de Histórico (/revisoes).
// TS puro, sem imports de runtime: consumido pelos unit tests via
// `node --experimental-strip-types` (aliases `@/` não resolvem lá).
// `SessionLike` é estrutural — `QuestionBankSession` é atribuível a ele.

// Filtros do Histórico. /provas é a área canônica de Simulados, mas o histórico
// completo ainda pode filtrar sessões exam-like.
export const SESSION_TAB_VALUES = [
  "inacabadas",
  "resultados",
  "provas",
  "todas",
] as const;

export type SessionsTab = (typeof SESSION_TAB_VALUES)[number];

export function parseSessionsTab(raw: string | null | undefined): SessionsTab {
  return (SESSION_TAB_VALUES as readonly string[]).includes(raw ?? "")
    ? (raw as SessionsTab)
    : "inacabadas";
}

export type SessionLike = {
  status: "active" | "finalized" | "invalidated";
  mode: string;
  resolution_mode: "training" | "simulation";
  study_kind: string;
  results_revealed_at: string | null;
  finalized_at: string | null;
  created_at: string;
  answered_time_ms: number;
};

/** Prova ou simulado: simulado por modo de resolução, prova completa ou por prova. */
export function isExamLike(session: SessionLike): boolean {
  return (
    session.resolution_mode === "simulation" ||
    session.study_kind === "full_exam" ||
    session.mode === "by_exam"
  );
}

export function filterSessionsByTab<T extends SessionLike>(sessions: T[], tab: SessionsTab): T[] {
  switch (tab) {
    case "inacabadas":
      return sessions.filter((session) => session.status === "active");
    case "resultados":
      return sessions.filter((session) => session.status === "finalized");
    case "provas":
      return sessions.filter((session) => session.status !== "invalidated" && isExamLike(session));
    case "todas":
      return sessions;
  }
}

export type SessionCta = { label: string; variant: "primary" | "secondary" } | null;

export function sessionCta(session: SessionLike): SessionCta {
  if (session.status === "invalidated") return null;
  if (session.status === "finalized") return { label: "Ver resultado", variant: "secondary" };
  if (session.resolution_mode === "simulation" && session.results_revealed_at) {
    return { label: "Concluir revisão", variant: "primary" };
  }
  return { label: "Continuar", variant: "primary" };
}

/**
 * Tempo real respondido (soma de time_ms das tentativas); para sessões antigas
 * sem esse dado, aproxima pela janela created_at → finalized_at/results_revealed_at.
 * Ativa sem tempo registrado → null (updated_at enganaria: muda a cada tentativa).
 */
export function sessionDurationMs(session: SessionLike): number | null {
  if (session.answered_time_ms > 0) return session.answered_time_ms;
  const end = session.finalized_at ?? session.results_revealed_at;
  if (!end) return null;
  const diff = Date.parse(end) - Date.parse(session.created_at);
  return Number.isFinite(diff) && diff > 0 ? diff : null;
}

export type SessionAccuracyLike = SessionLike & {
  total_questions: number;
  answered_count: number;
  items: Array<{ is_correct: boolean | null }>;
};

/** Finalizada: % de acerto; ativa: % de progresso (mesma regra da página antiga). */
export function sessionAccuracy(session: SessionAccuracyLike): number {
  if (session.total_questions <= 0) return 0;
  const correct = session.items.filter((item) => item.is_correct === true).length;
  if (session.status === "finalized") return Math.round((correct / session.total_questions) * 100);
  return Math.round((session.answered_count / session.total_questions) * 100);
}
