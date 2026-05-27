import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AreaDot from "@/components/AreaDot";
import {
  CalendarEventOut,
  createDirectedStudy,
  createEvent,
  createStudyImportSession,
  DirectedStudyListItem,
  getAPIErrorCode,
  isBackgroundJobAccepted,
  presignOperationalAttachment,
  putOperationalAttachmentBinary,
  waitForStudyImportSessionJob,
} from "@/lib/api";
import {
  amberSelected,
  Area,
  AREA_COLORS,
  displayDate,
  encodeEventLabelCategory,
  findSinglePrefixThemeMatch,
  FULL_EXAM_TYPE_LABELS,
  isFullExamStudy,
  normalizeThemeKey,
  STUDY_KIND_FULL_EXAM,
  VALID_AREAS,
} from "../../_lib/cronogramaShared";
import { useAnimatedDots } from "@/lib/useAnimatedDots";
import { getErrorMessage } from "@/lib/error-utils";
import {
  isPdfQuestionsNotFoundMessage,
  PDF_QUESTIONS_NOT_FOUND_MESSAGE,
  resolveImportSessionErrorMessage,
  resolvePerformedAtISO,
} from "./shared";

type CreateMode = "topic" | "full_exam" | "event";
type EventCategory = "work" | "other";

const EVENT_DURATIONS = [1, 2, 3, 4, 6, 8, 12, 24];

