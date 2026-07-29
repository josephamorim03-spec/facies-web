import { api, authHeader } from "../shared/http";

export type ItemKind = "QUESTION" | "TOPIC" | "CARD" | "BLOCK";

export type StudyItem = {
  item_id: string;
  kind: ItemKind;
  topic_ref: string | null;
  criticality: number;
  due_at: string;
  last_review_at: string | null;
  tags: string[];
};

export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export async function me(token: string): Promise<{
  user_id: string;
  email?: string | null;
  email_verified?: boolean | null;
  issuer?: string;
}> {
  return api<{
    user_id: string;
    email?: string | null;
    email_verified?: boolean | null;
    issuer?: string;
  }>("/api/me", { headers: authHeader(token) });
}

export async function listItems(token: string, status: "all" | "due" | "new" = "all"): Promise<StudyItem[]> {
  return api<StudyItem[]>(`/api/items?status=${status}&limit=500`, { headers: authHeader(token) });
}

export async function createItem(token: string, payload: {
  kind: ItemKind;
  topic_ref?: string | null;
  criticality?: number;
  tags?: string[];
}): Promise<StudyItem> {
  return api<StudyItem>("/api/items", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({
      kind: payload.kind,
      topic_ref: payload.topic_ref ?? null,
      criticality: payload.criticality ?? 0,
      tags: payload.tags ?? [],
    }),
  });
}

export async function submitReview(token: string, payload: { item_id: string; rating: Rating }): Promise<any> {
  return api<any>("/api/reviews", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function seedDemo(token: string, count: number = 10): Promise<StudyItem[]> {
  return api<StudyItem[]>(`/api/demo/seed?count=${count}`, {
    method: "POST",
    headers: authHeader(token),
  });
}
