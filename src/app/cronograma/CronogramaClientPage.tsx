"use client";

import { ScheduleViewTabs } from "./_components/ScheduleViewTabs";
import { CronogramaWeekView } from "./_components/CronogramaWeekView";
import CronogramaMonthView from "./CronogramaMonthView";
import { localISO } from "@/features/student-agenda/dateRange";
import { STUDENT_AGENDA_FRONTEND_ENABLED } from "@/features/student-agenda/useStudentAgenda";

export default function CronogramaClientPage({
  initialView = "week",
  initialAnchor = null,
  initialSelectedDay = null,
}: {
  initialView?: "week" | "month";
  initialAnchor?: string | null;
  initialSelectedDay?: string | null;
}) {
  const anchor = initialAnchor ?? initialSelectedDay ?? localISO();
  if (!STUDENT_AGENDA_FRONTEND_ENABLED) {
    return <CronogramaMonthView initialSelectedDay={initialSelectedDay ?? initialAnchor} />;
  }
  return (
    <div className="space-y-4">
      <ScheduleViewTabs active={initialView} anchor={anchor} />
      {initialView === "month" ? (
        <CronogramaMonthView initialSelectedDay={initialSelectedDay ?? anchor} />
      ) : (
        <CronogramaWeekView anchor={anchor} />
      )}
    </div>
  );
}
