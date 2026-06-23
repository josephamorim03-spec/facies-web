"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  authHeader,
  getSessionCorrections,
  type QuestionBankCorrectionItem,
  type QuestionBankFinalizeResult,
  type QuestionBankSession,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { ProgressRing } from "@/components/ui/ProgressRing";
import AttemptHistoryModal from "../../../_components/AttemptHistoryModal";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeDiagnosis = {
  knowledge_node_id: string;
  node_name: string | null;
  correct: number;
  wrong: number;
  accuracy: number;
};

type SessionDiagnosis = {
  session_id: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  nodes: NodeDiagnosis[];
  weak_node_ids: string[];
  charge_pattern_breakdown: Record<string, number>;
  answer_type_breakdown: Record<string, number>;
  reasoning_type_breakdown: Record<string, number>;
  error_reasons: Record<string, number>;
  confident_and_wrong: number;
  doubtful_and_wrong: number;
  metacognitive_accuracy: number | null;
  impulsive_count: number;
  overconfident_count: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatAccuracy(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function accuracyColor(accuracy: number): string {
  return accuracy >= 0.7 ? "var(--color-success)" : accuracy >= 0.5 ? "var(--color-warning)" : "var(--color-danger)";
}

type Tab = "resumo" | "erros" | "acertos" | "marcadas";

type PostExamReviewProps = {
  session: QuestionBankSession;
  finalizeOut?: QuestionBankFinalizeResult | null;
};

export default function PostExamReview({ session, finalizeOut }: PostExamReviewProps) {
  const router = useRouter();
  const { token } = useAuthToken();
  const [activeTab, setActiveTab] = useState<Tab>("resumo");
  const [diagnosis, setDiagnosis] = useState<SessionDiagnosis | null>(null);
  const [diagnosisError, setDiagnosisError] = useState(false);
  const [corrections, setCorrections] = useState<QuestionBankCorrectionItem[]>([]);
  const [expandedCorrections, setExpandedCorrections] = useState<Set<string>>(new Set());
  const [historyQuestionId, setHistoryQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !session.session_id) return;
    api<SessionDiagnosis>(
      `/api/question-bank/sessions/${encodeURIComponent(session.session_id)}/diagnosis`,
      { headers: authHeader(token) },
    )
      .then(setDiagnosis)
      .catch(() => setDiagnosisError(true));
  }, [token, session.session_id]);

  useEffect(() => {
    if (!token || !session.session_id) return;
    getSessionCorrections(token, session.session_id)
      .then(setCorrections)
      .catch(() => {});
  }, [token, session.session_id]);

  const correctionByQuestionId = useMemo(
    () => new Map(corrections.map((correction) => [correction.question_id, correction])),
    [corrections],
  );

  const items = session.items;
  const correctItems = items.filter((i) => i.is_correct === true);
  const wrongItems = items.filter((i) => i.is_correct === false);
  const markedItems = items.filter((i) => i.doubtful);
  const unansweredItems = items.filter((i) => !i.answered);
  const accuracy = session.total_questions > 0 ? correctItems.length / session.total_questions : 0;
  const isFullExam = session.study_kind === "full_exam";
  const resultLabel = isFullExam
    ? "Resultado da prova"
    : session.resolution_mode === "simulation"
      ? "Revisão pós-simulado"
      : "Resultado da sessão";
  const primaryWeakNode = diagnosis?.nodes
    .filter((node) => node.accuracy < 0.6 && (node.correct + node.wrong) >= 1)
    .sort((a, b) => a.accuracy - b.accuracy)[0] ?? null;
  const primaryAction = primaryWeakNode
    ? {
        title: `Treinar ${primaryWeakNode.node_name ?? "microcompetência fraca"}`,
        detail: `${formatAccuracy(primaryWeakNode.accuracy)} de acerto nesta sessão · ${primaryWeakNode.correct + primaryWeakNode.wrong} questão(ões)`,
        href: `/banco-de-questoes?theme=${encodeURIComponent(primaryWeakNode.node_name ?? "")}&answer_status=unanswered_or_wrong`,
      }
    : wrongItems.length > 0
      ? {
          title: "Revisar os erros desta sessão",
          detail: `${wrongItems.length} questão(ões) para reconstruir raciocínio`,
          href: "/banco-de-questoes?answer_status=wrong",
        }
      : markedItems.length > 0
        ? {
            title: "Rever questões marcadas",
            detail: `${markedItems.length} questão(ões) que merecem segunda leitura`,
            href: "/banco-de-questoes?answer_status=answered",
          }
        : {
            title: "Iniciar novo bloco adaptativo",
            detail: "Mantenha o ritmo com outra missão curta",
            href: "/banco-de-questoes",
          };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "erros", label: "Erros", count: wrongItems.length },
    { id: "acertos", label: "Acertos", count: correctItems.length },
    { id: "marcadas", label: "Marcadas", count: markedItems.length },
  ];

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {resultLabel}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight">
            {session.theme ?? "Sessão concluída"}
          </h1>
        </header>

        {/* Score bar */}
        <div className="km-card flex flex-col items-center gap-6 p-6 sm:flex-row">
          <ProgressRing pct={accuracy * 100} size={120} color={accuracyColor(accuracy)} />
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Acertos</p>
              <p className="mt-1 text-2xl font-bold text-success">{correctItems.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Erros</p>
              <p className="mt-1 text-2xl font-bold text-danger">{wrongItems.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Marcadas</p>
              <p className="mt-1 text-2xl font-bold text-warning">{markedItems.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Em branco</p>
              <p className="mt-1 text-2xl font-bold text-muted">{unansweredItems.length}</p>
            </div>
          </div>
        </div>

        <section className="km-card border-primary p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Próxima melhor ação</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight">{primaryAction.title}</h2>
              <p className="mt-1 text-sm text-muted">{primaryAction.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(primaryAction.href)}
              className="rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk shadow-sm"
            >
              Começar agora
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {wrongItems.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("erros")}
                className="rounded-xl border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
              >
                Ver erros
                <span className="mt-1 block text-xs font-normal text-muted">Diagnóstico e correções</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/caderno")}
              className="rounded-xl border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
            >
              Abrir caderno
              <span className="mt-1 block text-xs font-normal text-muted">Revisar notas e cards</span>
            </button>
            {finalizeOut && finalizeOut.created_tasks.length > 0 && (
              <button
                type="button"
                onClick={() => router.push("/cronograma")}
                className="rounded-xl border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
              >
                Ver agenda
                <span className="mt-1 block text-xs font-normal text-muted">{finalizeOut.created_tasks.length} revisão(ões) criada(s)</span>
              </button>
            )}
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-edge">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="rounded-full bg-surfaceMuted px-1.5 py-0.5 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === "resumo" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance by node — or error fallback */}
            {diagnosisError && !diagnosis && (
              <div className="km-card p-4">
                <p className="text-xs text-muted">Não foi possível carregar o diagnóstico.</p>
              </div>
            )}
            {diagnosis && diagnosis.nodes.length > 0 && (
              <div className="km-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Desempenho por tema</p>
                <div className="mt-3 space-y-3">
                  {diagnosis.nodes.slice(0, 8).map((node) => (
                    <div key={node.knowledge_node_id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-ink">{node.node_name ?? "—"}</span>
                        <span className={cx(
                          "font-semibold",
                          node.accuracy >= 0.7 ? "text-success" : node.accuracy >= 0.5 ? "text-warning" : "text-danger",
                        )}>
                          {formatAccuracy(node.accuracy)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
                        <div
                          className={cx(
                            "h-full rounded-full",
                            node.accuracy >= 0.7 ? "bg-success" : node.accuracy >= 0.5 ? "bg-warning" : "bg-danger",
                          )}
                          style={{ width: formatAccuracy(node.accuracy) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended actions */}
            <div className="km-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Ações recomendadas</p>
              <div className="mt-3 space-y-2">
                {wrongItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => router.push(`/banco-de-questoes?answer_status=wrong`)}
                    className="flex w-full items-center justify-between rounded-xl border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">Revisar só erros</p>
                      <p className="text-xs text-muted">{wrongItems.length} questões para revisar</p>
                    </div>
                    <span className="text-muted">→</span>
                  </button>
                )}
                {finalizeOut && finalizeOut.created_tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => router.push("/cronograma")}
                    className="flex w-full items-center justify-between rounded-xl border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {finalizeOut.created_tasks.length === 1 ? "1 tarefa agendada" : `${finalizeOut.created_tasks.length} tarefas agendadas`}
                      </p>
                      <p className="text-xs text-muted">Revisão programada no seu cronograma</p>
                    </div>
                    <span className="text-muted">→</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/banco-de-questoes`)}
                  className="flex w-full items-center justify-between rounded-xl border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">Nova sessão</p>
                    <p className="text-xs text-muted">Voltar ao banco de questões</p>
                  </div>
                  <span className="text-muted">→</span>
                </button>
              </div>
            </div>

            {/* Weak topics focus */}
            {diagnosis && diagnosis.nodes.some((n) => n.accuracy < 0.5 && (n.correct + n.wrong) >= 2) && (
              <div className="km-card p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Focar nestes temas</p>
                <p className="mt-1 text-xs text-muted">Abaixo de 50% de acerto nesta sessão</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {diagnosis.nodes
                    .filter((n) => n.accuracy < 0.5 && (n.correct + n.wrong) >= 2)
                    .slice(0, 4)
                    .map((n) => (
                      <button
                        key={n.knowledge_node_id}
                        type="button"
                        onClick={() => router.push(`/banco-de-questoes?theme=${encodeURIComponent(n.node_name ?? "")}&answer_status=unanswered_or_wrong`)}
                        className="flex items-center justify-between rounded-xl border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{n.node_name ?? "—"}</p>
                          <p className="text-xs text-danger">{Math.round(n.accuracy * 100)}% · {n.correct + n.wrong} questões</p>
                        </div>
                        <span className="ml-2 shrink-0 text-muted">→</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Behavioral insights */}
            {diagnosis && (diagnosis.impulsive_count >= 2 || diagnosis.overconfident_count >= 2) && (
              <div className="km-card border-warning/40 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-warning">Padrão identificado</p>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  {diagnosis.impulsive_count >= 2 && (
                    <p>• {diagnosis.impulsive_count} questão(ões) respondida(s) muito rapidamente e errada(s) — releia o enunciado antes de marcar.</p>
                  )}
                  {diagnosis.overconfident_count >= 2 && (
                    <p>• Em {diagnosis.overconfident_count} questão(ões) você estava confiante mas errou — desconfie das opções que parecem óbvias.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {(activeTab === "erros" || activeTab === "acertos" || activeTab === "marcadas") && (() => {
          const displayItems =
            activeTab === "erros" ? wrongItems :
            activeTab === "acertos" ? correctItems :
            markedItems;

          if (displayItems.length === 0) {
            const emptyMessage =
              activeTab === "erros"
                ? "Nenhum erro nesta sessão. Excelente trabalho!"
                : activeTab === "acertos"
                  ? "Nenhum acerto registrado nesta sessão."
                  : "Você não marcou nenhuma questão.";
            return (
              <div className="rounded-xl border border-dashed border-edge bg-surface p-8 text-center text-sm text-muted">
                {emptyMessage}
              </div>
            );
          }

          return (
            <div className="grid gap-3">
              {displayItems.map((item) => (
                <article key={item.question_id} className="km-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted">Questão {item.position}</p>
                    {item.correct_answer && (
                      <span className={cx(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.is_correct ? "bg-success text-white" : "bg-danger text-white",
                      )}>
                        Gabarito {item.correct_answer}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink">{item.stem}</p>
                  {item.selected_option && !item.is_correct && (
                    <p className="mt-2 text-xs text-danger">Você respondeu: {item.selected_option}</p>
                  )}
                  {activeTab === "erros" && item.selected_option && item.distractor_diagnosis?.[item.selected_option] && (
                    <div className="mt-3 rounded-lg border border-warning bg-[var(--amber-tint)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-warning">Hipótese do erro</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink">
                        {item.distractor_diagnosis[item.selected_option]}
                      </p>
                    </div>
                  )}
                  {item.attempt_stats && item.attempt_stats.attempt_count > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistoryQuestionId(item.question_id)}
                      className="mt-2 text-xs font-semibold text-muted transition hover:text-ink"
                    >
                      Histórico · {item.attempt_stats.correct_count}/{item.attempt_stats.attempt_count} acertos
                    </button>
                  )}
                  {activeTab === "erros" && correctionByQuestionId.has(item.question_id) && (() => {
                    const correction = correctionByQuestionId.get(item.question_id)!;
                    const isExpanded = expandedCorrections.has(item.question_id);
                    return (
                      <div className="mt-3 border-t border-edge pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCorrections((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.question_id)) {
                                next.delete(item.question_id);
                              } else {
                                next.add(item.question_id);
                              }
                              return next;
                            })
                          }
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-ink"
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cx("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} aria-hidden="true">
                            <path d="m7 4 6 6-6 6" />
                          </svg>
                          Minha correção
                        </button>
                        {isExpanded && (
                          <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-edge pl-3 text-xs leading-relaxed text-ink/80">
                            {correction.response_value}
                          </blockquote>
                        )}
                      </div>
                    );
                  })()}
                </article>
              ))}
            </div>
          );
        })()}
      </div>
      {historyQuestionId && (
        <AttemptHistoryModal
          key={historyQuestionId}
          questionId={historyQuestionId}
          onClose={() => setHistoryQuestionId(null)}
        />
      )}
    </main>
  );
}
