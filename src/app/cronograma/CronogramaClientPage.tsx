"use client";

import { ScheduleViewTabs } from "./_components/ScheduleViewTabs";
import { CronogramaWeekView } from "./_components/CronogramaWeekView";
import CronogramaMonthView from "./CronogramaMonthView";
import { localISO } from "@/features/student-agenda/dateRange";
import { STUDENT_AGENDA_FRONTEND_ENABLED } from "@/features/student-agenda/useStudentAgenda";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";

export default function CronogramaClientPage({
  initialView = "week",
  initialAnchor = null,
  initialSelectedDay = null,
}: {
  initialView?: "week" | "month";
  initialAnchor?: string | null;
  initialSelectedDay?: string | null;
}) {
  const isDesktopNavigation = useDesktopNavigationMode();
  const anchor = initialAnchor ?? initialSelectedDay ?? localISO();
  if (!STUDENT_AGENDA_FRONTEND_ENABLED) {
    return <CronogramaMonthView initialSelectedDay={initialSelectedDay ?? initialAnchor} />;
  }
  return (
    <div className="space-y-4">
      {isDesktopNavigation ? <ScheduleViewTabs active={initialView} anchor={anchor} /> : null}
      {initialView === "month" ? (
        <CronogramaMonthView initialSelectedDay={initialSelectedDay ?? anchor} showWeekSwitch />
      ) : (
        <CronogramaWeekView anchor={anchor} initialSelectedDay={initialSelectedDay} />
      )}
    </div>
  );
}
