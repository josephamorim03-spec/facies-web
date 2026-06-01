"use client";

import { CalendarEventOut } from "@/lib/api";
import { WEEKDAYS, toDisplayDate, displayEventLabel } from "../lib/eventEncoding";

function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

type Props = {
  routineEvents: CalendarEventOut[];
  punctualTabEvents: CalendarEventOut[];
  punctualTab: "upcoming" | "history";
  onPunctualTabChange: (v: "upcoming" | "history") => void;
  onRemoveEvent: (id: string) => void;
};

export function EventList({
  routineEvents,
  punctualTabEvents,
  punctualTab,
  onPunctualTabChange,
  onRemoveEvent,
}: Props) {
  return (
    <>
      {/* Recorrentes */}
      <section className="space-y-4">
        <h3 className="text-base font-serif text-muted">Recorrentes</h3>
        {routineEvents.length === 0 ? (
          <p className="text-sm text-muted">Nenhum evento fixo.</p>
        ) : (
          <ul className="space-y-1">
            {routineEvents.map((ev) => (
              <li key={ev.event_id} className="flex justify-between items-center text-sm">
                <span>{ev.weekday !== null ? WEEKDAYS[ev.weekday] : "?"} - {displayEventLabel(ev.label, "work")} ({ev.duration_hours}h)</span>
                <button onClick={() => onRemoveEvent(ev.event_id)} className="text-muted hover:text-ink" title="Remover">
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="border-edge my-4" />

      {/* Pontuais */}
      <section className="space-y-4">
        <h3 className="text-base font-serif text-muted">Pontuais</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPunctualTabChange("upcoming")}
            className={`text-xs rounded-xl px-2 py-1 border ${punctualTab === "upcoming" ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
          >
            Próximos
          </button>
          <button
            type="button"
            onClick={() => onPunctualTabChange("history")}
            className={`text-xs px-2 py-1 border ${punctualTab === "history" ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
          >
            Histórico
          </button>
        </div>
        {punctualTabEvents.length === 0 ? (
          <p className="text-sm text-muted">
            {punctualTab === "upcoming" ? "Nenhum evento pontual futuro." : "Nenhum evento no histórico."}
          </p>
        ) : (
          <ul className="space-y-1">
            {punctualTabEvents.map((ev) => (
              <li key={ev.event_id} className="flex justify-between items-center text-sm">
                <span>{toDisplayDate(ev.event_date ?? "")} - {displayEventLabel(ev.label, "other")} ({ev.duration_hours}h)</span>
                {punctualTab === "upcoming" && (
                  <button onClick={() => onRemoveEvent(ev.event_id)} className="text-muted hover:text-ink" title="Remover">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
