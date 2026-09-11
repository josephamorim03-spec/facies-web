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
import { Button } from "@/components/ui/Button";
import { FormularioDeDenuncia } from "./_postExamReview/FormularioDeDenuncia";
import { getAPIErrorMessage } from "@/lib/api/shared/http";
import { useToast } from "@/lib/useToast";
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
import { FLASHCARDS_LIGADOS } from "@/lib/flags";
import { CorrecaoStage } from "./CorrecaoStage";
import LearningPackagePanel from "./LearningPackagePanel";

const ExamDebrief = dynamic(() => import("./ExamDebrief"), {
  ssr: false,
  loading: () => <div className="paper-skeleton h-24 rounded-control border border-edge bg-surface" aria-hidden="true" />,
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
  /**
   * ⚠️ `cta` EXISTE PARA O BOTAO PARAR DE REPETIR O TITULO.
   *
   * O cartao imprimia `title` duas vezes: como `<h2>` e como rotulo do botao,
   * logo abaixo. Alem de redundante, isso fazia o botao herdar frases longas
   * ("Treinar Decidir a conduta na angina instavel...") num controlo que tem de
   * caber a 390px.
   *
   * O `title` diz O QUE E'; o `cta` diz o ATO. Sao campos diferentes porque sao
   * perguntas diferentes.
   */
  const primaryAction = recommendedBlock
    ? {
        title: `Treinar ${recommendedBlock.label}`,
        cta: "Treinar agora",
        detail: `${recommendedBlock.recommended_question_count} questão(ões) em ~${recommendedBlock.estimated_minutes} min · ${recommendedBlock.why_now}`,
        href: `/banco?knowledge_node_ids=${encodeURIComponent(recommendedBlock.node_id)}&answer_status=unanswered_or_wrong`,
      }
    : primaryWeakNode
    ? {
        title: `Treinar ${primaryWeakNode.node_name ?? "microcompetência fraca"}`,
        cta: "Treinar agora",
        detail: `${formatAccuracy(primaryWeakNode.accuracy)} de acerto nesta sessão · ${primaryWeakNode.correct + primaryWeakNode.wrong} questão(ões)`,
        href: `/banco?theme=${encodeURIComponent(primaryWeakNode.node_name ?? "")}&answer_status=unanswered_or_wrong`,
      }
    : wrongItems.length > 0
      ? {
          title: "Revisar os erros desta sessão",
          cta: "Revisar os erros",
          detail: `${wrongItems.length} questão(ões) para reconstruir raciocínio`,
          href: "/banco?answer_status=wrong",
        }
      : markedItems.length > 0
        ? {
            title: "Rever questões marcadas",
            cta: "Rever as marcadas",
            detail: `${markedItems.length} questão(ões) que merecem segunda leitura`,
            href: "/banco?answer_status=answered",
          }
        : {
            title: "Iniciar novo bloco adaptativo",
            cta: "Começar outro bloco",
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

  const { showToast } = useToast();
  const quickNoteItem = quickNoteTarget
    ? session.items.find((item) => item.question_id === quickNoteTarget.questionId)
    : undefined;
  const examLike = isFullExam || session.resolution_mode === "simulation";

  async function revealAll() {
    if (!window.confirm("Revelar agora as respostas e comentários de todas as questões?")) return;
    setRevealBusy(true);
    try {
      onSessionChange?.(
        await revealAllQuestionBankFeedback(token, session.session_id),
      );
    } catch (err) {
      // ⚠️ Sem este `catch`, 409/401/rede viravam rejeição não tratada e o
      // botão parecia morto. `getAPIErrorMessage` porque erro de API não é
      // `Error` -- ver `http.ts`.
      showToast(
        getAPIErrorMessage(err)
          ?? "Não foi possível revelar as respostas agora. Tente novamente em instantes.",
        "error",
      );
    } finally {
      setRevealBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {examLike && detailedFeedbackAvailable && <ExamDebrief sessionId={session.session_id} />}

        <header className="rounded-surface border border-edge bg-surface p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="paper-eyebrow">
                O que você fez · {resultLabel}
              </p>
              <h1 className="mt-1 font-serif font-semibold">
                {sessionDisplayLabel}
              </h1>
              <div className="mt-4 border border-primary/30 bg-[var(--wash-selecao)] p-4">
                <p className="paper-eyebrow text-primary">O que você aprendeu</p>
                <h2 className="mt-1 font-serif font-semibold leading-tight text-ink">{gainTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{gainDetail}</p>
              </div>
            </div>
            <ScoreReadout pct={accuracy * 100} label="Acerto na prova" color={accuracyColor(accuracy)} />
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-muted">Ver métricas da sessão</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-surface border border-edge bg-paper px-4 py-3">
              <p className="paper-eyebrow">Acertos</p>
              <p className="mt-1 text-2xl font-bold text-success">{correctItems.length}</p>
            </div>
            <div className="rounded-surface border border-edge bg-paper px-4 py-3">
              <p className="paper-eyebrow">Erros</p>
              <p className="mt-1 text-2xl font-bold text-danger">{wrongItems.length}</p>
            </div>
            <div className="rounded-surface border border-edge bg-paper px-4 py-3">
              <p className="paper-eyebrow">Marcadas</p>
              <p className="mt-1 text-2xl font-bold text-warning">{markedItems.length}</p>
            </div>
            <div className="rounded-surface border border-edge bg-paper px-4 py-3">
              <p className="paper-eyebrow">Em branco</p>
              <p className="mt-1 text-2xl font-bold text-muted">{unansweredItems.length}</p>
            </div>
            <div className="rounded-surface border border-edge bg-paper px-4 py-3">
              <p className="paper-eyebrow">Descartadas</p>
              <p className="mt-1 text-2xl font-bold text-muted">{excludedItems.length}</p>
            </div>
            </div>
          </details>
          {!detailedFeedbackAvailable && (
            /* ⚠️ Comentário de JS, e não de JSX entre chavetas: logo depois de
               `&& (` ainda não há filhos de JSX onde o pôr.

               EMPILHA E CENTRA ABAIXO DE `sm`, como as outras linhas de
               rótulo+controlo do app. `justify-between` servia o desktop e
               espremia o botão contra a margem direita a 390px.

               Centra a LINHA inteira, pergunta incluída: centrar só o botão
               separá-lo-ia do texto que o motiva. */
            <div className="mt-4 flex flex-col items-center gap-3 border-t border-edge pt-4 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-left">
              <p className="text-sm text-muted">Prefere conferir tudo de uma vez?</p>
              {/* Era um botão à mão com alvo de ~38px; o primitivo dá 44px. */}
              <Button
                type="button"
                variant="secondary"
                size="md"
                bloco
                disabled={isWorking}
                onClick={() => void revealAll()}
              >
                Revelar todas
              </Button>
            </div>
          )}
        </header>

        {activeReview && (
          <section className="border border-primary bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="paper-eyebrow text-primary">
                  Resultado ainda não contabilizado
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {reportedItems.length > 0
                    ? "Revise as questões denunciadas antes de gravar seu desempenho."
                    : "Conferiu o resultado? Grave para atualizar seu desempenho e agenda."}
                </p>
                {actionError && <p className="mt-2 text-xs text-danger">{actionError}</p>}
              </div>
              {/* A ação que fecha a prova: pelo primitivo, e de largura total
                  no telemóvel. Era um botão à mão com `hover:brightness-105`
                  próprio e alvo abaixo dos 44px. */}
              <Button
                type="button"
                variant="primary"
                size="md"
                bloco
                onClick={onFinalize}
                disabled={isWorking}
              >
                Contabilizar resultado
              </Button>
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
              <p className="paper-eyebrow text-primary">O que vale fazer agora</p>
              <h2 className="mt-1 font-serif font-semibold leading-tight">{primaryAction.title}</h2>
              <p className="mt-1 text-sm text-muted">{primaryAction.detail}</p>
            </div>
            {/* ⚠️ `grid`, e nao `flex flex-col` de largura de conteudo.
                A coluna era item de um `flex-wrap`: a 390px enrolava e assentava
                a ESQUERDA; a partir de `sm:` o `items-end` empurrava para a
                DIREITA. Nunca centrada, e os dois botoes saiam com larguras
                diferentes um do outro (`px-5` contra `px-3`) dentro do mesmo
                cartao -- que foi o que o operador viu.

                `grid gap-2` estica os dois a mesma largura e o `justify-center`
                do `Button` centra cada rotulo. E' o arranjo que o irmao
                `SaidaDaSessao` ja usava. */}
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:min-w-[16rem]">
              <Button variant="primary" size="md" onClick={() => router.push(primaryAction.href)}>
                {primaryAction.cta}
              </Button>
              <Button variant="ghost" size="md" onClick={() => router.push("/hoje")}>
                Encerrar por hoje
              </Button>
            </div>
          </div>
          {cognitivePattern && (
            <div className="mt-4 border border-warning/40 bg-[var(--wash-atencao)] p-3">
              <p className="paper-eyebrow text-warning">
                Padrão cognitivo dominante
              </p>
              <h3 className="mt-1 font-serif font-semibold text-ink">
                {cognitivePattern.label}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {cognitivePattern.phrase}
              </p>
              {/* ⚠️ IA PARA `/cards`, QUE NAO ABRE. O padrao cognitivo nao tem
                  nada a ver com flashcards: recalibrar o passo seguinte e
                  exatamente o que o Hoje faz, e e para la que isto aponta. */}
              <button
                type="button"
                onClick={() => router.push("/hoje")}
                className="mt-3 border border-warning/40 bg-surface px-3 py-1.5 text-xs text-warning hover:border-warning"
              >
                Recalibrar próximo passo
              </button>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {wrongItems.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("erros")}
                className="rounded-control border border-edge bg-paper px-4 py-3 text-left text-sm font-medium text-ink hover:border-primary"
              >
                Reparar erros
                <span className="mt-1 block text-xs font-normal text-muted">{diagnosedWrongCount} com diagnóstico de armadilha</span>
              </button>
            )}
            {/* O UNICO destino de Cards desta tela, e por isso o unico com
                gate. Com a chave desligada ele aterrissava em `/hoje` por um
                307 -- o aluno tocava "Abrir caderno" e ia parar noutro dia. */}
            {FLASHCARDS_LIGADOS && (
              <button
                type="button"
                onClick={() => router.push("/cards/registros")}
                className="rounded-control border border-edge bg-paper px-4 py-3 text-left text-sm font-medium text-ink hover:border-primary"
              >
                Abrir caderno
                <span className="mt-1 block text-xs font-normal text-muted">Revisar notas e cards salvos</span>
              </button>
            )}
            {/* `scheduledCount` conta `created_tasks`, que sao tarefas do
                CRONOGRAMA -- nao cards. O destino estava simplesmente errado, e
                a propria legenda do outro botao ja dizia que a revisao fica
                programada no cronograma. */}
            {scheduledCount > 0 && (
              <button
                type="button"
                onClick={() => router.push("/cronograma")}
                className="rounded-control border border-edge bg-paper px-4 py-3 text-left text-sm font-medium text-ink hover:border-primary"
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
        {/* 🚨 `grid-cols-1` NO TELEMOVEL, e nao so' `md:grid-cols-2`.
            MEDIDO na CI (run 34464471909): 430px de estouro a 390px, com o
            guard a nomear o botao culpado.

            Um `grid` sem `grid-cols-*` cria a pista IMPLICITA, que e' `auto` --
            e o minimo de uma pista `auto` e' o min-content do conteudo. La
            dentro ha' `truncate` (= `white-space: nowrap`), cujo min-content e'
            a frase INTEIRA: os rotulos de microcompetencia sao a frase mais
            longa do produto ("Decidir a conduta na angina instavel quanto a
            cateterismo cardiaco com tempo para estrategia invasiva <= 24h").

            ⚠️ A primeira tentativa de conserto escreveu
            `md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]` e parou ai'. Nao
            consertou nada onde o defeito foi fotografado: `md:` comeca aos
            768px, `sm:` aos 640px, e a captura do operador era de telemovel.
            A pista base ficou `auto` nos tres blocos.

            `grid-cols-1` E' `repeat(1, minmax(0, 1fr))` no Tailwind -- e' por
            isso que o `grid-cols-2` da faixa de contadores nunca estourou. A
            regra que fica: num `grid` que contenha texto, declarar as colunas
            do telemovel para cima, nunca so' no breakpoint grande. */}
        {activeTab === "resumo" && detailedFeedbackAvailable && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Performance by node — or error fallback */}
            {diagnosisError && !diagnosis && !dismissedDiagnosisError && (
              <div className="paper-surface flex items-start justify-between gap-3 p-4">
                <p className="text-xs text-muted">Não foi possível carregar o diagnóstico.</p>
                <button type="button" onClick={() => setDismissedDiagnosisError(true)} aria-label="Fechar" className="-mr-1 -mt-0.5 shrink-0 p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
                </button>
              </div>
            )}
            {/* ⚠️ `min-w-0` E' O CONSERTO, e nao enfeite.
                Sem ele este cartao e' um item de grelha com `min-width: auto`,
                e o `truncate` do rotulo abaixo deixa de truncar: passa a EMPURRAR
                a pista ate' caber a frase toda.

                A prova de que o diagnostico e' este esta no irmao: o
                `ExamDebrief` tem markup identico (`truncate` dentro de `flex
                justify-between`) e NAO estoura, porque o antecessor dele e' um
                `<ul>` de bloco, com largura definida. */}
            {diagnosis && diagnosis.nodes.length > 0 && (
              <div className="paper-surface min-w-0 p-4">
                <p className="paper-eyebrow">Desempenho por tema</p>
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
            <div className="paper-surface p-4">
              <p className="paper-eyebrow">Ações recomendadas</p>
              <div className="mt-3 space-y-2">
                {wrongItems.length > 0 && (
                  <button
                    type="button"
                    // Os erros estao NESTA tela, na aba "Erros". Mandar para
                    // outra rota era perder o contexto da sessao recem-feita.
                    onClick={() => setActiveTab("erros")}
                    className="flex w-full items-center justify-between rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">Revisar só erros</p>
                      <p className="text-xs text-muted">{wrongItems.length} questões para revisar</p>
                    </div>
                    <span className="text-muted">→</span>
                  </button>
                )}
                {finalizeOut && finalizeOut.created_tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => router.push("/cronograma")}
                    className="flex w-full items-center justify-between rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
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
                  className="flex w-full items-center justify-between rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">Nova sessão</p>
                    <p className="text-xs text-muted">Voltar ao banco de questões</p>
                  </div>
                  <span className="text-muted">→</span>
                </button>
              </div>
            </div>

            {/* 🚨 ESTE E' O BLOCO QUE O GUARD APANHOU: 787px de largura numa
                viewport de 390. Mesma forma do bloco de desempenho, e o mesmo
                conserto -- `grid-cols-1` na pista do telemovel.

                ⚠️ O `min-w-0` do botao e' CINTO, nao o conserto -- e eu
                afirmei o contrario antes de medir. Num repro da cadeia inteira
                (grelha externa > cartao > grelha interna > botao) a 390px, o
                botao fica com 356px com ou sem ele; sem `grid-cols-1` fica com
                706px nos dois casos. A razao e' de especificacao: o minimo
                automatico de um item de grelha so' se aplica quando a funcao
                MINIMA da pista e' `auto`, e em `minmax(0,1fr)` ela e' `0`.
                Fica porque protege a cadeia se alguem devolver a pista a `auto`.
                O `<p>` nao precisa de nenhum dos dois: `truncate` traz
                `overflow: hidden`, e isso ja' zera o minimo automatico. */}
            {diagnosis && diagnosis.nodes.some((n) => n.accuracy < 0.5 && (n.correct + n.wrong) >= 2) && (
              <div className="paper-surface min-w-0 p-4 md:col-span-2">
                <p className="paper-eyebrow">Focar nestes temas</p>
                <p className="mt-1 text-xs text-muted">Abaixo de 50% de acerto nesta sessão</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {diagnosis.nodes
                    .filter((n) => n.accuracy < 0.5 && (n.correct + n.wrong) >= 2)
                    .slice(0, 4)
                    .map((n) => (
                      <button
                        key={n.knowledge_node_id}
                        type="button"
                        onClick={() => router.push(`/banco?theme=${encodeURIComponent(n.node_name ?? "")}&answer_status=unanswered_or_wrong`)}
                        className="flex min-w-0 items-center justify-between rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{n.node_name ?? "—"}</p>
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
              <div className="paper-surface border-warning/40 p-4 md:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="paper-eyebrow text-warning">Padrão identificado</p>
                  <button type="button" onClick={() => setDismissedInsights(true)} aria-label="Fechar" className="-mr-1 -mt-0.5 shrink-0 p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  {diagnosis.impulsive_count >= 2 && (
                    <p>• Em {diagnosis.impulsive_count}, a resposta saiu antes de a leitura fechar.</p>
                  )}
                  {diagnosis.overconfident_count >= 2 && (
                    <p>• Em {diagnosis.overconfident_count}, a confiança ficou acima da evidência.</p>
                  )}
                </div>
              </div>
            )}

            {/* ⚠️ 261 linhas de painel que OFERECIAM criar cards de uma tela que
                nao abre. Ele era montado sem gate nenhum, entao o aluno podia
                gerar flashcards e nunca mais encontra-los. */}
            {FLASHCARDS_LIGADOS && session.resolution_mode === "simulation" && wrongItems.length > 0 && (
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
            <div className="grid grid-cols-1 gap-3" ref={reviewTopRef}>
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
                  <article key={item.question_id} className="rounded-surface border border-edge bg-surface p-4 ">
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
                      className="rounded-control border border-edge bg-paper p-3"
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
                          className="text-xs text-muted transition hover:text-ink"
                        >
                          {item.reported_problem ? "Editar denuncia" : "Denunciar questão"}
                        </button>
                        {item.reported_problem && (
                          <label className="inline-flex items-center gap-1.5 text-xs text-ink">
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
                      <FormularioDeDenuncia
                        opcoes={REPORT_OPTIONS}
                        tipo={reportType}
                        aoEscolherTipo={setReportType}
                        motivo={reportReason}
                        aoEscreverMotivo={setReportReason}
                        ocupado={isWorking}
                        aoCancelar={() => setReportingPosition(null)}
                        aoEnviar={() => void submitSessionReport(item)}
                      />
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.selected_option && (
                        <span className={cx(
                          "border px-2.5 py-1 text-xs",
                          item.is_correct ? "border-success/40 text-success" : "border-danger/40 text-danger",
                        )}>
                          Sua resposta: {item.selected_option}
                        </span>
                      )}
                      {item.doubtful && (
                        <span className="border border-warning/40 bg-[var(--wash-atencao)] px-2.5 py-1 text-xs text-warning">
                          Marcada
                        </span>
                      )}
                      {item.reported_problem && (
                        <span className="border border-warning/40 bg-[var(--wash-atencao)] px-2.5 py-1 text-xs text-warning">
                          Denunciada
                        </span>
                      )}
                      {item.excluded_from_scoring && !item.is_annulled && (
                        <span className="rounded-control border border-edge bg-surfaceMuted px-2.5 py-1 text-xs text-muted">
                          Descartada por você
                        </span>
                      )}
                      {/* Dois selos distintos porque as consequencias sao distintas:
                          anulada nao entra no seu desempenho, desatualizada entra.
                          Dizer "descartada" para as duas apagaria essa diferenca. */}
                      {item.is_annulled && (
                        <span className="rounded-control border border-edge bg-surfaceMuted px-2.5 py-1 text-xs text-muted">
                          Anulada pela banca · não conta
                        </span>
                      )}
                      {item.is_outdated && !item.is_annulled && (
                        <span className="border border-warning/40 bg-[var(--wash-atencao)] px-2.5 py-1 text-xs text-warning">
                          Conduta desatualizada
                        </span>
                      )}
                    </div>

                    {/* So na revisao, nunca durante a prova: saber de antemao que a
                        questao caiu quebraria a simulacao, e viver a questao mal
                        elaborada e' exatamente o que se treina aqui. */}
                    {item.annulled_justification && (
                      <div className="mt-3 rounded-control border border-edge bg-surfaceMuted p-3">
                        <p className="paper-eyebrow">
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

                    {/* Gabarito duplo: a banca aceitou mais de uma alternativa.
                        Ao contrário da anulada, a decisão AQUI é da banca e está
                        no gabarito dela — por isso o texto afirma, não pondera.
                        Sem este aviso, quem marcou a segunda aceita vê "acertou"
                        sem entender por quê, e desconfia do nosso gabarito. */}
                    {item.dual_answer && (
                      <div className="mt-3 rounded-control border border-edge bg-surfaceMuted p-3">
                        <p className="paper-eyebrow">Duas alternativas corretas</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink">
                          {item.dual_answer.nota}
                        </p>
                      </div>
                    )}

                    {activeTab === "erros" && selectedDiagnosis && (
                      <div id={trapId} className="mt-3 border border-warning/50 bg-[var(--wash-atencao)] p-3">
                        <p className="paper-eyebrow text-warning">Hipótese do erro</p>
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
                          className="text-xs text-muted transition hover:text-ink"
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
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-ink"
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
                    className="min-h-11 border border-edge px-4 text-sm font-medium text-muted transition-colors enabled:hover:text-ink disabled:opacity-40"
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
                    className="min-h-11 border border-primary bg-primary px-4 text-sm font-medium text-primaryInk transition enabled:hover:brightness-[1.04] disabled:opacity-40"
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
          sessionId={session.session_id}
          stem={quickNoteItem?.stem}
          alternatives={quickNoteItem?.alternatives}
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
