import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarEventOut,
  createEvent,
  DirectedStudyListItem,
} from "@/lib/api";
import {
  displayDate,
  encodeEventLabelCategory,
} from "../../_lib/cronogramaShared";
import { useAnimatedDots } from "@/lib/useAnimatedDots";
import { getErrorMessage } from "@/lib/error-utils";

type CreateMode = "question_bank" | "event";
type EventCategory = "work" | "other";

const EVENT_DURATIONS = [1, 2, 3, 4, 6, 8, 12, 24];

export function NewStudyForm({ token, dateISO, onDone, onCancel, existingStudies, events }: {
  token: string;
  dateISO: string;
  onDone: () => void;
  onCancel: () => void;
  existingStudies: DirectedStudyListItem[];
  events: CalendarEventOut[];
}) {
  void existingStudies;
  void events;
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>("question_bank");
  const [eventCategory, setEventCategory] = useState<EventCategory>("work");
  const [eventLabel, setEventLabel] = useState("");
  const [eventDuration, setEventDuration] = useState(8);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [createdEvent, setCreatedEvent] = useState(false);
  const submittingDots = useAnimatedDots(submitting, 400);

  async function submitEvent() {
    setErr("");
    const label = eventLabel.trim();
    if (!label) {
      setErr("Informe o nome do compromisso.");
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
      setCreatedEvent(true);
      setTimeout(onDone, 1200);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erro ao adicionar compromisso."));
      setSubmitting(false);
    }
  }

  if (createdEvent) {
    return (
      <div className="text-sm rounded-xl border border-edge p-2">
        Compromisso criado em <strong>{displayDate(dateISO)}</strong>.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setMode("question_bank")}
          className={`text-xs rounded-xl border px-3 py-1 ${mode === "question_bank" ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
        >
          Banco de questões
        </button>
        <button
          type="button"
          onClick={() => setMode("event")}
          className={`text-xs rounded-xl border px-3 py-1 ${mode === "event" ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
        >
          Compromisso
        </button>
      </div>

      {mode === "question_bank" ? (
        <div className="rounded-2xl border border-edge bg-paper p-4 text-center">
          <button
            type="button"
            onClick={() => router.push("/banco-de-questoes")}
            className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper"
          >
            Resolver questões do banco
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-edge bg-paper p-4">
          <div className="flex justify-center gap-2">
            {[
              { value: "work" as const, label: "Plantao/Trabalho" },
              { value: "other" as const, label: "Outro" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setEventCategory(item.value)}
                className={`text-xs rounded-xl px-2 py-1 border ${eventCategory === item.value ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              placeholder={eventCategory === "work" ? "Ex. Plantão/UBS" : "Ex. Imprevisto/Viagem"}
              value={eventLabel}
              onChange={(e) => setEventLabel(e.target.value)}
              className="rounded-xl border border-edge bg-paper px-2 py-1 text-sm"
            />
            <select
              value={eventDuration}
              onChange={(e) => setEventDuration(Number(e.target.value))}
              className="rounded-xl border border-edge bg-paper px-2 py-1 text-sm"
            >
              {EVENT_DURATIONS.map((duration) => <option key={duration} value={duration}>{duration}h</option>)}
            </select>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex justify-center gap-2">
        {mode === "event" && (
          <button
            type="button"
            onClick={submitEvent}
            disabled={submitting}
            className="text-xs rounded-xl border border-primary bg-primary px-3 py-1.5 font-semibold text-primaryInk hover:opacity-90 disabled:opacity-50"
          >
            Adicionar{submitting ? submittingDots : ""}
          </button>
        )}
        <button type="button" onClick={onCancel} className="text-xs text-muted px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}
