"use client";

import LegacyTodayPage from "./LegacyTodayPage";
import { CanonicalTodayDashboard } from "./_components/CanonicalTodayDashboard";
import { STUDENT_AGENDA_FRONTEND_ENABLED } from "@/features/student-agenda/useStudentAgenda";

export default function TodayPage() {
  return STUDENT_AGENDA_FRONTEND_ENABLED ? <CanonicalTodayDashboard /> : <LegacyTodayPage />;
}
