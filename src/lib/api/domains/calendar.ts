import { api, authHeader } from "../shared/http";

// ── Calendar Events ──────────────────────────────────────────────

export type CalendarEventOut = {
  event_id: string;
  user_id: string;
  label: string;
  event_type: string;
  weekday: number | null;
  event_date: string | null;
  active_until: string | null;
  duration_hours: number;
  created_at: string;
};

export async function listEvents(token: string): Promise<CalendarEventOut[]> {
  return api<CalendarEventOut[]>("/api/events", { headers: authHeader(token) });
}

export async function createEvent(
  token: string,
  payload: {
    label: string;
    event_type: string;
    weekday?: number | null;
    event_date?: string | null;
    duration_hours: number;
  }
): Promise<CalendarEventOut> {
  return api<CalendarEventOut>("/api/events", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(
  token: string,
  eventId: string,
  options?: { scope?: "future" | "all"; effective_from?: string }
): Promise<void> {
  const q = new URLSearchParams();
  if (options?.scope) q.set("scope", options.scope);
  if (options?.effective_from) q.set("effective_from", options.effective_from);
  const qs = q.toString();
  return api<void>(`/api/events/${eventId}${qs ? `?${qs}` : ""}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

// ── Schedule / Workload ──────────────────────────────────────────

export type WorkloadDay = {
  date: string;
  weekday: number;
  load: number;
  blocked_fraction: number;
};

export async function getWorkload(
  token: string,
  week?: string
): Promise<WorkloadDay[]> {
  const qs = week ? `?week=${week}` : "";
  return api<WorkloadDay[]>(`/api/schedule/workload${qs}`, {
    headers: authHeader(token),
  });
}

export type ScheduleSuggestionItem = {
  task_id: string;
  area: string;
  theme: string;
  current_due_date: string;
  suggested_due_date: string;
  reason: string;
  applied: boolean;
};

export type ScheduleSuggestion = {
  suggestion_id: string;
  status: string;
  created_at: string;
  items: ScheduleSuggestionItem[];
};

export async function listScheduleSuggestions(token: string): Promise<ScheduleSuggestion[]> {
  return api<ScheduleSuggestion[]>("/api/schedule/suggestions", {
    headers: authHeader(token),
  });
}

export async function triggerScheduleSuggestion(token: string): Promise<void> {
  return api<void>("/api/schedule/suggest", {
    method: "POST",
    headers: authHeader(token),
  });
}

export async function acceptScheduleSuggestionItem(
  token: string,
  suggestionId: string,
  taskId: string
): Promise<ScheduleSuggestion> {
  return api<ScheduleSuggestion>(`/api/schedule/suggestions/${suggestionId}/accept-item`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ task_id: taskId }),
  });
}

export async function acceptScheduleSuggestionAll(
  token: string,
  suggestionId: string
): Promise<ScheduleSuggestion> {
  return api<ScheduleSuggestion>(`/api/schedule/suggestions/${suggestionId}/accept-all`, {
    method: "POST",
    headers: authHeader(token),
  });
}

export async function rejectScheduleSuggestion(
  token: string,
  suggestionId: string
): Promise<ScheduleSuggestion> {
  return api<ScheduleSuggestion>(`/api/schedule/suggestions/${suggestionId}/reject`, {
    method: "POST",
    headers: authHeader(token),
  });
}

// ── Adaptive Scheduling ──────────────────────────────────────────

export type AdaptiveUserState = {
  user_id: string;
  is_on_call: boolean;
  post_call: boolean;
  energy_level: number;
  sleep_hours: number;
  updated_at: string;
};

export type AdaptiveUserStateIn = {
  is_on_call: boolean;
  post_call: boolean;
  energy_level: number;
  sleep_hours: number;
};

export type AdaptiveSubjectRank = {
  area: string;
  theme: string;
  incidence_weight: number;
  error_rate: number;
  cognitive_factor: number;
  context_multiplier: number;
  score: number;
};

export type AdaptiveScheduleBlock = {
  area: string;
  theme: string;
  minutes: number;
  score: number;
};

export type AdaptiveScheduleGenerate = {
  mode: "NORMAL" | "ON_CALL" | "MANDATORY_REST" | string;
  date: string;
  focus_minutes: number;
  buffer_minutes: number;
  total_planned_minutes: number;
  recovery_mode: boolean;
  rebalance_required: boolean;
  reason: string | null;
  blocks: AdaptiveScheduleBlock[];
};

export type AdaptiveRebalanceItem = {
  task_id: string;
  old_due_date: string;
  new_due_date: string;
  locked: boolean;
};

export type AdaptiveRebalanceOut = {
  horizon_days: number;
  redistributed: number;
  recovery_mode: boolean;
  rebalance_required: boolean;
  reason: string | null;
  items: AdaptiveRebalanceItem[];
};

export async function getUserState(token: string): Promise<AdaptiveUserState> {
  return api<AdaptiveUserState>("/api/user/state", { headers: authHeader(token) });
}

export async function setUserState(
  token: string,
  payload: AdaptiveUserStateIn
): Promise<AdaptiveUserState> {
  return api<AdaptiveUserState>("/api/user/state", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function getSubjectsRank(
  token: string,
  limit: number = 10
): Promise<AdaptiveSubjectRank[]> {
  return api<AdaptiveSubjectRank[]>(`/api/subjects/rank?limit=${limit}`, {
    headers: authHeader(token),
  });
}

export async function getAdaptiveSchedule(
  token: string,
  day?: string
): Promise<AdaptiveScheduleGenerate> {
  const qs = day ? `?day=${day}` : "";
  return api<AdaptiveScheduleGenerate>(`/api/schedule/generate${qs}`, {
    headers: authHeader(token),
  });
}

export async function rebalanceSchedule(
  token: string,
  payload: { horizon_days: number }
): Promise<AdaptiveRebalanceOut> {
  return api<AdaptiveRebalanceOut>("/api/schedule/rebalance", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}
