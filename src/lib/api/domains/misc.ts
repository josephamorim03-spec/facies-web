import { api, authHeader } from "../shared/http";

// Dev / Reset
export async function resetUserData(token: string): Promise<void> {
  await api<void>("/api/demo/reset", {
    method: "DELETE",
    headers: authHeader(token),
  });
}

// FSRS config
export type FsrsConfig = {
  parameters: number[] | null;
  desired_retention: number;
};

export async function getFsrsConfig(token: string): Promise<FsrsConfig> {
  return api<FsrsConfig>("/api/fsrs/config", { headers: authHeader(token) });
}

export async function putFsrsConfig(
  token: string,
  payload: { parameters?: number[] | null; desired_retention?: number }
): Promise<FsrsConfig> {
  return api<FsrsConfig>("/api/fsrs/config", {
    method: "PUT",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export type WeeklyTimelineArea = {
  total: number;
  correct: number;
  accuracy_pct: number | null;
};

export type WeeklyTimelineWeek = {
  week_label: string;
  week_start: string;
  total: number;
  correct: number;
  accuracy_pct: number | null;
  areas: Record<string, WeeklyTimelineArea>;
};

export type WeeklyTimeline = {
  weeks: WeeklyTimelineWeek[];
  delta_by_area: Record<string, number | null>;
};

export async function getWeeklyTimeline(token: string, weeks = 12): Promise<WeeklyTimeline> {
  return api<WeeklyTimeline>(`/api/studies/weekly-timeline?weeks=${weeks}`, {
    headers: authHeader(token),
  });
}

