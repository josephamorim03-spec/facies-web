"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type {
  OperationalQuestionOutcome,
  QuestionBankOption,
  QuestionBankReportType,
  QuestionTextHighlight,
} from "@/lib/api";
import { revealAllQuestionBankFeedback } from "@/lib/api";
import { ScoreReadout } from "@/components/ui/ScoreReadout";
import { QuestionFullContext } from "@/app/banco/_components/QuestionFullContext";
import { cognitivePatternSummary } from "@/lib/guidanceCopy";
import ErrorFlashcardsPanel from "./ErrorFlashcardsPanel";
import QuickNoteModal from "./QuickNoteModal";
import AttemptHistoryModal from "../../../_components/AttemptHistoryModal";
import { PostExamIndex } from "./_postExamReview/PostExamIndex";
import { PostExamTabs } from "./_postExamReview/PostExamTabs";
import { PostExamItemActions } from "./_postExamReview/PostExamItemActions";
import { ReportedItemsPanel } from "./_postExamReview/ReportedItemsPanel";
import { usePostExamReviewData } from "./_postExamReview/usePostExamReviewData";
import type { PostExamReviewProps, PostExamReviewTab } from "./_postExamReview/types";
import { accuracyColor, cx, formatAccuracy, microNodes } from "./_postExamReview/utils";
import { CorrecaoStage } from "./CorrecaoStage";
import LearningPackagePanel from "./LearningPackagePanel";

const ExamDebrief = dynamic(() => import("./ExamDebrief"), {
  ssr: false,
  loading: () => <div className="paper-skeleton h-24 border border-edge bg-surface" aria-hidden="true" />,
});

const REPORT_OPTIONS: Array<{ type: QuestionBankReportType; label: string }> = [
  { type: "wrong_answer", label: "Gabarito errado" },
  { type: "bad_structure", label: "Enunciado cortado" },
  { type: "missing_options", label: "Alternativas quebradas" },
  { type: "truncated_or_merged_stem", label: "Questões misturadas" },
  { type: "missing_media", label: "Imagem/tabela faltando" },
  { type: "wrong_metadata", label: "Metadados errados" },
  { type: "outdated", label: "Desatualizada" },
  { type: "other", label: "Outro" },
];

type QuickNoteIntent = "rule" | "card";

