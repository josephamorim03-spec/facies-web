"use client";

import { CanonicalTodayDashboard } from "./_components/CanonicalTodayDashboard";

// `NEXT_PUBLIC_STUDENT_AGENDA_V1` tem default "1" em `next.config.js`, entao o
// galho legado nunca renderizava em nenhuma configuracao implantada -- era 1187
// linhas de fallback morto. A flag continua viva em `CronogramaClientPage`, que
// ainda tem um fallback de verdade.
export default function TodayPage() {
  return <CanonicalTodayDashboard />;
}
