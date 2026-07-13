import { api, authHeader, fetchBlob, fetchRaw, toAPIError } from "../shared/http";

// Operational notes (CNO)
export type OperationalSourceType = "question" | "reading";
export type OperationalQuestionOutcome = "correct" | "incorrect";
export type OperationalSort = "recent" | "oldest" | "weight_desc" | "weight_asc";
export type OperationalAreaCode = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
export type OperationalTurboResult =
  | "again"
  | "hard"
  | "good"
  | "easy"
  | "skip"
  | "correct"
  | "incorrect";

export type OperationalNoteItem = {
  note_id: string;
  area: string;
  theme: string;
  source_type: OperationalSourceType;
  question_outcome: OperationalQuestionOutcome | null;
  insight_question: string;
  title: string;
  body: string;
  weight: number;
  question_id: string | null;
  external_links: string[];
  attachment_refs: string[];
  turbo_due_at: string | null;
  turbo_seen: number;
  turbo_correct: number;
  turbo_incorrect: number;
  last_turbo_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export type OperationalStreak = {
  streak_days: number;
  streak_max: number;
  streak_at_risk: boolean;
  streak_reviews: number;
  streak_flashcards_seen: number;
  weekly_study_days: number;
  active_protection: boolean;
  protection_window_end: string | null;
};


export type OperationalTurboAreaStatsItem = {
  area: string;
  notes_count: number;
  reviews_total: number;
  reviews_correct: number;
  reviews_incorrect: number;
};

export type OperationalTurboAreaStats = {
  total_notes: number;
  total_reviews: number;
  total_correct: number;
  total_incorrect: number;
  by_area: OperationalTurboAreaStatsItem[];
};

export type OperationalTurboReasonCode =
  | "new_card"
  | "due_now"
  | "overdue"
  | "wrong_question"
  | "high_weight"
  | "recent_errors"
  | "weak_theme";

export type OperationalTurboReasonCount = {
  reason: OperationalTurboReasonCode;
  label: string;
  count: number;
};

export type OperationalTurboAreaSummaryItem = {
  area: string;
  due_count: number;
  new_count: number;
  overdue_count: number;
  total_eligible: number;
};

export type OperationalTurboCardContext = {
  note_id: string;
  reasons: OperationalTurboReasonCode[];
  primary_reason: OperationalTurboReasonCode;
  label: string;
};

export type OperationalTurboPriorityPreviewItem = {
  note_id: string;
  area: string;
  theme: string;
  insight_question: string;
  weight: number;
  turbo_due_at: string | null;
  context: OperationalTurboCardContext;
};

export type OperationalTurboOverview = {
  due_count: number;
  new_count: number;
  overdue_count: number;
  total_eligible: number;
  suggested_target_cards: number;
  estimated_minutes: number;
  reason_counts: OperationalTurboReasonCount[];
  by_area: OperationalTurboAreaSummaryItem[];
  priority_preview: OperationalTurboPriorityPreviewItem[];
};

export type OperationalTurboReviewOut = {
  note_id: string;
  turbo_due_at: string | null;
  turbo_seen: number;
  turbo_correct: number;
  turbo_incorrect: number;
  last_turbo_at: string | null;
};

export type OperationalTurboReviewChange = {
  note_id: string;
  area: string | null;
  theme: string | null;
  rating: "again" | "hard" | "good" | "easy";
  previous_due_at: string | null;
  next_due_at: string;
  next_due_in_days: number;
};

export type OperationalTurboSessionSnapshot = {
  session_id: string;
  status: "active" | "completed" | "cancelled" | string;
  session_total: number;
  session_pending: number;
  session_correct: number;
  session_incorrect: number;
  session_done: boolean;
  is_repeat_session: boolean;
  is_standby_round: boolean;
  can_repeat_session: boolean;
  can_navigate_prev: boolean;
  can_navigate_next: boolean;
  note: OperationalNoteItem | null;
  current_card_context?: OperationalTurboCardContext | null;
  last_review_change?: OperationalTurboReviewChange | null;
};

export type OperationalTurboSessionDailyCardsItem = {
  day: string;
  cards_completed: number;
  sessions_completed: number;
};

export type OperationalTurboSessionDailyCards = {
  timezone: string;
  by_day: OperationalTurboSessionDailyCardsItem[];
};

export type OperationalAttachmentPresignOut = {
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  attachment_ref: string;
  expires_in_seconds: number;
};

const LOCAL_PROTECTED_ATTACHMENT_SEGMENT = "/notes/operational/attachments/local-file/";
const ATTACHMENT_CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
};

