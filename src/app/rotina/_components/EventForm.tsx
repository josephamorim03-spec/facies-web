"use client";

import { WEEKDAYS, DURATIONS, EventCategory, toDisplayDate } from "../lib/eventEncoding";

type Props = {
  eventCadence: "routine" | "event";
  eventWeekday: number;
  eventDate: string;
  eventCategory: EventCategory;
  eventLabel: string;
  eventDuration: number;
  evError: string;
  onEventCadenceChange: (v: "routine" | "event") => void;
  onEventWeekdayChange: (v: number) => void;
  onEventDateChange: (v: string) => void;
  onEventCategoryChange: (v: EventCategory) => void;
  onEventLabelChange: (v: string) => void;
  onEventDurationChange: (v: number) => void;
  onAddEvent: () => void;
};

export function EventForm({
  eventCadence,
  eventWeekday,
  eventDate,
  eventCategory,
  eventLabel,
  eventDuration,
  evError,
  onEventCadenceChange,
  onEventWeekdayChange,
  onEventDateChange,
  onEventCategoryChange,
  onEventLabelChange,
  onEventDurationChange,
  onAddEvent,
}: Props) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-serif text-muted">Adicionar compromisso</h3>
      <div className="space-y-2">
        <div className="flex gap-2">
          {[
            { value: "routine" as const, label: "Recorrente" },
            { value: "event" as const, label: "Pontual" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => onEventCadenceChange(item.value)}
              className={`text-xs rounded-xl px-2 py-1 border ${eventCadence === item.value ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {eventCadence === "routine" ? (
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => onEventWeekdayChange(i)}
                className={`text-xs rounded-xl px-2 py-1 border ${eventWeekday === i ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
              >
                {d}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.75rem] gap-2">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => onEventDateChange(e.target.value)}
              className="rounded-xl border border-edge bg-paper px-2 py-1 text-sm w-full min-w-0"
              title={eventDate ? toDisplayDate(eventDate) : undefined}
            />
            <div aria-hidden="true" />
            <div aria-hidden="true" />
          </div>
        )}

        <div className="flex gap-2">
          {[
            { value: "work" as const, label: "Trabalho" },
            { value: "other" as const, label: "Outros" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => onEventCategoryChange(item.value)}
              className={`text-xs rounded-xl px-2 py-1 border ${eventCategory === item.value ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-end">
          <input
            type="text"
            placeholder={eventCategory === "work" ? "Ex. Plantão/UBS" : "Ex. Imprevisto/Viagem"}
            value={eventLabel}
            onChange={(e) => onEventLabelChange(e.target.value)}
            className="rounded-xl border border-edge bg-paper px-2 py-1 text-sm w-full min-w-0"
          />
          <select
            value={eventDuration}
            onChange={(e) => onEventDurationChange(Number(e.target.value))}
            className="rounded-xl border border-edge bg-paper px-2 py-1 text-sm w-full sm:w-auto"
          >
            {DURATIONS.map((d) => <option key={d} value={d}>{d}h</option>)}
          </select>
          <button onClick={onAddEvent} className="text-sm rounded-xl border border-ink px-3 py-1 w-full sm:w-auto hover:bg-ink hover:text-paper transition-colors">+ Adicionar</button>
        </div>

        {evError && <p className="text-xs text-danger">{evError}</p>}
      </div>
    </section>
  );
}
