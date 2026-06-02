"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  createQuestionBankSession,
  getQuestionBankLongitudinalDiagnosis,
  getStudyPerformanceSummary,
  listDirectedStudies,
  listQuestionBankSessions,
  listReviewTasks,
  type DirectedStudyListItem,
  type QuestionBankLongitudinalDiagnosis,
  type QuestionBankSession,
  type ReviewTask,
  type StudyPerformanceSummary,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { Skeleton } from "@/components/Skeleton";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return `${Math.round(normalized)}%`;
}

function taskHref(task: ReviewTask): string {
  const params = new URLSearchParams({
    review_task_id: task.task_id,
    date: task.due_date,
    area: task.area,
    theme: task.theme,
    expected_questions: String(Math.max(1, Number(task.expected_questions ?? 10))),
  });
  return `/banco-de-questoes?${params.toString()}`;
}

function sessionAccuracy(session: QuestionBankSession): number {
  if (session.total_questions <= 0) return 0;
  const correct = session.items.filter((item) => item.is_correct === true).length;
  if (session.status === "finalized") return Math.round((correct / session.total_questions) * 100);
  return Math.round((session.answered_count / session.total_questions) * 100);
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
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

function IconFragileThemes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m16.5 7.5 2-2" />
    </svg>
  );
}

