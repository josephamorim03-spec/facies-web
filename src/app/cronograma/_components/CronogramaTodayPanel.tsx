"use client";

import { useState } from "react";

import { DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { AREA_COLORS } from "../_lib/cronogramaShared";
import { ReviewSignalChips } from "./ReviewSignalChips";

interface Props {
  todayTasks: ReviewTask[];
  todayStudies: DirectedStudyListItem[];
  questionReviewQueue: {
    due_count: number;
    struggling_count: number;
    total: number;
  };
}

export function CronogramaTodayPanel({
  todayTasks,
  todayStudies,
  questionReviewQueue,
}: Props) {
  const MAX_VISIBLE = 4;

  // Compresso por padrão: o calendário é a estrela. Abre transitoriamente no hover
  // e fica fixo (pinned) ao clicar na setinha, até clicar de novo.
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;

  const items: { key: string; area: string; theme: string; label?: string; task?: ReviewTask }[] = [
    ...todayTasks.map((task) => ({
      key: task.task_id,
      area: task.area,
      theme: task.theme,
      task,
    })),
    ...todayStudies.map((study) => ({
      key: study.study_id,
      area: study.area,
      theme: study.theme,
      label: "feito",
    })),
  ];

  const dueQuestionTotal = Math.max(0, Number(questionReviewQueue.total ?? 0));
  const hasContent = items.length > 0 || dueQuestionTotal > 0;
  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - MAX_VISIBLE;
  const taskLabel = todayTasks.length === 1 ? "1 tarefa" : `${todayTasks.length} tarefas`;
  const questionLabel = dueQuestionTotal === 1 ? "1 questão" : `${dueQuestionTotal} questões`;
  const queueDetail = [
    questionReviewQueue.due_count > 0 ? `${questionReviewQueue.due_count} no ponto de revisão` : "",
    questionReviewQueue.struggling_count > 0
      ? `${questionReviewQueue.struggling_count} de baixo desempenho`
      : "",
  ].filter(Boolean).join(" · ");

  return (
    <section
      className="rounded-xl border border-edge bg-surface px-3 py-3"
      aria-label="Para revisar hoje"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-sm font-semibold leading-tight">Para revisar hoje</h2>
          <p className="mt-0.5 text-xs text-muted">
            {taskLabel}
            {dueQuestionTotal > 0 ? ` · ${questionLabel} no banco` : ""}
          </p>
        </div>
        <div className="flex items-start gap-2">
          {dueQuestionTotal > 0 && (
            <div className="rounded-lg border border-primary bg-paper px-2.5 py-1 text-right">
              <p className="text-sm font-semibold leading-none text-primary">{dueQuestionTotal}</p>
              <p className="mt-0.5 text-[9px] leading-none text-muted">questões</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setPinned((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Recolher revisões de hoje" : "Expandir revisões de hoje"}
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:text-ink"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
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
                  const accentColor = AREA_COLORS[areaKey] ?? AREA_COLORS.OU ?? "#AEAEA8";

                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-1.5 border-l-2 pl-2"
                      style={{ borderLeftColor: accentColor }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-xs">{item.theme}</span>
                          <span className="shrink-0 text-[9px] text-muted">{areaKey || "OU"}</span>
                          {item.label && (
                            <span className="shrink-0 text-[9px] text-emerald-600">feito</span>
                          )}
                        </div>
                        {item.task && <ReviewSignalChips task={item.task} compact className="mt-1" />}
                      </div>
                    </div>
                  );
                })}
                {queueDetail && <p className="text-xs text-muted">{queueDetail}</p>}
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
