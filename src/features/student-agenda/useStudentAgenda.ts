"use client";

import { useQuery } from "@tanstack/react-query";

import { getStudentAgenda } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";

export const STUDENT_AGENDA_FRONTEND_ENABLED =
  process.env.NEXT_PUBLIC_STUDENT_AGENDA_V1 === "1";

export function useStudentAgenda(dateFrom: string, dateTo: string) {
  const { token, tokenResolved } = useAuthToken();
  return useQuery({
    queryKey: queryKeys.studentAgenda(dateFrom, dateTo),
    queryFn: () => getStudentAgenda(token, dateFrom, dateTo),
    enabled:
      STUDENT_AGENDA_FRONTEND_ENABLED && tokenResolved && Boolean(dateFrom && dateTo),
    staleTime: 10_000,
  });
}