function IconOpenSession({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 4h7a2 2 0 0 1 2 2v3" />
      <path d="M7 20h7a2 2 0 0 0 2-2v-3" />
      <path d="M7 4v16" />
      <path d="M11 12h10" />
      <path d="m17 8 4 4-4 4" />
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

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-9 shrink-0 items-center justify-center text-muted">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold leading-tight text-ink">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56 rounded" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

export default function RevisoesPage() {
  const { token, tokenResolved } = useAuthToken();
  const router = useRouter();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<DirectedStudyListItem[]>([]);
  const [sessions, setSessions] = useState<QuestionBankSession[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [longitudinal, setLongitudinal] = useState<QuestionBankLongitudinalDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayISO(), []);

  useEffect(() => {
    if (!tokenResolved) return;
    Promise.all([
      listReviewTasks(token, { status: "pending" }),
      listDirectedStudies(token),
      listQuestionBankSessions(token, { limit: 30 }).catch(() => []),
      getStudyPerformanceSummary(token).catch(() => null),
      getQuestionBankLongitudinalDiagnosis(token).catch(() => null),
    ])
      .then(([taskData, studyData, sessionData, perf, meta]) => {
        setTasks(taskData);
        setStudies(studyData);
        setSessions(sessionData);
        setPerformanceSummary(perf);
        setLongitudinal(meta);
        setError(null);
      })
      .catch(() => setError("Não foi possível carregar suas revisões."))
      .finally(() => setLoading(false));
  }, [token, tokenResolved]);

  const pendingToday = tasks.filter((task) => task.due_date === today);
  const overdueTasks = tasks.filter((task) => task.is_overdue);
  const criticalTasks = tasks.filter((task) => task.is_critical);
  const reviewStudies = studies.filter((study) => study.is_review);
  const finalizedSessions = sessions.filter((session) => session.status === "finalized");
  const activeSessions = sessions.filter((session) => session.status === "active");
  const weakThemes = performanceSummary?.diagnosis?.weaknesses ?? [];
  const weakNodeCount = longitudinal?.weak_node_ids.length ?? 0;
  const atRiskNodeCount = longitudinal?.at_risk_node_ids.length ?? 0;

  async function startWeaknessSession() {
    setBusy(true);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "training",
        answer_status: "unanswered_or_wrong",
        limit: 20,
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch {
      setBusy(false);
    }
  }

  if (!tokenResolved || loading) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <LoadingBlock />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Revisões</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight md:text-5xl">Histórico e metacognição</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Acompanhe o que está pendente, reabra sessões anteriores e veja os sinais por trás das suas revisões.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startWeaknessSession()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primaryInk disabled:opacity-50"
          >
            {busy ? "Criando..." : "Criar revisão inteligente"}
            <IconArrowRight className="h-4 w-4" />
          </button>
        </header>

        {error && <div className="rounded-lg border border-danger bg-surface p-4 text-sm text-danger">{error}</div>}

        <section className="grid gap-3 md:grid-cols-4">
          <MetricCard
            label="Para hoje"
            value={String(pendingToday.length)}
            detail={`${overdueTasks.length} atrasada${overdueTasks.length === 1 ? "" : "s"} · ${criticalTasks.length} prioritária${criticalTasks.length === 1 ? "" : "s"}`}
            icon={<IconClock className="h-6 w-6" />}
          />
          <MetricCard
            label="Histórico"
            value={String(reviewStudies.length + finalizedSessions.length)}
            detail="Revisões e sessões finalizadas acessíveis"
            icon={<IconHistory className="h-6 w-6" />}
          />
          <MetricCard
            label="Temas frágeis"
            value={String(weakThemes.length || weakNodeCount)}
            detail={`${atRiskNodeCount} tema${atRiskNodeCount === 1 ? "" : "s"} com retenção em risco`}
            icon={<IconFragileThemes className="h-6 w-6" />}
          />
          <MetricCard
            label="Sessões abertas"
            value={String(activeSessions.length)}
            detail="Continue de onde parou no banco"
            icon={<IconOpenSession className="h-6 w-6" />}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-5">
            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-semibold">Revisões pendentes</h2>
                  <p className="mt-1 text-sm text-muted">Acesse pelo banco de questões ou veja a agenda completa.</p>
                </div>
                <Link href="/today" className="text-sm font-semibold text-primary hover:underline">Ver hoje</Link>
              </div>
              <div className="mt-4 space-y-3">
                {tasks.slice(0, 6).length > 0 ? tasks.slice(0, 6).map((task) => (
                  <div key={task.task_id} className="flex flex-col gap-3 rounded-lg border border-edge bg-paper p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{task.theme}</p>
                        {task.is_critical && <span className="rounded-full bg-[var(--amber-tint)] px-2 py-0.5 text-xs font-semibold text-warning">prioritária</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {task.area} · {task.expected_questions} questões · vence em {formatDate(task.due_at || task.due_date)}
                      </p>
                    </div>
                    <Link href={taskHref(task)} className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted">
                      Acessar revisão
                    </Link>
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-edge bg-paper p-8 text-center text-sm text-muted">
                    Nenhuma revisão pendente agora.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-semibold">Histórico de sessões</h2>
                  <p className="mt-1 text-sm text-muted">Abra resultados, sessões em andamento e revisões importadas.</p>
                </div>
                <Link href="/banco-de-questoes" className="text-sm font-semibold text-primary hover:underline">Nova sessão</Link>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-edge">
                {sessions.length > 0 ? sessions.slice(0, 8).map((session) => {
                  const pct = sessionAccuracy(session);
                  return (
                    <Link
                      key={session.session_id}
                      href={`/banco-de-questoes/sessao/${session.session_id}`}
                      className="grid gap-3 border-b border-edge bg-paper p-4 last:border-b-0 hover:bg-surfaceMuted md:grid-cols-[minmax(0,1fr)_7rem_7rem]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{session.theme ?? "Sessão do banco"}</p>
                        <p className="mt-1 text-xs text-muted">
                          {session.area ?? "Área"} · {session.resolution_mode === "simulation" ? "Simulado" : "Treino"} · {formatDate(session.finalized_at ?? session.updated_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">{session.status === "finalized" ? "Desempenho" : "Progresso"}</p>
                        <p className="text-lg font-semibold tabular-nums text-ink">{pct}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Questões</p>
                        <p className="text-lg font-semibold tabular-nums text-ink">{session.answered_count}/{session.total_questions}</p>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="bg-paper p-8 text-center text-sm text-muted">Nenhuma sessão do banco registrada ainda.</div>
                )}
              </div>

              {reviewStudies.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {reviewStudies.slice(0, 4).map((study) => (
                    <Link
                      key={study.study_id}
                      href={study.import_session_id ? `/cronograma/importar/${study.import_session_id}/resultados` : `/banco-de-questoes?area=${encodeURIComponent(study.area)}&theme=${encodeURIComponent(study.theme)}`}
                      className="rounded-lg border border-edge bg-paper p-4 hover:border-primary"
                    >
                      <p className="truncate font-semibold text-ink">{study.theme}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(study.performed_at)} · {study.correct_questions}/{study.total_questions} questões · {formatPct(study.accuracy)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <h2 className="font-serif text-2xl font-semibold">Metacognição geral</h2>
              <p className="mt-1 text-sm text-muted">Sinais agregados das respostas no banco.</p>
              <div className="mt-4 space-y-4">
                {[
                  { label: "Sensibilidade a pegadinhas", value: longitudinal?.trap_sensitivity, tone: "text-warning" },
                  { label: "Excesso de confiança", value: longitudinal?.overconfidence_score, tone: "text-danger" },
                  { label: "Impulsividade", value: longitudinal?.impulsive_rate, tone: "text-primary" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink">{item.label}</span>
                      <span className={`font-semibold tabular-nums ${item.tone}`}>{formatPct(item.value ?? 0)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surfaceMuted">
                      <div className="h-full rounded-full bg-primary" style={{ width: formatPct(item.value ?? 0) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Temas para revisar</h2>
                <Link href="/dados-e-relatorios/relatorio" className="text-xs font-semibold text-primary hover:underline">Ver todos</Link>
              </div>
              <div className="mt-4 space-y-3">
                {weakThemes.slice(0, 5).length > 0 ? weakThemes.slice(0, 5).map((theme) => (
                  <Link
                    key={theme.key}
                    href={`/banco-de-questoes?area=${encodeURIComponent(theme.area)}&theme=${encodeURIComponent(theme.theme)}&answer_status=unanswered_or_wrong`}
                    className="block rounded-lg border border-edge bg-paper p-3 hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-ink">{theme.theme}</p>
                      <span className="text-sm font-semibold text-danger">{formatPct(theme.accuracy_pct)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{theme.total_questions} questões · {theme.action_hint ?? "Revisar erros e refazer questões."}</p>
                  </Link>
                )) : (
                  <p className="text-sm text-muted">O diagnóstico aparece quando houver amostra suficiente.</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <h2 className="font-serif text-2xl font-semibold">Ações recomendadas</h2>
              <div className="mt-4 space-y-3">
                <Link href="/banco-de-questoes?answer_status=wrong" className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-paper p-4 hover:border-primary">
                  <div>
                    <p className="text-sm font-semibold text-primary">Revisar só erros</p>
                    <p className="mt-1 text-xs text-muted">Foque nas questões erradas no banco.</p>
                  </div>
                  <IconArrowRight className="h-4 w-4 text-muted" />
                </Link>
                <Link href="/today" className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-paper p-4 hover:border-primary">
                  <div>
                    <p className="text-sm font-semibold text-primary">Executar pendências</p>
                    <p className="mt-1 text-xs text-muted">Voltar ao plano do dia.</p>
                  </div>
                  <IconArrowRight className="h-4 w-4 text-muted" />
                </Link>
                <Link href="/cards-adaptativos" className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-paper p-4 hover:border-primary">
                  <div>
                    <p className="text-sm font-semibold text-primary">Reforçar flashcards</p>
                    <p className="mt-1 text-xs text-muted">Feche lacunas com repetição espaçada.</p>
                  </div>
                  <IconArrowRight className="h-4 w-4 text-muted" />
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
