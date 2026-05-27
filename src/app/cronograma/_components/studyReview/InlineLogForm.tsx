import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AreaDot from "@/components/AreaDot";
import {
  createDirectedStudy,
  createStudyImportSession,
  getAPIErrorCode,
  getAPIErrorDetail,
  isBackgroundJobAccepted,
  presignOperationalAttachment,
  putOperationalAttachmentBinary,
  ReviewTask,
  waitForStudyImportSessionJob,
} from "@/lib/api";
import { IconCheck } from "../CronogramaIcons";
import { Area, displayDate } from "../../_lib/cronogramaShared";
import { useAnimatedDots } from "@/lib/useAnimatedDots";
import { getErrorMessage } from "@/lib/error-utils";
import {
  FSRS_RATINGS,
  isPdfQuestionsNotFoundMessage,
  PDF_QUESTIONS_NOT_FOUND_MESSAGE,
  resolveImportSessionErrorMessage,
  resolvePerformedAtISO,
} from "./shared";
export function InlineLogForm({ task, token, onDone, onCancel, logDateISO }: {
  task: ReviewTask; token: string; onDone: () => void; onCancel: () => void; logDateISO?: string | null;
}) {
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isImportMode, setIsImportMode] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [total, setTotal] = useState(String(task.expected_questions));
  const [correct, setCorrect] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [nextDate, setNextDate] = useState<string | null>(null);
  const isPdfQuestionsNotFoundErr = isPdfQuestionsNotFoundMessage(err);
  const submittingDots = useAnimatedDots(submitting, 400);

  useEffect(() => {
    if (!isPdfQuestionsNotFoundErr) return;
    const dismiss = () => {
      setErr((current) => (isPdfQuestionsNotFoundMessage(current) ? "" : current));
    };
    const timer = window.setTimeout(dismiss, 8000);
    window.addEventListener("pointerdown", dismiss, { capture: true, once: true });
    window.addEventListener("keydown", dismiss, { capture: true, once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss, { capture: true });
      window.removeEventListener("keydown", dismiss, { capture: true });
    };
  }, [isPdfQuestionsNotFoundErr]);

  async function uploadImportPdf(): Promise<string> {
    if (!pdfFile) throw new Error("Selecione um PDF para importar.");
    if (pdfFile.size > 20 * 1024 * 1024) throw new Error("PDF muito grande (max 20MB).");
    if (pdfFile.type && !pdfFile.type.toLowerCase().includes("pdf")) throw new Error("Envie um arquivo PDF valido.");
    const presigned = await presignOperationalAttachment(token, {
      filename: pdfFile.name || "prova.pdf",
      content_type: pdfFile.type || "application/pdf",
      size_bytes: pdfFile.size,
    });
    await putOperationalAttachmentBinary(presigned.upload_url, {
      method: presigned.method,
      headers: presigned.headers,
      body: pdfFile,
    });
    return presigned.attachment_ref;
  }

  async function submit() {
    setErr("");
    const performedAt = resolvePerformedAtISO(logDateISO);
    if (isImportMode) {
      if (!pdfFile) { setErr("Selecione um PDF."); return; }
      setSubmitting(true);
      try {
        const attachmentRef = await uploadImportPdf();
        const result = await createStudyImportSession(token, {
          study_kind: "topic",
          area: task.area,
          theme: task.theme,
          performed_at: performedAt,
          attachment_ref: attachmentRef,
          review_task_id: task.task_id,
        });
        const session = isBackgroundJobAccepted(result)
          ? await waitForStudyImportSessionJob(token, result)
          : result;
        setSubmitting(false);
        router.push(`/agenda-operacional/importar/${session.session_id}`);
      } catch (e: unknown) {
        const code = getAPIErrorCode(e);
        if (code === "review_task_already_finalized") {
          setSubmitting(false);
          onDone();
          return;
        } else if (code === "pdf_scan_not_supported") {
          setErr("PDF em formato de scan nao e suportado nesta versao.");
        } else if (code === "pdf_questions_not_found") {
          setErr(PDF_QUESTIONS_NOT_FOUND_MESSAGE);
        } else if (code === "unreliable_answer_key") {
          setErr("Nao foi possivel identificar um gabarito confiavel nesse PDF.");
        } else {
          setErr(resolveImportSessionErrorMessage(e));
        }
        setSubmitting(false);
      }
      return;
    }

    const t = Number(total); const c = Number(correct);
    if (!t || (correct !== "" && c > t)) { setErr("Verifique os valores."); return; }
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
      if (due) { setNextDate(displayDate(due)); setTimeout(onDone, 2500); }
      else { onDone(); }
    } catch (e: unknown) {
      const code = getAPIErrorCode(e);
      if (code === "review_already_logged_today") {
        const detail = getAPIErrorDetail(e);
        const day = typeof detail?.local_day === "string" ? detail.local_day : null;
        setErr(`Já existe revisão registrada para esse tema em ${day ?? "hoje"}. Edite/cancele o registro existente.`);
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
        <span>Próxima revisão: <strong>{nextDate}</strong></span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xs space-y-2">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => { setIsImportMode(!isImportMode); setErr(""); }}
          className={`text-xs border px-2 py-0.5 ${
            isImportMode ? "border-ink bg-ink text-paper" : "border-edge text-muted"
          }`}
        >
          Importar PDF
        </button>
      </div>

      {isImportMode ? (
        <div className="flex flex-col items-center gap-1">
          <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="hidden" />
          {pdfFile ? (
            <button type="button" onClick={() => pdfInputRef.current?.click()}
              className="text-xs text-muted underline">{pdfFile.name}</button>
          ) : (
            <button type="button" onClick={() => pdfInputRef.current?.click()}
              className="text-xs border border-edge px-3 py-1 text-muted hover:border-ink">
              Selecionar PDF
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2 justify-center">
          <label className="text-xs text-muted flex flex-col gap-1">
            Total
            <input type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)}
              className="border border-edge w-20 px-2 py-1 text-sm bg-paper" />
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Acertos
            <input type="number" min={0} max={Number(total)} value={correct} onChange={(e) => setCorrect(e.target.value)}
              className="border border-edge w-20 px-2 py-1 text-sm bg-paper" />
          </label>
        </div>
      )}

      {err && (
        <p className={`text-xs ${isPdfQuestionsNotFoundErr ? "text-ink" : "text-red-600"}`}>
          {err}
        </p>
      )}
      <div className="flex gap-2 justify-center">
        <button onClick={submit} disabled={submitting} className="text-xs border border-ink px-3 py-1 disabled:opacity-50 whitespace-nowrap">
          {isImportMode ? "Iniciar simulado" : "Salvar"}{submitting ? submittingDots : ""}
        </button>
        <button onClick={onCancel} className="text-xs text-muted px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}




