"use client";

import { RESCHEDULE_MODES } from "../lib/eventEncoding";

type Props = {
  rescheduleMode: string;
  savedMsg: string;
  profileError: string;
  onRescheduleModeChange: (v: string) => void;
  onSaveProfile: () => void;
};

export function RescheduleSection({
  rescheduleMode,
  savedMsg,
  profileError,
  onRescheduleModeChange,
  onSaveProfile,
}: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-serif">Reagendamento automático</h2>
      <div className="flex gap-2">
        {RESCHEDULE_MODES.map(({ value, label }) => (
          <button key={value} onClick={() => onRescheduleModeChange(value)}
            className={`text-xs px-3 py-1 border ${rescheduleMode === value ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {rescheduleMode === "suggest" && "Você receberá sugestões para aprovar."}
        {rescheduleMode === "auto" && "Reagendamentos acontecem automaticamente."}
        {rescheduleMode === "never" && "Sem sugestões de reagendamento."}
      </p>
      <div className="flex items-center gap-3">
        <button onClick={onSaveProfile} className="text-sm border border-ink px-4 py-1">Salvar</button>
        {savedMsg && <span className="text-sm text-muted">{savedMsg}</span>}
        {profileError && <span className="text-sm text-red-600">{profileError}</span>}
      </div>
    </section>
  );
}
