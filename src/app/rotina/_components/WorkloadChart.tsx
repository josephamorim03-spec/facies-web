"use client";

import { WorkloadDay, AdaptiveScheduleGenerate } from "@/lib/api";
import { WEEKDAYS } from "../lib/eventEncoding";

type Props = {
  workload: WorkloadDay[];
  adaptiveWeek: AdaptiveScheduleGenerate[];
  adaptiveByDate: Map<string, AdaptiveScheduleGenerate>;
  adaptiveQuestionsByDate: Map<string, number>;
  maxAdaptiveLoad: number;
};

export function WorkloadChart({
  workload,
  adaptiveWeek,
  adaptiveByDate,
  adaptiveQuestionsByDate,
  maxAdaptiveLoad,
}: Props) {
  if (workload.length !== 7) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Distribuicao semanal (base x adaptativo)</p>
      <div className="flex items-end gap-1 h-28">
        {workload.map((day) => {
          const adaptiveQ = adaptiveQuestionsByDate.get(day.date) ?? 0;
          const baseHeight = Math.round((day.load / maxAdaptiveLoad) * 100);
          const adaptiveHeight = Math.round((adaptiveQ / maxAdaptiveLoad) * 100);
          const plan = adaptiveByDate.get(day.date);
          return (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs text-muted">{day.load}/{adaptiveQ}</span>
              <div className="w-full bg-edge relative" style={{ height: "64px" }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-muted/30"
                  style={{ height: `${baseHeight}%` }}
                />
                <div
                  className="absolute bottom-0 left-[22%] right-[22%] bg-ink"
                  style={{ height: `${adaptiveHeight}%` }}
                />
              </div>
              <span className="text-xs text-muted">{WEEKDAYS[day.weekday]}</span>
              {plan?.mode === "MANDATORY_REST" && <span className="text-[9px] text-muted">rest</span>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Valor exibido: base/adaptativo em questões.</p>
    </div>
  );
}
