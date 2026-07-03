"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuestionBankReportType } from "@/lib/api";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cognitivePatternSummary } from "@/lib/guidanceCopy";
import ErrorFlashcardsPanel from "./ErrorFlashcardsPanel";
import AttemptHistoryModal from "../../../_components/AttemptHistoryModal";
import { PostExamTabs } from "./_postExamReview/PostExamTabs";
import { ReportedItemsPanel } from "./_postExamReview/ReportedItemsPanel";
import { usePostExamReviewData } from "./_postExamReview/usePostExamReviewData";
import type { PostExamReviewProps, PostExamReviewTab } from "./_postExamReview/types";
import { accuracyColor, cx, formatAccuracy, microNodes } from "./_postExamReview/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

export default function PostExamReview({
  session,
  finalizeOut,
  busy = false,
  onFinalize,
  onSessionChange,
}: PostExamReviewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PostExamReviewTab>("resumo");
  const [dismissedInsights, setDismissedInsights] = useState(false);
  const [dismissedDiagnosisError, setDismissedDiagnosisError] = useState(false);
  const items = session.items;
  const activeReview = session.status === "active" && Boolean(session.results_revealed_at);
  const {
    token,
    diagnosis,
    diagnosisError,
    corrections,
    correctionByQuestionId,
    expandedCorrections,
    setExpandedCorrections,
    historyQuestionId,
    setHistoryQuestionId,
    actionError,
    localBusy,
    reportingPosition,
    setReportingPosition,
    reportType,
    setReportType,
    reportReason,
    setReportReason,
    submitSessionReport,
    toggleExclusion,
  } = usePostExamReviewData({ session, activeReview, onSessionChange });
  const isWorking = busy || localBusy;
  const reportedItems = items.filter((i) => i.reported_problem);
  const excludedItems = items.filter((i) => i.excluded_from_scoring);
  const scoredItems = items.filter((i) => !i.excluded_from_scoring && !i.is_annulled);
  const correctItems = scoredItems.filter((i) => i.is_correct === true);
  const wrongItems = scoredItems.filter((i) => i.is_correct === false);
  const markedItems = scoredItems.filter((i) => i.doubtful);
  const unansweredItems = scoredItems.filter((i) => !i.answered);
  const accuracy = scoredItems.length > 0 ? correctItems.length / scoredItems.length : 0;
  const diagnosedWrongCount = wrongItems.filter((item) => item.selected_option && item.distractor_diagnosis?.[item.selected_option]).length;
  const scheduledCount = finalizeOut?.created_tasks.length ?? 0;
  const savedCorrectionCount = corrections.length;
  const isFullExam = session.study_kind === "full_exam";
  const resultLabel = isFullExam
    ? "Resultado da prova"
    : session.resolution_mode === "simulation"
      ? "Revisão pós-simulado"
      : "Resultado da sessão";
  const gainTitle =
    wrongItems.length > 0
      ? `${wrongItems.length} erro${wrongItems.length === 1 ? "" : "s"} virou${wrongItems.length === 1 ? "" : "aram"} material de estudo`
      : correctItems.length === scoredItems.length
        ? "Sessão limpa: você confirmou domínio"
        : "Sessão concluída com mapa mais claro";
  const gainDetail =
    wrongItems.length > 0
      ? `${diagnosedWrongCount} com hipótese de armadilha, ${savedCorrectionCount} reparo${savedCorrectionCount === 1 ? "" : "s"} salvo${savedCorrectionCount === 1 ? "" : "s"} e ${scheduledCount} ${scheduledCount === 1 ? "revisão programada" : "revisões programadas"}.`
      : markedItems.length > 0
        ? `${markedItems.length} questão${markedItems.length === 1 ? "" : "ões"} marcada${markedItems.length === 1 ? "" : "s"} para segunda leitura.`
        : "O melhor próximo passo é manter o ritmo com outro bloco curto.";
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

  const dominantCognitiveTag = diagnosis?.dominant_cognitive_tag ?? null;
  const dominantCognitiveCount = dominantCognitiveTag
    ? (diagnosis?.cognitive_breakdown?.[dominantCognitiveTag] ?? 0)
    : 0;
  const cognitivePattern = cognitivePatternSummary(
    dominantCognitiveTag,
    dominantCognitiveCount,
  );
  const cognitivePatternHref =
    dominantCognitiveTag === "knowledge_gap" && primaryWeakNode
      ? primaryAction.href
      : "/banco-de-questoes?answer_status=wrong";

  const TABS: { id: PostExamReviewTab; label: string; count?: number }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "erros", label: "Erros", count: wrongItems.length },
    { id: "acertos", label: "Acertos", count: correctItems.length },
    { id: "marcadas", label: "Marcadas", count: markedItems.length },
    { id: "descartadas", label: "Descartadas", count: excludedItems.length },
  ];

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <header className="rounded-lg border border-edge bg-surface p-5 shadow-[var(--soft-shadow)]">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {resultLabel}
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight">
                {session.theme ?? "Sessão concluída"}
              </h1>
              <div className="mt-4 rounded-lg border border-primary/30 bg-[var(--amber-tint)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Ganho da sessão</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">{gainTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{gainDetail}</p>
              </div>
            </div>
            <ProgressRing pct={accuracy * 100} size={132} color={accuracyColor(accuracy)} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-lg border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Acertos</p>
              <p className="mt-1 text-2xl font-bold text-success">{correctItems.length}</p>
            </div>
            <div className="rounded-lg border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Erros</p>
              <p className="mt-1 text-2xl font-bold text-danger">{wrongItems.length}</p>
            </div>
            <div className="rounded-lg border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Marcadas</p>
              <p className="mt-1 text-2xl font-bold text-warning">{markedItems.length}</p>
            </div>
            <div className="rounded-lg border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Em branco</p>
              <p className="mt-1 text-2xl font-bold text-muted">{unansweredItems.length}</p>
            </div>
            <div className="rounded-lg border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Descartadas</p>
              <p className="mt-1 text-2xl font-bold text-muted">{excludedItems.length}</p>
            </div>
          </div>
        </header>

        {activeReview && (
          <section className="rounded-lg border border-primary bg-surface p-4 shadow-[var(--soft-shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Resultado ainda nao contabilizado
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {reportedItems.length > 0
                    ? "Revise as questoes denunciadas antes de gravar seu desempenho."
                    : "Conferiu o resultado? Grave para atualizar seu desempenho e agenda."}
                </p>
                {actionError && <p className="mt-2 text-xs font-semibold text-danger">{actionError}</p>}
              </div>
              <button
                type="button"
                onClick={onFinalize}
                disabled={isWorking}
                className="rounded-lg border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105 disabled:opacity-50"
              >
                Contabilizar resultado
              </button>
            </div>
          </section>
        )}

        {activeReview && (
          <ReportedItemsPanel
            items={reportedItems}
            isWorking={isWorking}
            onToggleExclusion={(item) => void toggleExclusion(item)}
          />
        )}

        <section className="rounded-lg border border-primary bg-surface p-4 shadow-[var(--soft-shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Próxima melhor ação</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight">{primaryAction.title}</h2>
              <p className="mt-1 text-sm text-muted">{primaryAction.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(primaryAction.href)}
              className="rounded-lg border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105"
            >
              Começar agora
            </button>
          </div>
          {cognitivePattern && (
            <div className="mt-4 rounded-lg border border-warning/40 bg-[var(--amber-tint)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">
                Padrão cognitivo dominante
              </p>
              <h3 className="mt-1 font-serif text-lg font-semibold text-ink">
                {cognitivePattern.label}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {cognitivePattern.phrase}
              </p>
              <button
                type="button"
                onClick={() => router.push(cognitivePatternHref)}
                className="mt-3 rounded-lg border border-warning/40 bg-surface px-3 py-1.5 text-xs font-semibold text-warning hover:border-warning"
              >
                Treinar esse padrão
              </button>
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {wrongItems.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("erros")}
                className="rounded-lg border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
              >
                Reparar erros
                <span className="mt-1 block text-xs font-normal text-muted">{diagnosedWrongCount} com diagnóstico de armadilha</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/caderno")}
              className="rounded-lg border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
            >
              Abrir caderno
              <span className="mt-1 block text-xs font-normal text-muted">Revisar notas e cards salvos</span>
            </button>
            {scheduledCount > 0 && (
              <button
                type="button"
                onClick={() => router.push("/cronograma")}
                className="rounded-lg border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
              >
                Ver agenda
                <span className="mt-1 block text-xs font-normal text-muted">{scheduledCount} {scheduledCount === 1 ? "revisão criada" : "revisões criadas"}</span>
              </button>
            )}
          </div>
        </section>

        <PostExamTabs tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

        {/* Tab content */}
        {activeTab === "resumo" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance by node — or error fallback */}
            {diagnosisError && !diagnosis && !dismissedDiagnosisError && (
              <div className="km-card flex items-start justify-between gap-3 p-4">
                <p className="text-xs text-muted">Não foi possível carregar o diagnóstico.</p>
                <button type="button" onClick={() => setDismissedDiagnosisError(true)} aria-label="Fechar" className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
                </button>
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
            {diagnosis && !dismissedInsights && (diagnosis.impulsive_count >= 2 || diagnosis.overconfident_count >= 2) && (
              <div className="km-card border-warning/40 p-4 md:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-warning">Padrão identificado</p>
                  <button type="button" onClick={() => setDismissedInsights(true)} aria-label="Fechar" className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
                  </button>
                </div>
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

            {session.resolution_mode === "simulation" && wrongItems.length > 0 && token && (
              <ErrorFlashcardsPanel token={token} session={session} wrongItems={wrongItems} />
            )}
          </div>
        )}

        {(activeTab === "erros" || activeTab === "acertos" || activeTab === "marcadas" || activeTab === "descartadas") && (() => {
          const displayItems =
            activeTab === "erros" ? wrongItems :
            activeTab === "acertos" ? correctItems :
            activeTab === "descartadas" ? excludedItems :
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
              {displayItems.map((item) => {
                const selectedDiagnosis = item.selected_option ? item.distractor_diagnosis?.[item.selected_option] : null;
                const correction = correctionByQuestionId.get(item.question_id);
                const isExpanded = expandedCorrections.has(item.question_id);
                const actionCopy =
                  activeTab === "descartadas"
                    ? "Esta questao ficou fora do seu resultado e da adaptabilidade."
                    : activeTab === "erros"
                    ? correction
                      ? "Reparo salvo: revise esta regra antes de refazer."
                      : selectedDiagnosis
                        ? "Leia a armadilha e transforme em uma regra curta."
                        : "Reescreva o raciocínio correto antes de refazer."
                    : activeTab === "acertos"
                      ? "Nomeie o dado que confirmou o acerto e siga."
                      : "Vale segunda leitura: era dúvida real ou excesso de cautela?";

                return (
                  <article key={item.question_id} className="rounded-lg border border-edge bg-surface p-4 shadow-[var(--soft-shadow)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Questão {item.position}</p>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink">{item.stem}</p>
                        {microNodes(item).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {microNodes(item).slice(0, 4).map((node) => (
                              <span key={node.knowledge_node_id} className="rounded-full border border-primary/30 bg-paper px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {node.node_name || "Microcompetencia"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.correct_answer && (
                        <span className={cx(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          item.is_correct ? "bg-success text-white" : "bg-danger text-white",
                        )}>
                          Gabarito {item.correct_answer}
                        </span>
                      )}
                      {activeReview && (
                        <button
                          type="button"
                          onClick={() =>
                            setReportingPosition((prev) =>
                              prev === item.position ? null : item.position,
                            )
                          }
                          className="text-xs font-semibold text-muted transition hover:text-ink"
                        >
                          {item.reported_problem ? "Editar denuncia" : "Denunciar questao"}
                        </button>
                      )}
                      {activeReview && item.reported_problem && (
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <input
                            type="checkbox"
                            checked={item.excluded_from_scoring}
                            disabled={isWorking}
                            onChange={() => void toggleExclusion(item)}
                            className="h-4 w-4 accent-[var(--color-primary)]"
                          />
                          Nao contabilizar
                        </label>
                      )}
                    </div>

                    {activeReview && reportingPosition === item.position && (
                      <div className="mt-3 rounded-lg border border-edge bg-paper p-3">
                        <div className="flex flex-wrap gap-2">
                          {(["error", "unclear", "outdated", "other"] as QuestionBankReportType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setReportType(type)}
                              className={cx(
                                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                                reportType === type
                                  ? "border-primary bg-primary text-primaryInk"
                                  : "border-edge text-muted hover:text-ink",
                              )}
                            >
                              {type === "error"
                                ? "Erro"
                                : type === "unclear"
                                  ? "Confusa"
                                  : type === "outdated"
                                    ? "Desatualizada"
                                    : "Outro"}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={reportReason}
                          onChange={(event) => setReportReason(event.target.value)}
                          maxLength={4000}
                          rows={3}
                          className="mt-3 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="O que parece errado nesta questao?"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReportingPosition(null)}
                            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => void submitSessionReport(item)}
                            className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primaryInk disabled:opacity-50"
                          >
                            Enviar denuncia
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.selected_option && (
                        <span className={cx(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          item.is_correct ? "border-success/40 text-success" : "border-danger/40 text-danger",
                        )}>
                          Sua resposta: {item.selected_option}
                        </span>
                      )}
                      {item.doubtful && (
                        <span className="rounded-full border border-warning/40 bg-[var(--amber-tint)] px-2.5 py-1 text-xs font-semibold text-warning">
                          Marcada
                        </span>
                      )}
                      {item.reported_problem && (
                        <span className="rounded-full border border-warning/40 bg-[var(--amber-tint)] px-2.5 py-1 text-xs font-semibold text-warning">
                          Denunciada
                        </span>
                      )}
                      {item.excluded_from_scoring && (
                        <span className="rounded-full border border-edge bg-surfaceMuted px-2.5 py-1 text-xs font-semibold text-muted">
                          Descartada por você
                        </span>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg border border-edge bg-paper px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Próximo uso deste item</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink">{actionCopy}</p>
                    </div>

                    {activeTab === "erros" && selectedDiagnosis && (
                      <div className="mt-3 rounded-lg border border-warning/50 bg-[var(--amber-tint)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-warning">Hipótese do erro</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink">{selectedDiagnosis}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.attempt_stats && item.attempt_stats.attempt_count > 0 && (
                        <button
                          type="button"
                          onClick={() => setHistoryQuestionId(item.question_id)}
                          className="text-xs font-semibold text-muted transition hover:text-ink"
                        >
                          Histórico · {item.attempt_stats.correct_count}/{item.attempt_stats.attempt_count} acertos
                        </button>
                      )}
                      {activeTab === "erros" && correction && (
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
                      )}
                    </div>

                    {activeTab === "erros" && correction && isExpanded && (
                      <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-primary pl-3 text-xs leading-relaxed text-ink/80">
                        {correction.response_value}
                      </blockquote>
                    )}
                  </article>
                );
              })}
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
