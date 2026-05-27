"use client";

import { ReviewTask, DirectedStudyListItem } from "@/lib/api";
import { AREA_COLORS } from "../_lib/cronogramaShared";

interface Props {
  todayTasks: ReviewTask[];
  todayStudies: DirectedStudyListItem[];
}

export function CronogramaTodayPanel({ todayTasks, todayStudies }: Props) {
  const MAX_VISIBLE = 4;

  // Combine pending tasks + today studies into one list
  const items: { key: string; area: string; theme: string; label?: string }[] = [
    ...todayTasks.map((t) => ({ key: t.task_id, area: t.area, theme: t.theme })),
    ...todayStudies.map((s) => ({ key: s.study_id, area: s.area, theme: s.theme, label: "feito" })),
  ];

  const hasContent = items.length > 0;
  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - MAX_VISIBLE;

  return (
    <div className="border border-edge px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        {!hasContent ? (
          <p className="text-xs text-muted">Nenhuma revisão para hoje</p>
        ) : (
          <>
            {visible.map((item) => {
              const areaKey = String(item.area ?? "").toUpperCase();
              const accentColor = AREA_COLORS[areaKey] ?? AREA_COLORS.OU ?? "#AEAEA8";

              return (
                <div
                  key={item.key}
                  className="flex items-center gap-1.5 border-l-2 pl-2"
                  style={{ borderLeftColor: accentColor }}
                >
                  <span className="text-xs truncate">{item.theme}</span>
                  <span className="text-[9px] text-muted shrink-0">{areaKey || "OU"}</span>
                  {item.label && (
                    <span className="text-[9px] text-emerald-600 shrink-0">feito</span>
                  )}
                </div>
              );
            })}
            {overflow > 0 && (
              <p className="text-xs text-muted">+{overflow} mais</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
