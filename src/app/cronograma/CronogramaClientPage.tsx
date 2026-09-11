"use client";

import { CronogramaWeekView } from "./_components/CronogramaWeekView";
import CronogramaMonthView from "./CronogramaMonthView";
import { localISO } from "@/features/student-agenda/dateRange";
import { STUDENT_AGENDA_FRONTEND_ENABLED } from "@/features/student-agenda/useStudentAgenda";

/**
 * ⚠️ A LINHA "SEMANA · MÊS" SAIU DAQUI, e não perdeu função: subiu.
 *
 * Ela era um `ScheduleViewTabs` desenhado só no desktop, dentro do conteúdo, e
 * duplicava-se com dois ícones na barra de título só no telemóvel — três
 * afordâncias para a mesma troca, nenhuma delas nas duas larguras.
 *
 * Com "Semana" e "Mês" como seções do Plano, a troca mora onde moram as outras
 * seções do app: `IntentSubNav`, no topo do conteúdo, igual nas duas larguras e
 * com as mesmas classes do primitivo de abas. Uma linguagem só.
 */
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
  return initialView === "month" ? (
    <CronogramaMonthView initialSelectedDay={initialSelectedDay ?? anchor} />
  ) : (
    <CronogramaWeekView anchor={anchor} initialSelectedDay={initialSelectedDay} />
  );
}