function formatHours(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function NewStudyForm({ token, dateISO, onDone, onCancel, existingStudies, events }: {
  token: string;
  dateISO: string;
  onDone: () => void;
  onCancel: () => void;
  existingStudies: DirectedStudyListItem[];
  events: CalendarEventOut[];
}) {
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CreateMode>("topic");
  const [isImportMode, setIsImportMode] = useState(false);

  const [area, setArea] = useState<Area | null>(null);
  const [theme, setTheme] = useState("");
  const [fullExamName, setFullExamName] = useState("");
  const [fullExamYear, setFullExamYear] = useState("");
  const [fullExamType, setFullExamType] = useState<"acesso_direto" | "r_plus">("acesso_direto");
  const [eventCategory, setEventCategory] = useState<EventCategory>("work");
  const [eventLabel, setEventLabel] = useState("");
  const [eventDuration, setEventDuration] = useState(8);
  const [total, setTotal] = useState("30");
  const [correct, setCorrect] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [weight, setWeight] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [nextDate, setNextDate] = useState<string | null>(null);
  const isPdfQuestionsNotFoundErr = isPdfQuestionsNotFoundMessage(err);
  const submittingDots = useAnimatedDots(submitting, 400);
  const [showThemeSuggestions, setShowThemeSuggestions] = useState(true);
  const [showFullExamSuggestions, setShowFullExamSuggestions] = useState(true);

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

  const selectedAreaThemeMap = new Map<string, string>();
  for (const study of existingStudies) {
    if (isFullExamStudy(study)) continue;
    const existingTheme = (study.theme ?? "").trim();
    if (!existingTheme) continue;
    const key = normalizeThemeKey(existingTheme);
    if (!key) continue;
    if (area && study.area === area && !selectedAreaThemeMap.has(key)) {
      selectedAreaThemeMap.set(key, existingTheme);
    }
  }

  const fullExamNameMap = new Map<string, string>();
  for (const study of existingStudies) {
    if (!isFullExamStudy(study)) continue;
    const rawName = (study.full_exam_name ?? study.theme ?? "").trim();
    if (!rawName) continue;
    const key = normalizeThemeKey(rawName);
    if (!key || fullExamNameMap.has(key)) continue;
    fullExamNameMap.set(key, rawName);
  }

  const typedThemeKey = normalizeThemeKey(theme);
  const typedFullExamKey = normalizeThemeKey(fullExamName);
  const themeSuggestions = typedThemeKey
    ? Array.from(selectedAreaThemeMap.entries())
      .filter(([key]) => key.startsWith(typedThemeKey))
      .map(([, label]) => label)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .slice(0, 8)
    : [];
  const fullExamSuggestions = typedFullExamKey
    ? Array.from(fullExamNameMap.entries())
      .filter(([key]) => key.startsWith(typedFullExamKey))
      .map(([, label]) => label)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .slice(0, 8)
    : [];

  function applyManualDefaults(nextMode: CreateMode) {
    setTotal(nextMode === "full_exam" ? "100" : "30");
    setCorrect("");
  }

  function checkPunctualOverflow(duration: number): string | null {
    const used = events
      .filter((event) => event.event_type === "event" && event.event_date === dateISO)
      .reduce((sum, event) => sum + Number(event.duration_hours || 0), 0);
    if (used + duration > 24) {
      return `${displayDate(dateISO)} ja tem ${formatHours(used)}h de eventos. Adicionar ${formatHours(duration)}h ultrapassa 24h - ajuste os eventos existentes.`;
    }
    return null;
  }

  async function uploadImportPdf(): Promise<string> {
    if (!pdfFile) {
      throw new Error("Selecione um PDF para importar.");
    }
    if (pdfFile.size > 20 * 1024 * 1024) {
      throw new Error("PDF muito grande (max 20MB).");
    }
    if (pdfFile.type && !pdfFile.type.toLowerCase().includes("pdf")) {
      throw new Error("Envie um arquivo PDF valido.");
    }
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

    if (mode === "event") {
      const label = eventLabel.trim();
      if (!label) {
        setErr("Informe o nome do compromisso.");
        return;
      }

      const overflow = checkPunctualOverflow(eventDuration);
      if (overflow) {
        setErr(overflow);
        return;
      }

      setSubmitting(true);
      try {
        await createEvent(token, {
          label: encodeEventLabelCategory(label, eventCategory),
          event_type: "event",
          event_date: dateISO,
          weekday: null,
          duration_hours: eventDuration,
        });
        onDone();
      } catch (e: unknown) {
        setErr(getErrorMessage(e, "Erro ao adicionar compromisso."));
        setSubmitting(false);
      }
      return;
    }

    if (mode === "full_exam") {
      const typedExamName = fullExamName.trim();
      const typedExamKey = normalizeThemeKey(typedExamName);
      if (!typedExamName || !typedExamKey) { setErr("Informe o nome da prova."); return; }

      const exactMatch = fullExamNameMap.get(typedExamKey);
      const prefixMatch = findSinglePrefixThemeMatch(typedExamKey, fullExamNameMap);
      const finalExamName = exactMatch ?? prefixMatch ?? typedExamName;
      const parsedYear = Number(fullExamYear);
      if (!Number.isInteger(parsedYear) || parsedYear <= 0) {
        setErr("Informe um ano valido.");
        return;
      }
      if (finalExamName !== fullExamName) setFullExamName(finalExamName);

      setSubmitting(true);
      try {
        if (isImportMode) {
          const attachmentRef = await uploadImportPdf();
          const result = await createStudyImportSession(token, {
            study_kind: "full_exam",
            full_exam_name: finalExamName,
            full_exam_year: parsedYear,
            full_exam_type: fullExamType,
            performed_at: resolvePerformedAtISO(dateISO),
            attachment_ref: attachmentRef,
          });
          const session = isBackgroundJobAccepted(result)
            ? await waitForStudyImportSessionJob(token, result)
            : result;
          setSubmitting(false);
          router.push(`/agenda-operacional/importar/${session.session_id}`);
          return;
        }

        const t = Number(total);
        const c = Number(correct);
        if (!t || c > t) { setErr("Preencha todos os campos."); setSubmitting(false); return; }
        await createDirectedStudy(token, {
          study_kind: STUDY_KIND_FULL_EXAM,
          full_exam: {
            name: finalExamName,
            year: parsedYear,
            exam_type: fullExamType,
          },
          total_questions: t,
          correct_questions: c,
          performed_at: resolvePerformedAtISO(dateISO),
        });
        onDone();
      } catch (e: unknown) {
        const code = getAPIErrorCode(e);
        if (code === "pdf_scan_not_supported") {
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

    if (!area) { setErr("Selecione uma área."); return; }
    if (!theme.trim()) { setErr("Preencha todos os campos."); return; }

    const typedTheme = theme.trim();
    const typedKey = normalizeThemeKey(typedTheme);
    const exactMatch = selectedAreaThemeMap.get(typedKey);
    const prefixMatch = findSinglePrefixThemeMatch(typedKey, selectedAreaThemeMap);
    const finalTheme = exactMatch ?? prefixMatch ?? typedTheme;
    if (finalTheme !== theme) setTheme(finalTheme);

    setSubmitting(true);
    try {
      if (isImportMode) {
        const attachmentRef = await uploadImportPdf();
        const result = await createStudyImportSession(token, {
          study_kind: "topic",
          area: area,
          theme: finalTheme,
          user_weight: weight,
          performed_at: resolvePerformedAtISO(dateISO),
          attachment_ref: attachmentRef,
        });
        const session = isBackgroundJobAccepted(result)
          ? await waitForStudyImportSessionJob(token, result)
          : result;
        setSubmitting(false);
        router.push(`/agenda-operacional/importar/${session.session_id}`);
        return;
      }

      const t = Number(total);
      const c = Number(correct);
      if (!t || c > t) { setErr("Preencha todos os campos."); setSubmitting(false); return; }
      const out = await createDirectedStudy(token, {
        topic: { area: area, theme: finalTheme },
        total_questions: t,
        correct_questions: c,
        user_weight: weight,
        performed_at: resolvePerformedAtISO(dateISO),
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
      if (code === "pdf_scan_not_supported") {
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
  }

  if (nextDate) {
    return (
      <div className="flex items-center gap-2 text-sm border border-edge p-2">
        {area && <AreaDot area={area} size="md" />}
        <span>Próxima revisão: <strong>{nextDate}</strong></span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center" data-testid="compromisso-form">
      <div className="mx-auto flex gap-0 border border-edge divide-x divide-edge w-fit" data-testid="create-mode-segment">
        <button
          type="button"
          onClick={() => {
            setMode("topic");
            if (!isImportMode) applyManualDefaults("topic");
          }}
          className={`text-xs px-4 py-1.5 font-serif ${mode === "topic" ? "bg-ink text-paper" : "text-muted"}`}
          data-mode-value="topic"
        >
          Estudo
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("full_exam");
            if (!isImportMode) applyManualDefaults("full_exam");
          }}
          className={`text-xs px-4 py-1.5 font-serif ${mode === "full_exam" ? "bg-ink text-paper" : "text-muted"}`}
          data-mode-value="full_exam"
        >
          Prova
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("event");
            setIsImportMode(false);
          }}
          className={`text-xs px-4 py-1.5 font-serif ${mode === "event" ? "bg-ink text-paper" : "text-muted"}`}
          data-mode-value="event"
        >
          Compromisso
        </button>
      </div>

      <h3 className="font-serif text-base text-center">
        {mode === "event"
          ? "Registrar compromisso pontual"
          : isImportMode
            ? (mode === "topic" ? "Importar estudo inicial" : "Importar prova")
            : (mode === "topic" ? "Registrar estudo inicial" : "Registrar prova")}
      </h3>

      {mode !== "event" && (
        <button
          type="button"
          onClick={() => {
            setIsImportMode((prev) => {
              const next = !prev;
              if (!next) applyManualDefaults(mode);
              return next;
            });
          }}
          className={`text-xs border px-3 py-1 mx-auto block ${
            isImportMode ? "border-ink bg-ink text-paper" : "border-edge text-muted"
          }`}
        >
          Importar PDF
        </button>
      )}

      {mode === "topic" ? (
        <>
          <div className="flex flex-wrap gap-1 justify-center">
            {VALID_AREAS.map((a) => (
              <button key={a} onClick={() => { setArea(a); setShowThemeSuggestions(true); }}
                style={{
                  backgroundColor: AREA_COLORS[a],
                  borderColor: "transparent",
                  borderWidth: 1,
                  filter: area === a ? "saturate(1.4)" : (area ? "brightness(0.55)" : undefined),
                  opacity: (area && area !== a) ? 0.7 : 1,
                }}
                className="text-xs px-2 py-1 border font-semibold text-white transition-[filter,opacity] duration-150">
                {a}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm mx-auto text-left">
            <input
              placeholder="Tema"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                setShowThemeSuggestions(true);
              }}
              onBlur={() => {
                if (!typedThemeKey) return;
                const exact = selectedAreaThemeMap.get(typedThemeKey);
                if (exact) setTheme(exact);
              }}
              className="w-full border border-edge pl-2 pr-7 py-1 text-sm bg-paper"
            />
            {area && typedThemeKey && themeSuggestions.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowThemeSuggestions((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink px-1"
                aria-label={showThemeSuggestions ? "Ocultar sugestoes" : "Exibir sugestoes"}
                title={showThemeSuggestions ? "Ocultar sugestoes" : "Exibir sugestoes"}
              >
                {showThemeSuggestions ? "^" : "v"}
              </button>
            )}
            {area && typedThemeKey && themeSuggestions.length > 0 && showThemeSuggestions && (
              <div className="absolute left-0 right-0 mt-1 border border-edge bg-paper z-10 max-h-32 overflow-y-auto">
                {themeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTheme(suggestion);
                      setShowThemeSuggestions(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-amber-tint"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isImportMode ? (
            <>
              <div className="flex gap-2 max-w-sm mx-auto">
                <label className="text-xs text-muted flex flex-col gap-1 flex-1">
                  Total
                  <input type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)}
                    className="border border-edge w-full px-2 py-1 text-sm bg-paper" />
                </label>
                <label className="text-xs text-muted flex flex-col gap-1 flex-1">
                  Acertos
                  <input type="number" min={0} max={Number(total)} value={correct} onChange={(e) => setCorrect(e.target.value)}
                    className="border border-edge w-full px-2 py-1 text-sm bg-paper" />
                </label>
              </div>
              <p className="text-xs text-muted">Recomendação: Estudo inicial com no mínimo 30 questões.</p>
            </>
          ) : (
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
          )}
          <div className="flex gap-1 items-center justify-center">
            <span className="text-xs text-muted mr-1">Peso:</span>
            {[1, 2, 3].map((w) => (
              <button key={w} onClick={() => setWeight(w)}
                style={weight === w ? amberSelected : {}}
                className={`text-xs px-2 py-1 border ${weight === w ? "border-ink" : "border-edge"}`}>
                {w === 1 ? "Baixo" : w === 2 ? "Normal" : "Alto"}
              </button>
            ))}
          </div>
        </>
      ) : mode === "full_exam" ? (
        <>
          <div className="relative max-w-sm mx-auto text-left">
            <input
              placeholder="Nome da prova"
              value={fullExamName}
              onChange={(e) => {
                setFullExamName(e.target.value);
                setShowFullExamSuggestions(true);
              }}
              onBlur={() => {
                if (!typedFullExamKey) return;
                const exact = fullExamNameMap.get(typedFullExamKey);
                if (exact) setFullExamName(exact);
              }}
              className="w-full border border-edge pl-2 pr-7 py-1 text-sm bg-paper"
            />
            {typedFullExamKey && fullExamSuggestions.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowFullExamSuggestions((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink px-1"
                aria-label={showFullExamSuggestions ? "Ocultar sugestoes" : "Exibir sugestoes"}
                title={showFullExamSuggestions ? "Ocultar sugestoes" : "Exibir sugestoes"}
              >
                {showFullExamSuggestions ? "^" : "v"}
              </button>
            )}
            {typedFullExamKey && fullExamSuggestions.length > 0 && showFullExamSuggestions && (
              <div className="absolute left-0 right-0 mt-1 border border-edge bg-paper z-10 max-h-32 overflow-y-auto">
                {fullExamSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFullExamName(suggestion);
                      setShowFullExamSuggestions(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-amber-tint"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 max-w-sm mx-auto">
            <label className="text-xs text-muted flex flex-col gap-1 flex-1">
              Ano
              <input
                type="number"
                min={1900}
                max={2100}
                value={fullExamYear}
                onChange={(e) => setFullExamYear(e.target.value)}
                className="border border-edge w-full px-2 py-1 text-sm bg-paper"
              />
            </label>
            <label className="text-xs text-muted flex flex-col gap-1 flex-1">
              Tipo
              <select
                value={fullExamType}
                onChange={(e) => setFullExamType(e.target.value as "acesso_direto" | "r_plus")}
                className="border border-edge w-full px-2 py-[7px] text-sm bg-paper"
              >
                <option value="acesso_direto">{FULL_EXAM_TYPE_LABELS.acesso_direto}</option>
                <option value="r_plus">{FULL_EXAM_TYPE_LABELS.r_plus}</option>
              </select>
            </label>
          </div>

          {!isImportMode ? (
            <>
              <div className="flex gap-2 max-w-sm mx-auto">
                <label className="text-xs text-muted flex flex-col gap-1 flex-1">
                  Total
                  <input type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)}
                    className="border border-edge w-full px-2 py-1 text-sm bg-paper" />
                </label>
                <label className="text-xs text-muted flex flex-col gap-1 flex-1">
                  Acertos
                  <input type="number" min={0} max={Number(total)} value={correct} onChange={(e) => setCorrect(e.target.value)}
                    className="border border-edge w-full px-2 py-1 text-sm bg-paper" />
                </label>
              </div>
              <p className="text-xs text-muted">Provas não geram trilha de revisão.</p>
            </>
          ) : (
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
          )}
        </>
      ) : (
        <div className="space-y-3" data-testid="compromisso-form-fields">
          <div className="text-xs text-muted">
            Data: <span className="font-medium text-ink">{displayDate(dateISO)}</span>
          </div>
          <div className="flex gap-2 justify-center">
            {[
              { value: "work" as const, label: "Trabalho" },
              { value: "other" as const, label: "Outros" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setEventCategory(item.value)}
                className={`text-xs px-2 py-1 border ${eventCategory === item.value ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-end max-w-sm mx-auto">
            <input
              type="text"
              placeholder={eventCategory === "work" ? "Ex. Plantao/UBS" : "Ex. Imprevisto/Viagem"}
              value={eventLabel}
              onChange={(e) => setEventLabel(e.target.value)}
              className="border border-edge bg-paper px-2 py-1 text-sm w-full min-w-0"
            />
            <select
              value={eventDuration}
              onChange={(e) => setEventDuration(Number(e.target.value))}
              className="border border-edge bg-paper px-2 py-1 text-sm w-full sm:w-auto"
            >
              {EVENT_DURATIONS.map((duration) => <option key={duration} value={duration}>{duration}h</option>)}
            </select>
          </div>
        </div>
      )}

      {err && (
        <p className={`text-xs text-center ${isPdfQuestionsNotFoundErr ? "text-ink" : "text-red-600"}`}>
          {err}
        </p>
      )}
      <div className="flex gap-2 justify-center">
        <button onClick={submit} disabled={submitting} className="text-xs border border-ink px-3 py-1 disabled:opacity-50 whitespace-nowrap">
          {mode === "event" ? "Adicionar" : isImportMode ? "Iniciar simulado" : "Adicionar"}{submitting ? submittingDots : ""}
        </button>
        <button onClick={onCancel} className="text-xs text-muted px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}