type QuickNoteTarget = {
  questionId: string;
  noteIntent: QuickNoteIntent;
  questionOutcome: OperationalQuestionOutcome | null;
  selectedOption: QuestionBankOption | null;
  correctAnswer: QuestionBankOption | null;
  errorHypothesis: string | null;
  highlightContext: QuestionTextHighlight[];
};

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
  const [activeTab, setActiveTab] = useState<PostExamReviewTab>(
    session.all_feedback_revealed ? "resumo" : "erros",
  );
  const [cursor, setCursor] = useState(0);
  const reviewTopRef = useRef<HTMLDivElement | null>(null);

  /** Trocar de questao sem levar a rolagem junto deixa o aluno no MEIO do item
   *  novo — o rodape de navegacao fica no fim da pagina, entao avancar o
   *  colocava direto no pacote pedagogico, sem nunca ver o enunciado. */
  function goToReviewIndex(next: number) {
    setCursor(next);
    requestAnimationFrame(() => {
      reviewTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }
  const [dismissedInsights, setDismissedInsights] = useState(false);
  const [dismissedDiagnosisError, setDismissedDiagnosisError] = useState(false);
  const [quickNoteTarget, setQuickNoteTarget] = useState<QuickNoteTarget | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  // A etapa de correcao precede o gabarito. Sair dela e uma decisao do aluno, e
  // vale para a sessao inteira -- nao volta a cada item aberto.
  const [correcaoSkipped, setCorrecaoSkipped] = useState(false);
  const items = session.items;
  const activeReview = session.status === "active" && Boolean(session.results_revealed_at);
  const detailedFeedbackAvailable = session.all_feedback_revealed;
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
  } = usePostExamReviewData({
    session,
    activeReview,
    detailedFeedbackAvailable,
    onSessionChange,
  });
  const isWorking = busy || localBusy || revealBusy;
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
  const sessionDisplayLabel = session.subtheme ?? session.theme ?? "Sessão concluída";
  const resultLabel = isFullExam
    ? "Resultado da prova"
    : session.resolution_mode === "simulation"
      ? "Revisão pós-simulado"
      : "Resultado da sessão";
  const gainTitle = !detailedFeedbackAvailable
    ? "Resultado calculado; feedback ainda protegido"
    :
    wrongItems.length > 0
      ? wrongItems.length === 1
        ? "1 erro virou material de estudo"
        : `${wrongItems.length} erros viraram material de estudo`
      : correctItems.length === scoredItems.length
        ? "Sessão limpa: bom desempenho observado"
        : "Sessão concluída com mapa mais claro";
  const gainDetail = !detailedFeedbackAvailable
    ? "Escolha por questão entre reconstruir o raciocínio ou revelar diretamente."
    :
    wrongItems.length > 0
      ? `${diagnosedWrongCount} com hipótese de armadilha, ${savedCorrectionCount} reparo${savedCorrectionCount === 1 ? "" : "s"} salvo${savedCorrectionCount === 1 ? "" : "s"} e ${scheduledCount} ${scheduledCount === 1 ? "revisão programada" : "revisões programadas"}.`
      : markedItems.length > 0
        ? `${markedItems.length} questão${markedItems.length === 1 ? "" : "ões"} marcada${markedItems.length === 1 ? "" : "s"} para segunda leitura.`
        : "O melhor próximo passo é manter o ritmo com outro bloco curto.";
  const primaryWeakNode = diagnosis?.nodes
    .filter((node) => node.accuracy < 0.6 && (node.correct + node.wrong) >= 1)
    .sort((a, b) => a.accuracy - b.accuracy)[0] ?? null;
  const recommendedBlock = diagnosis?.recommended_blocks?.[0] ?? null;
  const primaryAction = recommendedBlock
    ? {
        title: `Treinar ${recommendedBlock.label}`,
        detail: `${recommendedBlock.recommended_question_count} questão(ões) em ~${recommendedBlock.estimated_minutes} min · ${recommendedBlock.why_now}`,
        href: `/banco?knowledge_node_ids=${encodeURIComponent(recommendedBlock.node_id)}&answer_status=unanswered_or_wrong`,
      }
    : primaryWeakNode
    ? {
        title: `Treinar ${primaryWeakNode.node_name ?? "microcompetência fraca"}`,
        detail: `${formatAccuracy(primaryWeakNode.accuracy)} de acerto nesta sessão · ${primaryWeakNode.correct + primaryWeakNode.wrong} questão(ões)`,
        href: `/banco?theme=${encodeURIComponent(primaryWeakNode.node_name ?? "")}&answer_status=unanswered_or_wrong`,
      }
    : wrongItems.length > 0
      ? {
          title: "Revisar os erros desta sessão",
          detail: `${wrongItems.length} questão(ões) para reconstruir raciocínio`,
          href: "/banco?answer_status=wrong",
        }
      : markedItems.length > 0
        ? {
            title: "Rever questões marcadas",
            detail: `${markedItems.length} questão(ões) que merecem segunda leitura`,
            href: "/banco?answer_status=answered",
          }
        : {
            title: "Iniciar novo bloco adaptativo",
            detail: "Mantenha o ritmo com outra missão curta",
            href: "/banco",
          };

  const dominantCognitiveTag = diagnosis?.dominant_cognitive_tag ?? null;
  const dominantCognitiveCount = dominantCognitiveTag
    ? (diagnosis?.cognitive_breakdown?.[dominantCognitiveTag] ?? 0)
    : 0;
  const cognitivePattern = cognitivePatternSummary(
    dominantCognitiveTag,
    dominantCognitiveCount,
  );
  const TABS: { id: PostExamReviewTab; label: string; count?: number }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "erros", label: "Erros", count: wrongItems.length },
    { id: "acertos", label: "Acertos", count: correctItems.length },
    { id: "marcadas", label: "Marcadas", count: markedItems.length },
    { id: "descartadas", label: "Descartadas", count: excludedItems.length },
  ];

  const examLike = isFullExam || session.resolution_mode === "simulation";

  async function revealAll() {
    if (!window.confirm("Revelar agora as respostas e comentários de todas as questões?")) return;
    setRevealBusy(true);
    try {
      onSessionChange?.(
        await revealAllQuestionBankFeedback(token, session.session_id),
      );
    } finally {
      setRevealBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {examLike && detailedFeedbackAvailable && <ExamDebrief sessionId={session.session_id} />}

        <header className="border border-edge bg-surface p-5">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                O que você fez · {resultLabel}
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight">
                {sessionDisplayLabel}
              </h1>
              <div className="mt-4 border border-primary/30 bg-[var(--amber-tint)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">O que você aprendeu</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">{gainTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{gainDetail}</p>
              </div>
            </div>
            <ScoreReadout pct={accuracy * 100} label="Acerto na prova" color={accuracyColor(accuracy)} />
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-muted">Ver métricas da sessão</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Acertos</p>
              <p className="mt-1 text-2xl font-bold text-success">{correctItems.length}</p>
            </div>
            <div className="border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Erros</p>
              <p className="mt-1 text-2xl font-bold text-danger">{wrongItems.length}</p>
            </div>
            <div className="border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Marcadas</p>
              <p className="mt-1 text-2xl font-bold text-warning">{markedItems.length}</p>
            </div>
            <div className="border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Em branco</p>
              <p className="mt-1 text-2xl font-bold text-muted">{unansweredItems.length}</p>
            </div>
            <div className="border border-edge bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Descartadas</p>
              <p className="mt-1 text-2xl font-bold text-muted">{excludedItems.length}</p>
            </div>
            </div>
          </details>
          {!detailedFeedbackAvailable && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
              <p className="text-sm text-muted">Prefere conferir tudo de uma vez?</p>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void revealAll()}
                className="border border-edge bg-surface px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
              >
                Revelar todas
              </button>
            </div>
          )}
        </header>

        {activeReview && (
          <section className="border border-primary bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Resultado ainda não contabilizado
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {reportedItems.length > 0
                    ? "Revise as questões denunciadas antes de gravar seu desempenho."
                    : "Conferiu o resultado? Grave para atualizar seu desempenho e agenda."}
                </p>
                {actionError && <p className="mt-2 text-xs font-semibold text-danger">{actionError}</p>}
              </div>
              <button
                type="button"
                onClick={onFinalize}
                disabled={isWorking}
                className="border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk transition hover:brightness-105 disabled:opacity-50"
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

        {detailedFeedbackAvailable && <section className="border border-primary bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">O que vale fazer agora</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight">{primaryAction.title}</h2>
              <p className="mt-1 text-sm text-muted">{primaryAction.detail}</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => router.push(primaryAction.href)}
                className="paper-control min-h-11 border border-primary bg-primary px-5 text-sm font-semibold text-primaryInk transition hover:brightness-105"
              >
                {primaryAction.title}
              </button>
              <button type="button" onClick={() => router.push("/hoje")} className="min-h-11 px-3 text-sm font-semibold text-muted hover:text-ink">
                Encerrar por hoje
              </button>
            </div>
          </div>
          {cognitivePattern && (
            <div className="mt-4 border border-warning/40 bg-[var(--amber-tint)] p-3">
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
                onClick={() => router.push("/cards")}
                className="mt-3 border border-warning/40 bg-surface px-3 py-1.5 text-xs font-semibold text-warning hover:border-warning"
              >
                Recalibrar próximo passo
              </button>
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {wrongItems.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("erros")}
                className="border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
              >
                Reparar erros
                <span className="mt-1 block text-xs font-normal text-muted">{diagnosedWrongCount} com diagnóstico de armadilha</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/cards/registros")}
              className="border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
            >
              Abrir caderno
              <span className="mt-1 block text-xs font-normal text-muted">Revisar notas e cards salvos</span>
            </button>
            {scheduledCount > 0 && (
              <button
                type="button"
              onClick={() => router.push("/cards")}
                className="border border-edge bg-paper px-4 py-3 text-left text-sm font-semibold text-ink hover:border-primary"
              >
                Continuar revisão
                <span className="mt-1 block text-xs font-normal text-muted">{scheduledCount} {scheduledCount === 1 ? "revisão criada" : "revisões criadas"}</span>
              </button>
            )}
          </div>
        </section>}

        {/* Etapa de correção: precede o gabarito e as abas. Só aparece enquanto
            há item elegível com feedback ainda oculto — revelado tudo, não há
            mais o que localizar sem o aluno já ter visto a resposta. */}
        {!correcaoSkipped && !detailedFeedbackAvailable ? (
          <CorrecaoStage
            token={token}
            session={session}
            onSessionChange={onSessionChange}
            onSkip={() => setCorrecaoSkipped(true)}
          />
        ) : null}

        <PostExamTabs
          tabs={TABS}
          activeTab={activeTab}
          onSelect={(tab) => {
            setActiveTab(tab);
            // Trocar o filtro recomeca a revisao no primeiro item dele. Manter o
            // cursor mostraria a questao 12 de "Erros" ao abrir "Marcadas".
            setCursor(0);
          }}
        />

        {/* Tab content */}
        {activeTab === "resumo" && detailedFeedbackAvailable && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance by node — or error fallback */}
            {diagnosisError && !diagnosis && !dismissedDiagnosisError && (
              <div className="km-card flex items-start justify-between gap-3 p-4">
                <p className="text-xs text-muted">Não foi possível carregar o diagnóstico.</p>
                <button type="button" onClick={() => setDismissedDiagnosisError(true)} aria-label="Fechar" className="-mr-1 -mt-0.5 shrink-0 p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
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
                      <div className="mt-1 h-1.5 w-full overflow-hidden bg-surfaceMuted">
                        <div
                          className={cx(
                            "h-full ",
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
                    onClick={() => router.push("/cards")}
                    className="flex w-full items-center justify-between border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
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
                    onClick={() => router.push("/cards")}
                    className="flex w-full items-center justify-between border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
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
                  onClick={() => router.push("/banco")}
                  className="flex w-full items-center justify-between border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
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
                        onClick={() => router.push(`/banco?theme=${encodeURIComponent(n.node_name ?? "")}&answer_status=unanswered_or_wrong`)}
                        className="flex items-center justify-between border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
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
                  <button type="button" onClick={() => setDismissedInsights(true)} aria-label="Fechar" className="-mr-1 -mt-0.5 shrink-0 p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  {diagnosis.impulsive_count >= 2 && (
                    <p>• {diagnosis.impulsive_count} questão(ões) rápidas e erradas.</p>
                  )}
                  {diagnosis.overconfident_count >= 2 && (
                    <p>• {diagnosis.overconfident_count} questão(ões) com excesso de confiança.</p>
                  )}
                </div>
              </div>
            )}

            {session.resolution_mode === "simulation" && wrongItems.length > 0 && (
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
                ? "Nenhum erro nesta sessão."
                : activeTab === "acertos"
                  ? "Nenhum acerto registrado nesta sessão."
                  : "Você não marcou nenhuma questão.";
            return (
              <div className="paper-dashed bg-surface p-8 text-center text-sm text-muted">
                {emptyMessage}
              </div>
            );
          }

          // Uma questao por vez, com indice e anterior/proxima — o mesmo
          // modelo do `ExamMap` que o aluno acabou de usar na prova. Antes esta
          // aba despejava TODAS as questoes do conjunto com enunciado e
          // alternativas abertos: revisar 25 erros de uma prova de 60 era uma
          // rolagem sem indice, sem volta e sem fim.
          const index = Math.min(Math.max(cursor, 0), displayItems.length - 1);
          const current = displayItems[index];

          return (
            <div className="grid gap-3" ref={reviewTopRef}>
              <PostExamIndex
                items={displayItems}
                currentPosition={current.position}
                onSelect={goToReviewIndex}
              />
              {[current].map((item) => {
                const selectedDiagnosis = item.selected_option ? item.distractor_diagnosis?.[item.selected_option] : null;
                const correction = correctionByQuestionId.get(item.question_id);
                const isExpanded = expandedCorrections.has(item.question_id);
                const trapId = `post-exam-trap-${item.position}`;

                return (
                  <article key={item.question_id} className="border border-edge bg-surface p-4 ">
                    <QuestionFullContext
                      eyebrow={`Questão ${item.position}`}
                      stem={item.stem}
                      alternatives={item.alternatives}
                      imageRefs={item.image_refs}
                      tableRefs={item.table_refs}
                      source={item.source}
                      knowledgeNodes={microNodes(item)}
                      selectedOption={item.selected_option}
                      correctAnswer={item.correct_answer}
                      isCorrect={item.is_correct}
                      showCorrectAnswer={item.feedback_state === "revealed"}
                      className="border border-edge bg-paper p-3"
                    />

                    {/* A revisão do raciocínio saiu daqui: virou `CorrecaoStage`,
                        uma etapa antes do gabarito. Enterrada como botão por
                        item, quem não abrisse item por item nunca descobria que
                        ela existia. */}

                    {activeReview && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setReportingPosition((prev) =>
                              prev === item.position ? null : item.position,
                            )
                          }
                          className="text-xs font-semibold text-muted transition hover:text-ink"
                        >
                          {item.reported_problem ? "Editar denuncia" : "Denunciar questão"}
                        </button>
                        {item.reported_problem && (
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
                    )}

                    {reportingPosition === item.position && (
                      <div className="mt-3 border border-edge bg-paper p-3">
                        <div className="flex flex-wrap gap-2">
                          {REPORT_OPTIONS.map(({ type, label }) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setReportType(type)}
                              className={cx(
                                "border px-2.5 py-1 text-xs font-semibold",
                                reportType === type
                                  ? "border-primary bg-primary text-primaryInk"
                                  : "border-edge text-muted hover:text-ink",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={reportReason}
                          onChange={(event) => setReportReason(event.target.value)}
                          maxLength={4000}
                          rows={3}
                          className="mt-3 w-full border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="O que parece errado nesta questão?"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReportingPosition(null)}
                            className="border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => void submitSessionReport(item)}
                            className="border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primaryInk disabled:opacity-50"
                          >
                            Enviar denuncia
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.selected_option && (
                        <span className={cx(
                          "border px-2.5 py-1 text-xs font-semibold",
                          item.is_correct ? "border-success/40 text-success" : "border-danger/40 text-danger",
                        )}>
                          Sua resposta: {item.selected_option}
                        </span>
                      )}
                      {item.doubtful && (
                        <span className="border border-warning/40 bg-[var(--amber-tint)] px-2.5 py-1 text-xs font-semibold text-warning">
                          Marcada
                        </span>
                      )}
                      {item.reported_problem && (
                        <span className="border border-warning/40 bg-[var(--amber-tint)] px-2.5 py-1 text-xs font-semibold text-warning">
                          Denunciada
                        </span>
                      )}
                      {item.excluded_from_scoring && !item.is_annulled && (
                        <span className="border border-edge bg-surfaceMuted px-2.5 py-1 text-xs font-semibold text-muted">
                          Descartada por você
                        </span>
                      )}
                      {/* Dois selos distintos porque as consequencias sao distintas:
                          anulada nao entra no seu desempenho, desatualizada entra.
                          Dizer "descartada" para as duas apagaria essa diferenca. */}
                      {item.is_annulled && (
                        <span className="border border-edge bg-surfaceMuted px-2.5 py-1 text-xs font-semibold text-muted">
                          Anulada pela banca · não conta
                        </span>
                      )}
                      {item.is_outdated && !item.is_annulled && (
                        <span className="border border-warning/40 bg-[var(--amber-tint)] px-2.5 py-1 text-xs font-semibold text-warning">
                          Conduta desatualizada
                        </span>
                      )}
                    </div>

                    {/* So na revisao, nunca durante a prova: saber de antemao que a
                        questao caiu quebraria a simulacao, e viver a questao mal
                        elaborada e' exatamente o que se treina aqui. */}
                    {item.annulled_justification && (
                      <div className="mt-3 border border-edge bg-surfaceMuted p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                          {item.is_annulled ? "Por que foi anulada" : "O que mudou desde a prova"}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink">
                          {item.annulled_justification.justificativa}
                        </p>
                        {item.annulled_justification.is_inferencia && (
                          <p className="mt-2 text-xs text-muted">
                            Leitura nossa do enunciado e das alternativas — a banca não publica
                            o motivo da anulação.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === "erros" && selectedDiagnosis && (
                      <div id={trapId} className="mt-3 border border-warning/50 bg-[var(--amber-tint)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-warning">Hipótese do erro</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink">{selectedDiagnosis}</p>
                      </div>
                    )}

                    {item.feedback_state === "revealed" && <div className="mt-3 flex flex-wrap items-center gap-3">
                      <PostExamItemActions
                        activeTab={activeTab}
                        activeReview={activeReview}
                        selectedDiagnosis={selectedDiagnosis ?? null}
                        onSaveRule={() =>
                          setQuickNoteTarget({
                            questionId: item.question_id,
                            noteIntent: "rule",
                            questionOutcome: "incorrect",
                            selectedOption: item.selected_option,
                            correctAnswer: item.correct_answer,
                            errorHypothesis: selectedDiagnosis ?? null,
                            highlightContext: item.text_highlights ?? [],
                          })
                        }
                        onCreateCard={() =>
                          setQuickNoteTarget({
                            questionId: item.question_id,
                            noteIntent: "card",
                            questionOutcome: "incorrect",
                            selectedOption: item.selected_option,
                            correctAnswer: item.correct_answer,
                            errorHypothesis: selectedDiagnosis ?? null,
                            highlightContext: item.text_highlights ?? [],
                          })
                        }
                        onReviewTrap={() => document.getElementById(trapId)?.scrollIntoView({ block: "center", behavior: "smooth" })}
                        onReport={() =>
                          setReportingPosition((prev) =>
                            prev === item.position ? null : item.position,
                          )
                        }
                      />
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
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={cx("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} aria-hidden="true">
                            <path d="m7 4 6 6-6 6" />
                          </svg>
                          Minha correção
                        </button>
                      )}
                    </div>}

                    {item.feedback_state === "revealed" && activeTab === "erros" && correction && isExpanded && (
                      <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-primary pl-3 text-xs leading-relaxed text-ink/80">
                        {correction.response_value}
                      </blockquote>
                    )}

                    {item.feedback_state === "revealed" && (
                      <LearningPackagePanel
                        token={token}
                        sessionId={session.session_id}
                        position={item.position}
                      />
                    )}
                  </article>
                );
              })}

              {displayItems.length > 1 && (
                <nav
                  aria-label="Navegar entre as questões revisadas"
                  className="flex items-center justify-between gap-3 border-t border-edge pt-3"
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => goToReviewIndex(index - 1)}
                    className="min-h-11 border border-edge px-4 text-sm font-semibold text-muted transition-colors enabled:hover:text-ink disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <p className="text-xs tabular-nums text-muted" aria-live="polite">
                    {index + 1} de {displayItems.length}
                  </p>
                  <button
                    type="button"
                    disabled={index >= displayItems.length - 1}
                    onClick={() => goToReviewIndex(index + 1)}
                    className="min-h-11 border border-primary bg-primary px-4 text-sm font-semibold text-primaryInk transition enabled:hover:brightness-[1.04] disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </nav>
              )}
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
      {quickNoteTarget && (
        <QuickNoteModal
          key={`${quickNoteTarget.questionId}-${quickNoteTarget.noteIntent}`}
          questionId={quickNoteTarget.questionId}
          defaultArea={session.area}
          defaultTheme={session.subtheme ?? session.theme ?? sessionDisplayLabel}
          questionOutcome={quickNoteTarget.questionOutcome}
          noteIntent={quickNoteTarget.noteIntent}
          selectedOption={quickNoteTarget.selectedOption}
          correctAnswer={quickNoteTarget.correctAnswer}
          errorHypothesis={quickNoteTarget.errorHypothesis}
          highlightContext={quickNoteTarget.highlightContext}
          onClose={() => setQuickNoteTarget(null)}
        />
      )}
    </main>
  );
}
