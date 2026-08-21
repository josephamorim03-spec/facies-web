"use client";

import { useState } from "react";

import { DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { AREA_COLORS, topicPrimaryLabel } from "../_lib/cronogramaShared";
import { ReviewSignalChips } from "./ReviewSignalChips";

interface Props {
  todayTasks: ReviewTask[];
  todayStudies: DirectedStudyListItem[];
  questionPractice: {
    count: number;
  };
}

export function CronogramaTodayPanel({
  todayTasks,
  todayStudies,
  questionPractice,
}: Props) {
  const MAX_VISIBLE = 4;
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;

  const items: { key: string; area: string; theme: string; label?: string; task?: ReviewTask }[] = [
    ...todayTasks.map((task) => ({
      key: task.task_id,
      area: task.area,
      theme: topicPrimaryLabel(task) || task.theme,
      task,
    })),
    ...todayStudies.map((study) => ({
      key: study.study_id,
      area: study.area,
      theme: topicPrimaryLabel(study) || study.theme,
      label: "feito",
    })),
  ];

  const practiceCount = Math.max(0, Number(questionPractice.count ?? 0));
  const hasContent = items.length > 0 || practiceCount > 0;
  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - MAX_VISIBLE;
  const taskLabel = todayTasks.length === 1 ? "1 tarefa" : `${todayTasks.length} tarefas`;
  const questionLabel = practiceCount === 1 ? "1 questão" : `${practiceCount} questões`;

  return (
    <section
      className="border border-edge bg-surface px-3 py-3"
      aria-label="Para revisar hoje"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-sm font-semibold leading-tight">Para revisar hoje</h2>
          <p className="mt-0.5 text-xs text-muted">
            {taskLabel}
            {practiceCount > 0 ? ` · ${questionLabel} para prática direcionada` : ""}
          </p>
        </div>
        <div className="flex items-start gap-2">
          {practiceCount > 0 && (
            <div className="border border-primary bg-paper px-2.5 py-1 text-right">
              <p className="text-sm font-semibold leading-none text-primary">{practiceCount}</p>
              <p className="mt-0.5 text-pico leading-none text-muted">prática</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setPinned((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Recolher revisões de hoje" : "Expandir revisões de hoje"}
            className="mt-0.5 shrink-0 p-1 text-muted transition-colors hover:text-ink"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
              aria-hidden="true"
            >
              <path d="m7 4 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="min-w-0 space-y-1.5 pt-2">
            {!hasContent ? (
              <p className="text-xs text-muted">Nenhuma revisão para hoje</p>
            ) : (
              <>
                {visible.map((item) => {
                  const areaKey = String(item.area ?? "").toUpperCase();
                  const accentColor = AREA_COLORS[areaKey] ?? AREA_COLORS.OU;

                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-1.5 border-l-2 pl-2"
                      style={{ borderLeftColor: accentColor }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-xs">{item.theme}</span>
                          <span className="shrink-0 text-pico text-muted">{areaKey || "OU"}</span>
                          {item.label && (
                            <span className="shrink-0 text-pico text-success">feito</span>
                          )}
                        </div>
                        {item.task && <ReviewSignalChips task={item.task} compact className="mt-1" />}
                      </div>
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
      </div>
    </section>
  );
}
