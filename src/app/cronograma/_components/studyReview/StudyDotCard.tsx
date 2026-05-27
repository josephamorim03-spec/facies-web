import { useState } from "react";
import {
  deleteDirectedStudy,
  DirectedStudyEditImpactPreview,
  DirectedStudyListItem,
  updateDirectedStudy,
} from "@/lib/api";
import { IconCheck, IconClipboardCheck, IconPencil } from "../CronogramaIcons";
import {
  AREA_COLORS,
  displayDate,
  FULL_EXAM_COLOR,
  FULL_EXAM_TYPE_LABELS,
  isFullExamStudy,
} from "../../_lib/cronogramaShared";
import { parseStudyEditImpactPreview } from "./shared";
import { getErrorMessage } from "@/lib/error-utils";
export function StudyDotCard({ study, token, onRefresh, onClose }: {
  study: DirectedStudyListItem; token: string; onRefresh: () => void; onClose: () => void;
}) {
  const studyIsFullExam = isFullExamStudy(study);
  const [editing, setEditing] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [total, setTotal] = useState(String(study.total_questions));
  const [correct, setCorrect] = useState(String(study.correct_questions));
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [err, setErr] = useState("");
  const [impactPreview, setImpactPreview] = useState<DirectedStudyEditImpactPreview | null>(null);
  const [confirmingImpact, setConfirmingImpact] = useState(false);

  async function saveEdit(confirmImpact: boolean = false) {
    const t = Number(total); const c = Number(correct);
    if (!t || c > t) { setErr("Verifique os valores."); return; }
    setErr("");
    if (!confirmImpact) setImpactPreview(null);
    setSaving(true);
    try {
      await updateDirectedStudy(token, study.study_id, {
        total_questions: t,
        correct_questions: c,
        ...(confirmImpact ? { confirm_impact: true } : {}),
      });
      onRefresh(); onClose();
    } catch (e: unknown) {
      const preview = parseStudyEditImpactPreview(e);
      if (preview) {
        setImpactPreview(preview);
      } else {
        setErr(getErrorMessage(e, "Erro."));
      }
      setSaving(false);
      setConfirmingImpact(false);
    }
  }

  async function confirmImpactEdit() {
    if (confirmingImpact) return;
    setConfirmingImpact(true);
    await saveEdit(true);
  }

  async function cancelRegistration() {
    setCanceling(true);
    try {
      await deleteDirectedStudy(token, study.study_id);
      onRefresh(); onClose();
    } catch (e: unknown) { setErr(getErrorMessage(e, "Erro.")); setCanceling(false); }
  }

  if (cancelConfirm) {
    return (
      <div className="border border-edge p-3 space-y-2">
        <p className="text-xs font-medium">
          {studyIsFullExam
            ? "Cancelar este registro de prova na íntegra?"
            : study.is_review
              ? "Cancelar este registro de revisão?"
              : "Cancelar este estudo inicial?"}
        </p>
        <p className="text-xs text-muted">
          {studyIsFullExam
            ? "Este registro será removido e não afetará a trilha de revisão."
            : "As revisões pendentes associadas serao marcadas como puladas."}
        </p>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button onClick={cancelRegistration} disabled={canceling}
            className="text-xs border border-red-600 text-red-600 px-3 py-1 hover:bg-red-50 disabled:opacity-50">
            {canceling ? "..." : "Confirmar"}
          </button>
          <button onClick={() => setCancelConfirm(false)} className="text-xs text-muted px-3 py-1">Voltar</button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto w-full max-w-xs space-y-2">
        <p className="text-xs text-muted italic">
          Alterar registro · {studyIsFullExam ? "PROVA" : study.area} / {study.theme}
        </p>
        <div className="flex gap-2 justify-center">
          <label className="text-xs text-muted flex flex-col gap-1">
            Total
            <input type="number" min={1} value={total} onChange={(e) => { setTotal(e.target.value); setImpactPreview(null); }}
              className="border border-edge w-20 px-2 py-1 text-sm bg-paper" />
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Acertos
            <input type="number" min={0} max={Number(total)} value={correct} onChange={(e) => { setCorrect(e.target.value); setImpactPreview(null); }}
              className="border border-edge w-20 px-2 py-1 text-sm bg-paper" />
          </label>
        </div>
        {impactPreview && (
          <div className="border border-edge p-2 space-y-1 bg-amber-50">
            <p className="text-xs font-medium">Confirmar edição</p>
            <p className="text-xs text-muted">
              Acuracia: {impactPreview.accuracy_before_pct.toFixed(1)}% -&gt; {impactPreview.accuracy_after_pct.toFixed(1)}%
            </p>
            {impactPreview.next_due_before && impactPreview.next_due_after && (
              <p className="text-xs text-muted">
                Próxima revisão: {displayDate(impactPreview.next_due_before)} -&gt; {displayDate(impactPreview.next_due_after)}
              </p>
            )}
            <p className="text-xs text-muted">
              Revisões futuras afetadas: {impactPreview.affected_future_studies}
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmImpactEdit}
                disabled={confirmingImpact || saving}
                className="text-xs border border-ink px-3 py-1 disabled:opacity-50"
              >
                {confirmingImpact || saving ? "..." : "Confirmar alteracao"}
              </button>
              <button
                onClick={() => setImpactPreview(null)}
                className="text-xs text-muted border border-edge px-3 py-1"
              >
                Revisar dados
              </button>
            </div>
          </div>
        )}
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => saveEdit()} disabled={saving} className="text-xs border border-ink px-3 py-1 disabled:opacity-50">
            {saving ? "..." : "Salvar"}
          </button>
          <button onClick={() => setCancelConfirm(true)} className="text-xs text-red-600 border border-red-300 px-3 py-1 hover:border-red-500 hover:text-red-700">
            Cancelar registro
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-muted px-2 py-1">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative opacity-75 border border-edge p-2 space-y-1">
      <button onClick={() => setEditing(true)} className="absolute top-1.5 right-1.5 text-muted hover:text-ink" title="Alterar">
        <IconPencil className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-2 pr-6">
        {studyIsFullExam ? (
          <div className="shrink-0 rounded-[2px]" style={{ width: 9, height: 9, backgroundColor: FULL_EXAM_COLOR }} />
        ) : study.is_review ? (
          <div
            className="shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: AREA_COLORS[study.area] ?? "#ccc", opacity: 0.6 }}
          />
        ) : (
          <div
            className="shrink-0"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: `9px solid ${AREA_COLORS[study.area] ?? "#ccc"}`,
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm leading-tight truncate">{study.theme}</p>
            <IconCheck className="w-3.5 h-3.5 text-ink shrink-0" />
          </div>
          <p className="text-xs text-muted">
            {studyIsFullExam
              ? `PROVA · ${study.full_exam_type ? FULL_EXAM_TYPE_LABELS[study.full_exam_type] : "Prova na íntegra"}${study.full_exam_year ? ` · ${study.full_exam_year}` : ""}`
              : `${study.area} · ${study.is_review ? "Revisão realizada" : "Estudo inicial"}`}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted pl-5">
        {study.correct_questions}/{study.total_questions} questões · {study.accuracy.toFixed(0)}% acertos
      </p>
      {study.import_session_id && (
        <a
          href="/banco-de-questoes"
          className="absolute bottom-1.5 right-1.5 inline-flex items-center justify-center text-muted hover:text-ink"
          title="Ver correção"
        >
          <IconClipboardCheck className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}



