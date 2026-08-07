import { api, authHeader } from "../shared/http";

export type RoutinePrefill = {
  /** O calendário prevê plantão neste dia. Previsão, não registro. */
  on_call_expected: boolean;
  blocked_hours: number;
  post_48h_recovery: boolean;
};

export type RoutineCheckin = {
  local_date: string;
  sleep_minutes: number | null;
  sleep_quality: number | null;
  energy: number | null;
  /** Tri-estado: `null` = o aluno não respondeu. */
  on_call_confirmed: boolean | null;
  on_call_unplanned: boolean;
  source: string;
  updated_at: string | null;
};

export type RoutineCheckinDay = {
  local_date: string;
  checkin: RoutineCheckin | null;
  prefill: RoutinePrefill;
};

/**
 * Só as chaves presentes são gravadas: `undefined` preserva o valor anterior,
 * `null` limpa. Ausência nunca vira zero — por isso o tipo distingue os dois.
 */
export type RoutineCheckinPatch = {
  sleep_minutes?: number | null;
  sleep_quality?: number | null;
  energy?: number | null;
  on_call_confirmed?: boolean | null;
  on_call_unplanned?: boolean | null;
};

export async function getTodayCheckin(token: string): Promise<RoutineCheckinDay> {
  return api<RoutineCheckinDay>("/api/routine/check-ins/today", {
    headers: authHeader(token),
    cache: "no-store",
  });
}

export async function saveCheckin(
  token: string,
  localDate: string,
  patch: RoutineCheckinPatch,
): Promise<RoutineCheckinDay> {
  return api<RoutineCheckinDay>(
    `/api/routine/check-ins/${encodeURIComponent(localDate)}`,
    {
      method: "PUT",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
}
