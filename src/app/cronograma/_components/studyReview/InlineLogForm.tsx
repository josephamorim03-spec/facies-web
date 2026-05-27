import { useState } from "react";
import { useRouter } from "next/navigation";
import AreaDot from "@/components/AreaDot";
import {
  createDirectedStudy,
  getAPIErrorCode,
  getAPIErrorDetail,
  ReviewTask,
} from "@/lib/api";
import { Area, displayDate } from "../../_lib/cronogramaShared";
import { useAnimatedDots } from "@/lib/useAnimatedDots";
import { getErrorMessage } from "@/lib/error-utils";
import { resolvePerformedAtISO } from "./shared";

export function InlineLogForm({ task, token, onDone, onCancel, logDateISO }: {
  task: ReviewTask; token: string; onDone: () => void; onCancel: () => void; logDateISO?: string | null;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(String(task.expected_questions));
  const [correct, setCorrect] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [nextDate, setNextDate] = useState<string | null>(null);
  const submittingDots = useAnimatedDots(submitting, 400);

  function openQuestionBankReview() {
    const params = new URLSearchParams({
      review_task_id: task.task_id,
      date: logDateISO || task.due_date,
      area: task.area,
      theme: task.theme,
      expected_questions: String(Math.max(1, Number(task.expected_questions) || 1)),
    });
    router.push(`/banco-de-questoes?${params.toString()}`);
  }

  async function submit() {
    setErr("");
    const performedAt = resolvePerformedAtISO(logDateISO);
    const t = Number(total);
    const c = Number(correct);
    if (!t || (correct !== "" && c > t)) {
      setErr("Verifique os valores.");
      return;
    }
    setSubmitting(true);
    try {
      const derivedCorrect = correct !== "" ? c : Math.round(t * 0.75);
      const out = await createDirectedStudy(token, {
        topic: { area: task.area, theme: task.theme },
        total_questions: t,
        correct_questions: derivedCorrect,
        performed_at: performedAt,
        is_review: true,
        review_task_id: task.task_id,
      });
      const due = out.created_tasks[0]?.due_date;
      if (due) {
        setNextDate(displayDate(due));
        setTimeout(onDone, 2500);
      } else {
        onDone();
      }
    } catch (e: unknown) {
      const code = getAPIErrorCode(e);
      if (code === "review_already_logged_today") {
        const detail = getAPIErrorDetail(e);
        const day = typeof detail?.local_day === "string" ? detail.local_day : null;
        setErr(`Ja existe revisao registrada para esse tema em ${day ?? "hoje"}. Edite/cancele o registro existente.`);
      } else {
        setErr(getErrorMessage(e, "Erro."));
      }
      setSubmitting(false);
    }
  }

  if (nextDate) {
    return (
      <div className="flex items-center gap-2 text-sm border border-edge p-2">
        <AreaDot area={task.area as Area} size="md" />
        <span>Proxima revisao: <strong>{nextDate}</strong></span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xs space-y-2">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={openQuestionBankReview}
          className="text-xs border border-edge text-muted hover:border-ink px-2 py-0.5"
        >
          Resolver questoes do banco
        </button>
      </div>

      <div className="flex gap-2 justify-center">
        <label className="text-xs text-muted flex flex-col gap-1">
          Total
          <input
            type="number"
            min={1}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="border border-edge w-20 px-2 py-1 text-sm bg-paper"
          />
        </label>
        <label className="text-xs text-muted flex flex-col gap-1">
          Acertos
          <input
            type="number"
            min={0}
            max={Number(total)}
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            className="border border-edge w-20 px-2 py-1 text-sm bg-paper"
          />
        </label>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2 justify-center">
        <button onClick={submit} disabled={submitting} className="text-xs border border-ink px-3 py-1 disabled:opacity-50 whitespace-nowrap">
          Salvar{submitting ? submittingDots : ""}
        </button>
        <button onClick={onCancel} className="text-xs text-muted px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}