export function inferOperationalAttachmentContentType(file: Pick<File, "name" | "type">): string {
  const explicitType = file.type?.split(";", 1)[0]?.trim().toLowerCase();
  if (explicitType) return explicitType;
  const extension = file.name.split(".").pop()?.trim().toLowerCase() ?? "";
  return ATTACHMENT_CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export async function createOperationalNote(
  token: string,
  payload: {
    area: "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
    theme: string;
    source_type: OperationalSourceType;
    question_outcome?: OperationalQuestionOutcome | null;
    insight_question: string;
    body: string;
    weight: number;
    question_id?: string | null;
    external_links?: string[];
    attachment_refs?: string[];
  },
  options?: { idempotencyKey?: string | null },
): Promise<OperationalNoteItem> {
  const idempotencyKey = options?.idempotencyKey?.trim() ?? "";
  return api<OperationalNoteItem>("/api/notes/operational", {
    method: "POST",
    headers: {
      ...authHeader(token),
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      ...payload,
      question_outcome: payload.question_outcome ?? null,
      question_id: payload.question_id ?? null,
      external_links: payload.external_links ?? [],
      attachment_refs: payload.attachment_refs ?? [],
    }),
  });
}

export async function listOperationalNotes(
  token: string,
  params?: {
    area?: string;
    theme?: string;
    source_type?: OperationalSourceType | "";
    question_outcome?: OperationalQuestionOutcome | "";
    weight_min?: number;
    weight_max?: number;
    created_from?: string;
    created_to?: string;
    sort?: OperationalSort;
    limit?: number;
  }
): Promise<OperationalNoteItem[]> {
  const q = new URLSearchParams();
  if (params?.area) q.set("area", params.area);
  if (params?.theme) q.set("theme", params.theme);
  if (params?.source_type) q.set("source_type", params.source_type);
  if (params?.question_outcome) q.set("question_outcome", params.question_outcome);
  if (typeof params?.weight_min === "number") q.set("weight_min", String(params.weight_min));
  if (typeof params?.weight_max === "number") q.set("weight_max", String(params.weight_max));
  if (params?.created_from) q.set("created_from", params.created_from);
  if (params?.created_to) q.set("created_to", params.created_to);
  if (params?.sort) q.set("sort", params.sort);
  if (typeof params?.limit === "number") q.set("limit", String(params.limit));
  const qs = q.toString();
  return api<OperationalNoteItem[]>(`/api/notes/operational${qs ? `?${qs}` : ""}`, {
    headers: authHeader(token),
  });
}


export async function getTurboAreaStats(token: string): Promise<OperationalTurboAreaStats> {
  return api<OperationalTurboAreaStats>("/api/notes/operational/turbo/area-stats", {
    headers: authHeader(token),
  });
}

export async function getOperationalTurboOverview(
  token: string,
  params?: { area?: string; previewLimit?: number },
): Promise<OperationalTurboOverview> {
  const q = new URLSearchParams();
  if (params?.area) q.set("area", params.area);
  if (typeof params?.previewLimit === "number") q.set("preview_limit", String(params.previewLimit));
  const qs = q.toString();
  return api<OperationalTurboOverview>(
    `/api/notes/operational/turbo/overview${qs ? `?${qs}` : ""}`,
    { headers: authHeader(token) },
  );
}

export async function getOperationalStreak(token: string): Promise<OperationalStreak> {
  return api<OperationalStreak>("/api/notes/operational/streak", {
    headers: authHeader(token),
  });
}

export async function getOperationalTurboNext(
  token: string,
  includeFutureFallback: boolean = true,
  excludeNoteIds: string[] = []
): Promise<OperationalNoteItem | null> {
  const q = new URLSearchParams({ include_future_fallback: includeFutureFallback ? "true" : "false" });
  if (excludeNoteIds.length > 0) q.set("exclude_note_ids", excludeNoteIds.join(","));
  return api<OperationalNoteItem | null>(`/api/notes/operational/turbo?${q.toString()}`, {
    headers: authHeader(token),
  });
}

