import { useEffect, useRef, useState } from "react";
import AreaDot from "@/components/AreaDot";
import { Button } from "@/components/ui/Button";
import {
  autoRescheduleReviewTask,
  deleteDirectedStudy,
  DirectedStudyEditImpactPreview,
  DirectedStudyListItem,
  previewAutoRescheduleReviewTask,
  ReviewTask,
  updateDirectedStudy,
  updateReviewTask,
} from "@/lib/api";
import { IconCheck, IconClipboardCheck, IconCritical, IconPencil, IconPlus, IconRefresh } from "../CronogramaIcons";
import {
  AREA_COLORS,
  Area,
  displayDate,
  getAccuracy,
  getRevisionNumber,
  isTopicStudy,
} from "../../_lib/cronogramaShared";
import { InlineLogForm } from "./InlineLogForm";
import { parseStudyEditImpactPreview } from "./shared";
import { getErrorMessage } from "@/lib/error-utils";
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
  const isDone = task.status === "done";
  const [showLog, setShowLog] = useState(false);
  const [editMode, setEditMode] = useState(false);
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
      .filter((s) => isTopicStudy(s) && s.area === task.area && s.theme === task.theme)
      .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
    return sorted[revision] ?? null;
  })() : null;
  const [editTotal, setEditTotal] = useState(String(editableStudy?.total_questions ?? ""));
  const [editCorrect, setEditCorrect] = useState(String(editableStudy?.correct_questions ?? ""));
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editImpactPreview, setEditImpactPreview] = useState<DirectedStudyEditImpactPreview | null>(null);
  const [editConfirmingImpact, setEditConfirmingImpact] = useState(false);

  async function runAutoReschedule() {
    setRescheduling(true);
    setRescheduleErr("");
    setManualErr("");
    setRescheduleInfo("");
    try {
      const updated = await autoRescheduleReviewTask(token, task.task_id);
      if (updated.due_date === task.due_date) {
        setRescheduleMode("manual");
        setRescheduleInfo("Sistema não encontrou data melhor. Escolha manualmente.");
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
        setRescheduleInfo("Sistema não encontrou data melhor. Escolha manualmente.");
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

  async function saveEdit(confirmImpact: boolean = false) {
    if (!editableStudy) return;
    const t = Number(editTotal); const c = Number(editCorrect);
    if (!t || c > t) { setEditErr("Verifique os valores."); return; }
    setEditErr("");
    if (!confirmImpact) setEditImpactPreview(null);
    setEditSaving(true);
    try {
      await updateDirectedStudy(token, editableStudy.study_id, {
        total_questions: t,
        correct_questions: c,
        ...(confirmImpact ? { confirm_impact: true } : {}),
      });
      onRefresh(); closeDetail();
    } catch (e: unknown) {
      const preview = parseStudyEditImpactPreview(e);
      if (preview) {
        setEditImpactPreview(preview);
      } else {
        setEditErr(getErrorMessage(e, "Erro."));
      }
      setEditSaving(false);
      setEditConfirmingImpact(false);
    }
  }

  async function confirmEditImpact() {
    if (editConfirmingImpact) return;
    setEditConfirmingImpact(true);
    await saveEdit(true);
  }

  if (isDone && cancelConfirm) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted italic">Revisão #{revision} · {task.area} / {task.theme}</p>
        <p className="text-xs text-muted">Cancelar esta revisão irá devolvê-la para a fila de pendentes.</p>
        {editableStudy?.import_session_id && (
          <p className="text-xs text-warning">Atenção: esta revisão possui uma correção salva que será perdida ao cancelar.</p>
        )}
        {cancelErr && <p className="text-xs text-red-600">{cancelErr}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="danger" size="sm" onClick={cancelRevision} loading={cancelingRevision}>
            {cancelingRevision ? "..." : "Confirmar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCancelConfirm(false)}>Voltar</Button>
        </div>
      </div>
    );
  }

  if (isDone && editMode) {
    return (
      <div className="mx-auto w-full max-w-xs space-y-2">
        <p className="text-xs text-muted italic">Alterar revisão #{revision} · {task.area} / {task.theme}</p>
        {editableStudy ? (
          <>
            {editableStudy.import_session_id && (
              <p className="text-xs text-warning">Atenção: alterar os dados irá apagar a correção salva.</p>
            )}
            <div className="flex gap-2 justify-center">
              <label className="text-xs text-muted flex flex-col gap-1">
                Total
                <input type="number" min={1} value={editTotal} onChange={(e) => { setEditTotal(e.target.value); setEditImpactPreview(null); }}
                  className="w-20 rounded-xl border border-edge bg-paper px-2 py-1 text-sm" />
              </label>
              <label className="text-xs text-muted flex flex-col gap-1">
                Acertos
                <input type="number" min={0} max={Number(editTotal)} value={editCorrect} onChange={(e) => { setEditCorrect(e.target.value); setEditImpactPreview(null); }}
                  className="w-20 rounded-xl border border-edge bg-paper px-2 py-1 text-sm" />
              </label>
            </div>
            {editImpactPreview && (
              <div className="rounded-xl border border-edge bg-[var(--amber-tint)] p-2 space-y-1">
                <p className="text-xs font-medium">Confirmar edição</p>
                <p className="text-xs text-muted">
                  Acuracia: {editImpactPreview.accuracy_before_pct.toFixed(1)}% -&gt; {editImpactPreview.accuracy_after_pct.toFixed(1)}%
                </p>
                {editImpactPreview.next_due_before && editImpactPreview.next_due_after && (
                  <p className="text-xs text-muted">
                    Próxima revisão: {displayDate(editImpactPreview.next_due_before)} -&gt; {displayDate(editImpactPreview.next_due_after)}
                  </p>
                )}
                <p className="text-xs text-muted">
                  Revisões futuras afetadas: {editImpactPreview.affected_future_studies}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={confirmEditImpact}
                    loading={editConfirmingImpact || editSaving}
                  >
                    {editConfirmingImpact || editSaving ? "..." : "Confirmar alteracao"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditImpactPreview(null)}
                  >
                    Revisar dados
                  </Button>
                </div>
              </div>
            )}
            {editErr && <p className="text-xs text-red-600">{editErr}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" onClick={() => saveEdit()} loading={editSaving}>
                {editSaving ? "..." : "Salvar"}
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={() => setCancelConfirm(true)}>
                Apagar revisão
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancelar</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted">Não foi possível localizar os dados desta revisão para editar.</p>
            <div className="flex gap-2">
              <Button type="button" variant="danger" size="sm" onClick={() => setCancelConfirm(true)}>
                Apagar revisão
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancelar</Button>
            </div>
          </>
        )}
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
      <div className="relative space-y-1 rounded-xl border border-edge bg-surface p-3 opacity-80">
        <button type="button" onClick={() => setEditMode(true)} className="absolute right-1.5 top-1.5 rounded-lg p-1 text-muted hover:bg-surfaceMuted hover:text-ink" title="Alterar">
          <IconPencil className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-2 pr-6">
          <div
            className="shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: AREA_COLORS[task.area] ?? "#ccc", opacity: 0.6 }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm leading-tight truncate">{task.theme}</p>
              <IconCheck className="w-3.5 h-3.5 text-ink shrink-0" />
            </div>
            <p className="text-xs text-muted">{task.area} · Revisão realizada</p>
          </div>
        </div>
        <p className="text-xs text-muted pl-5">
          {doneCorrect != null && doneTotal != null
            ? `${doneCorrect}/${doneTotal} questões · ${doneAccuracy}% acertos`
            : doneAccuracy !== null ? `${doneAccuracy}% acertos` : "-"}
        </p>
        {editableStudy?.import_session_id && (
          <a
            href="/banco-de-questoes"
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
          <p className="text-sm font-medium leading-tight">{task.theme}</p>
          <p className="text-xs text-muted">{task.area}</p>
        </div>
        {task.is_critical && <IconCritical className="w-3 h-3 inline ml-1 align-middle" />}
      </div>
      {showLog ? (
        <InlineLogForm task={task} token={token}
          onDone={() => { onRefresh(); closeDetail(); }} onCancel={() => setShowLog(false)} logDateISO={logDateISO} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-edge bg-paper/70 px-2 py-2.5">
              <p className="text-[11px] leading-none text-muted">Acertos</p>
              <p className="mt-1 text-base font-semibold text-ink">{accuracy !== null ? `${accuracy.toFixed(0)}%` : "-"}</p>
            </div>
            <div className="rounded-xl border border-edge bg-paper/70 px-2 py-2.5">
              <p className="text-[11px] leading-none text-muted">Revisão</p>
              <p className="mt-1 text-base font-semibold text-ink">#{revision}</p>
            </div>
            <div className="rounded-xl border border-edge bg-paper/70 px-2 py-2.5">
              <p className="text-[11px] leading-none text-muted">Min. q.</p>
              <p className="mt-1 text-base font-semibold text-ink">{task.expected_questions}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="flex-1"
              leftIcon={<IconPlus className="w-3.5 h-3.5" />}
              onClick={() => setShowLog(true)}
            >
              Registrar
            </Button>
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
            <div className="space-y-2 rounded-xl border border-edge bg-surface p-3">
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
                    className="flex-1 rounded-xl border border-edge bg-paper px-2 py-1.5 text-xs" />
                  <Button type="button" variant="secondary" size="sm" onClick={runManualReschedule} loading={manualSaving}>
                    {manualSaving ? "..." : "Confirmar"}
                  </Button>
                </div>
              )}
              {manualErr && <p className="text-xs text-red-600">{manualErr}</p>}
              {rescheduleErr && <p className="text-xs text-red-600">{rescheduleErr}</p>}
              {rescheduleInfo && <p className="text-xs text-ink text-center leading-tight">{rescheduleInfo}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}



