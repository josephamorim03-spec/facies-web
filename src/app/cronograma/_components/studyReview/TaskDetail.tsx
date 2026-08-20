import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AreaDot from "@/components/AreaDot";
import { Button } from "@/components/ui/Button";
import {
  autoRescheduleReviewTask,
  deleteDirectedStudy,
  DirectedStudyListItem,
  previewAutoRescheduleReviewTask,
  ReviewTask,
  updateReviewTask,
} from "@/lib/api";
import { IconCheck, IconClipboardCheck, IconCritical, IconPencil, IconRefresh } from "../CronogramaIcons";
import {
  AREA_COLORS,
  Area,
  displayDate,
  getAccuracy,
  getRevisionNumber,
  isTopicStudy,
  sameTopicIdentity,
  topicPrimaryLabel,
  topicSecondaryLabel,
} from "../../_lib/cronogramaShared";
import { getErrorMessage } from "@/lib/error-utils";
import { ReviewSignalChips } from "../ReviewSignalChips";
export function TaskDetail({ task, token, studies, studyMap, onRefresh, onClose, rescheduleControls = "auto_only", logDateISO }: {
  task: ReviewTask; token: string; studies: DirectedStudyListItem[];
  studyMap: Map<string, DirectedStudyListItem>;
  onRefresh: () => void;
  onClose: () => void;
  rescheduleControls?: "auto_only" | "auto_manual";
  logDateISO?: string | null;
}) {
  function closeDetail() {
    if (typeof onClose === "function") onClose();
  }

  const accuracy = getAccuracy(task, studies);
  const revision = getRevisionNumber(task, studies, studyMap);
  const displayLabel = topicPrimaryLabel(task) || task.theme;
  const parentThemeLabel = topicSecondaryLabel(task);
  const isDone = task.status === "done";
  const [cancelingRevision, setCancelingRevision] = useState(false);
  const [cancelErr, setCancelErr] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [preparingAutoReschedule, setPreparingAutoReschedule] = useState(false);
  const [rescheduleErr, setRescheduleErr] = useState("");
  const [rescheduleInfo, setRescheduleInfo] = useState("");
  const [autoSuggestedDueDate, setAutoSuggestedDueDate] = useState<string | null>(null);
  const rescheduleInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!rescheduleInfo) return;
    if (rescheduleInfoTimer.current) clearTimeout(rescheduleInfoTimer.current);
    rescheduleInfoTimer.current = setTimeout(() => setRescheduleInfo(""), 6000);
    function dismiss() { setRescheduleInfo(""); }
    document.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      if (rescheduleInfoTimer.current) clearTimeout(rescheduleInfoTimer.current);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [rescheduleInfo]);
  const [rescheduleMode, setRescheduleMode] = useState<"auto" | "manual">("auto");
  const [manualDueDate, setManualDueDate] = useState(task.due_date);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualErr, setManualErr] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  // For editing a done review: find the study logged when this revision was completed
  const editableStudy = task.status === "done" ? (() => {
    const byTaskId = studies.find((s) => s.origin_review_task_id === task.task_id);
    if (byTaskId) return byTaskId;
    const sorted = studies
      .filter((s) => isTopicStudy(s) && sameTopicIdentity(s, task))
      .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
    return sorted[revision] ?? null;
  })() : null;

  // Revisões são concluídas resolvendo questões do banco (com o review_task_id
  // amarrado), não por registro manual de acertos.
  const studyReviewHref = (() => {
    const params = new URLSearchParams({
      review_task_id: task.task_id,
      activity_id: task.task_id,
      source: "calendar-review",
      date: logDateISO || task.due_date,
      area: task.area,
      theme: topicPrimaryLabel(task) || task.theme,
      expected_questions: String(Math.max(1, Number(task.expected_questions) || 1)),
    });
    if (task.knowledge_node_id) params.set("knowledge_node_id", task.knowledge_node_id);
    return `/banco?${params.toString()}`;
  })();

  async function runAutoReschedule() {
    setRescheduling(true);
    setRescheduleErr("");
    setManualErr("");
    setRescheduleInfo("");
    try {
      const updated = await autoRescheduleReviewTask(token, task.task_id);
      if (updated.due_date === task.due_date) {
        setRescheduleMode("manual");
        setRescheduleInfo("Sem data melhor. Escolha manualmente.");
        return;
      }
      onRefresh();
      closeDetail();
    } catch (e: unknown) {
      setRescheduleErr(getErrorMessage(e, "Erro ao reagendar."));
    } finally {
      setRescheduling(false);
    }
  }

  async function prepareAutoReschedule() {
    setPreparingAutoReschedule(true);
    setRescheduleErr("");
    setManualErr("");
    setRescheduleInfo("");
    setAutoSuggestedDueDate(null);
    try {
      const preview = await previewAutoRescheduleReviewTask(token, task.task_id);
      if (preview.due_date === task.due_date) {
        setRescheduleMode("manual");
        setRescheduleInfo("Sem data melhor. Escolha manualmente.");
        return;
      }
      setAutoSuggestedDueDate(preview.due_date);
    } catch (e: unknown) {
      setRescheduleErr(getErrorMessage(e, "Erro ao preparar reagendamento."));
    } finally {
      setPreparingAutoReschedule(false);
    }
  }

  async function runManualReschedule() {
    if (!manualDueDate) {
      setManualErr("Selecione uma data.");
      return;
    }
    setManualSaving(true);
    setManualErr("");
    setRescheduleErr("");
    try {
      await updateReviewTask(token, task.task_id, { due_date: manualDueDate });
      onRefresh();
      closeDetail();
    } catch (e: unknown) {
      setManualErr(getErrorMessage(e, "Erro ao reagendar manualmente."));
      setManualSaving(false);
    }
  }

  useEffect(() => {
    if (!showReschedule) {
      setRescheduleMode("auto");
      setRescheduleInfo("");
      setRescheduleErr("");
      setAutoSuggestedDueDate(null);
    }
  }, [showReschedule]);

  useEffect(() => {
    if (rescheduleMode === "manual") {
      setAutoSuggestedDueDate(null);
    }
  }, [rescheduleMode]);

  async function cancelRevision() {
    setCancelingRevision(true);
    try {
      await updateReviewTask(token, task.task_id, { status: "pending" });
      onRefresh(); closeDetail();
    } catch (e: unknown) { setCancelErr(getErrorMessage(e, "Erro.")); setCancelingRevision(false); }
  }

  if (isDone && cancelConfirm) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted italic">Revisão #{revision} · {task.area} / {displayLabel}</p>
        <p className="text-xs text-muted">Volta para a fila de pendentes.</p>
        {editableStudy?.import_session_id && (
          <p className="text-xs text-warning">Atenção: esta revisão possui uma correção salva que será perdida ao cancelar.</p>
        )}
        {cancelErr && <p className="text-xs text-danger">{cancelErr}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="danger" size="sm" onClick={cancelRevision} loading={cancelingRevision}>
            {cancelingRevision ? "..." : "Confirmar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCancelConfirm(false)}>Voltar</Button>
        </div>
      </div>
    );
  }

  if (isDone) {
    const doneCorrect = editableStudy?.correct_questions;
    const doneTotal = editableStudy?.total_questions;
    const doneAccuracy = editableStudy
      ? editableStudy.accuracy.toFixed(0)
      : accuracy !== null ? accuracy.toFixed(0) : null;
    return (
      <div className="relative space-y-1 rounded-surface border border-edge bg-surface p-3 opacity-80">
        <button type="button" onClick={() => setCancelConfirm(true)} className="absolute right-1.5 top-1.5 rounded-surface p-1 text-muted hover:bg-surfaceMuted hover:text-ink" title="Reabrir revisão">
          <IconPencil className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-2 pr-6">
          <div
            className="shrink-0 w-2.5 h-2.5 rounded-control"
            style={{ backgroundColor: AREA_COLORS[task.area] ?? "#ccc", opacity: 0.6 }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm leading-tight truncate">{displayLabel}</p>
              <IconCheck className="w-3.5 h-3.5 text-ink shrink-0" />
            </div>
            <p className="text-xs text-muted">
              {task.area} · {parentThemeLabel ? `${parentThemeLabel} · ` : ""}Revisão realizada
            </p>
            <ReviewSignalChips task={task} compact className="mt-1" />
          </div>
        </div>
        <p className="text-xs text-muted pl-5">
          {doneCorrect != null && doneTotal != null
            ? `${doneCorrect}/${doneTotal} questões · ${doneAccuracy}% acertos`
            : doneAccuracy !== null ? `${doneAccuracy}% acertos` : "-"}
        </p>
        {editableStudy?.import_session_id && (
          <a
            href="/banco"
            className="absolute bottom-1.5 right-1.5 inline-flex items-center justify-center text-muted hover:text-ink"
            title="Ver correção do simulado"
          >
            <IconClipboardCheck className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AreaDot area={task.area as Area} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{displayLabel}</p>
          <p className="text-xs text-muted">
            {task.area}{parentThemeLabel ? ` · ${parentThemeLabel}` : ""}
          </p>
        </div>
        {task.is_critical && <IconCritical className="w-3 h-3 inline ml-1 align-middle" />}
      </div>
      <ReviewSignalChips task={task} className="pl-7" />
      <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-surface border border-edge bg-paper/70 px-2 py-2.5">
              <p className="text-[11px] leading-none text-muted">Acertos</p>
              <p className="mt-1 text-base font-semibold text-ink">{accuracy !== null ? `${accuracy.toFixed(0)}%` : "-"}</p>
            </div>
            <div className="rounded-surface border border-edge bg-paper/70 px-2 py-2.5">
              <p className="text-[11px] leading-none text-muted">Revisão</p>
              <p className="mt-1 text-base font-semibold text-ink">#{revision}</p>
            </div>
            <div className="rounded-surface border border-edge bg-paper/70 px-2 py-2.5">
              <p className="text-[11px] leading-none text-muted">Min. q.</p>
              <p className="mt-1 text-base font-semibold text-ink">{task.expected_questions}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={studyReviewHref}
              className="inline-flex flex-1 items-center justify-center rounded-surface border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk transition hover:brightness-105"
            >
              Estudar no banco
            </Link>
            <Button
              type="button"
              variant={showReschedule ? "primary" : "secondary"}
              size="sm"
              leftIcon={<IconRefresh className="w-3.5 h-3.5" />}
              onClick={() => setShowReschedule((v) => !v)}
            >
              Reagendar
            </Button>
          </div>
          {showReschedule && (
            <div className="space-y-2 rounded-surface border border-edge bg-surface p-3">
              {rescheduleControls === "auto_manual" && (
                <div className="flex justify-center gap-1">
                  <Button type="button" variant={rescheduleMode === "auto" ? "primary" : "secondary"} size="xs" onClick={() => setRescheduleMode("auto")}>
                    Auto
                  </Button>
                  <Button type="button" variant={rescheduleMode === "manual" ? "primary" : "secondary"} size="xs" onClick={() => setRescheduleMode("manual")}>
                    Manual
                  </Button>
                </div>
              )}
              {(rescheduleControls === "auto_only" || rescheduleMode === "auto") && (
                <div className="space-y-2">
                  {autoSuggestedDueDate ? (
                    <>
                      <p className="text-xs text-ink text-center leading-tight">
                        Sugestão de reagendamento: <strong>{displayDate(autoSuggestedDueDate)}</strong>. Confirmar?
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={runAutoReschedule}
                          loading={rescheduling}
                          leftIcon={<IconRefresh className="w-3.5 h-3.5" />}
                        >
                          {rescheduling ? "..." : "Confirmar"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setAutoSuggestedDueDate(null)}
                          disabled={rescheduling}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={prepareAutoReschedule}
                      loading={preparingAutoReschedule || rescheduling}
                      className="w-full"
                      leftIcon={<IconRefresh className="w-3.5 h-3.5" />}
                    >
                      {(preparingAutoReschedule || rescheduling) ? "..." : "Reagendar auto"}
                    </Button>
                  )}
                </div>
              )}
              {(rescheduleControls === "auto_manual" && rescheduleMode === "manual") && (
                <div className="flex gap-2 items-center">
                  <input type="date" value={manualDueDate} onChange={(e) => setManualDueDate(e.target.value)}
                    className="flex-1 rounded-surface border border-edge bg-paper px-2 py-1.5 text-xs" />
                  <Button type="button" variant="secondary" size="sm" onClick={runManualReschedule} loading={manualSaving}>
                    {manualSaving ? "..." : "Confirmar"}
                  </Button>
                </div>
              )}
              {manualErr && <p className="text-xs text-danger">{manualErr}</p>}
              {rescheduleErr && <p className="text-xs text-danger">{rescheduleErr}</p>}
              {rescheduleInfo && <p className="text-xs text-ink text-center leading-tight">{rescheduleInfo}</p>}
            </div>
          )}
        </>
    </div>
  );
}