export async function submitOperationalTurboReview(
  token: string,
  noteId: string,
  payload: { result: OperationalTurboResult }
): Promise<OperationalTurboReviewOut> {
  return api<OperationalTurboReviewOut>(`/api/notes/operational/${noteId}/turbo-review`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export type TurboIntervalPreview = {
  again: number;
  hard: number;
  good: number;
  easy: number;
};

export async function fetchTurboIntervalPreview(
  token: string,
  noteId: string,
): Promise<TurboIntervalPreview> {
  return api<TurboIntervalPreview>(
    `/api/notes/operational/turbo/interval-preview?note_id=${encodeURIComponent(noteId)}`,
    { headers: authHeader(token) },
  );
}

export async function startOperationalTurboSession(
  token: string,
  options?: {
    noteIds?: string[];
    targetCards?: number;
    area?: OperationalAreaCode;
    recommendationId?: string;
    actionId?: string;
  },
): Promise<OperationalTurboSessionSnapshot> {
  const payload: Record<string, unknown> = {};
  if (options?.noteIds?.length) payload.note_ids = options.noteIds;
  if (typeof options?.targetCards === "number" && options.targetCards >= 1) payload.target_cards = options.targetCards;
  if (options?.area) payload.area = options.area;
  if (options?.recommendationId) payload.recommendation_id = options.recommendationId;
  if (options?.actionId) payload.action_id = options.actionId;
  return api<OperationalTurboSessionSnapshot>("/api/notes/operational/turbo/session/start", {
    method: "POST",
    headers: authHeader(token),
    ...(Object.keys(payload).length > 0 ? { body: JSON.stringify(payload) } : {}),
  });
}

export async function submitOperationalTurboSessionAction(
  token: string,
  sessionId: string,
  payload: { result: OperationalTurboResult }
): Promise<OperationalTurboSessionSnapshot> {
  return api<OperationalTurboSessionSnapshot>(`/api/notes/operational/turbo/session/${sessionId}/action`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function navigateOperationalTurboSession(
  token: string,
  sessionId: string,
  payload: { direction: "prev" | "next" }
): Promise<OperationalTurboSessionSnapshot> {
  return api<OperationalTurboSessionSnapshot>(`/api/notes/operational/turbo/session/${sessionId}/navigate`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function repeatOperationalTurboSession(
  token: string,
  sessionId: string
): Promise<OperationalTurboSessionSnapshot> {
  return api<OperationalTurboSessionSnapshot>(`/api/notes/operational/turbo/session/${sessionId}/repeat`, {
    method: "POST",
    headers: authHeader(token),
  });
}

export async function getOperationalTurboSessionDailyCompletedCards(
  token: string,
  days: number = 180,
): Promise<OperationalTurboSessionDailyCards> {
  const safeDays = Number.isFinite(days) ? Math.min(730, Math.max(1, Math.floor(days))) : 180;
  return api<OperationalTurboSessionDailyCards>(
    `/api/notes/operational/turbo/session/daily-completed-cards?days=${safeDays}`,
    { headers: authHeader(token) },
  );
}

export async function presignOperationalAttachment(
  token: string,
  payload: { filename: string; content_type: string; size_bytes: number }
): Promise<OperationalAttachmentPresignOut> {
  return api<OperationalAttachmentPresignOut>("/api/notes/operational/attachments/presign", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function putOperationalAttachmentBinary(
  uploadUrl: string,
  payload: {
    method: string;
    headers: Record<string, string>;
    body: Blob;
  }
): Promise<void> {
  const targetUrl = uploadUrl.startsWith("/notes/") ? `/api${uploadUrl}` : uploadUrl;
  const response = await fetchRaw(targetUrl, {
    method: payload.method || "PUT",
    headers: payload.headers ?? {},
    body: payload.body,
    timeoutMs: 30000,
  });
  if (!response.ok) {
    throw await toAPIError(response);
  }
}

export async function getOperationalAttachmentDownloadUrl(
  token: string,
  attachmentRef: string
): Promise<{ url: string }> {
  const q = new URLSearchParams({ attachment_ref: attachmentRef });
  const out = await api<{ url: string }>(`/api/notes/operational/attachments/url?${q.toString()}`, {
    headers: authHeader(token),
  });
  if (out.url.startsWith("/notes/")) {
    return { url: `/api${out.url}` };
  }
  return out;
}

export function isProtectedOperationalAttachmentUrl(url: string): boolean {
  return url.includes(LOCAL_PROTECTED_ATTACHMENT_SEGMENT);
}

export async function fetchProtectedOperationalAttachmentBlob(
  token: string,
  url: string,
): Promise<Blob> {
  return fetchBlob(url, {
    headers: authHeader(token),
    timeoutMs: 30000,
  });
}

export async function resolveOperationalAttachmentDisplayUrl(
  token: string,
  attachmentRef: string,
): Promise<{ url: string; revoke?: () => void }> {
  const payload = await getOperationalAttachmentDownloadUrl(token, attachmentRef);
  const rawUrl = String(payload?.url ?? "").trim();
  if (!rawUrl) throw new Error("missing_attachment_url");
  if (!isProtectedOperationalAttachmentUrl(rawUrl)) {
    return { url: rawUrl };
  }
  const blob = await fetchProtectedOperationalAttachmentBlob(token, rawUrl);
  const objectUrl = URL.createObjectURL(blob);
  return {
    url: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function deleteOperationalNote(token: string, noteId: string): Promise<void> {
  await api<void>(`/api/notes/operational/${noteId}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

export interface OperationalNoteUpdatePayload {
  area?: string;
  theme?: string;
  source_type?: string;
  question_outcome?: string | null;
  insight_question?: string;
  body?: string;
  weight?: number;
  question_id?: string | null;
  external_links?: string[];
  attachment_refs?: string[];
}

export async function updateOperationalNote(
  token: string,
  noteId: string,
  payload: OperationalNoteUpdatePayload
): Promise<OperationalNoteItem> {
  return api<OperationalNoteItem>(`/api/notes/operational/${noteId}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}
