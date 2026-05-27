import { api, authHeader } from "../shared/http";

export type AdminStats = {
  users: {
    total: number;
    last_7_days: number;
    last_30_days: number;
    with_active_key: number;
    without_key: number;
    expired_key: number;
  };
  access_keys: {
    total: number;
    available: number;
    active: number;
    expired: number;
    revoked: number;
    by_mentor_label: {
      label: string;
      total: number;
      available: number;
      active: number;
      expired: number;
      revoked: number;
    }[];
    redeemed_last_30_days: number;
    avg_duration_days: number;
  };
  review_activity: {
    today: number;
    last_7_days: number;
    last_month: number;
    active_users_last_7_days: number;
    daily_last_14_days: { date: string; reviews: number }[];
    top_users_last_30_days: { user_id: string; email: string | null; reviews: number }[];
  };
  storage: {
    total_questions: number;
    total_study_items: number;
  };
};

export type AccessKeyOut = {
  key_id: string;
  key_code_masked: string;
  key_code?: string | null;
  mentor_label: string;
  duration_days: number;
  redeemed_by: string | null;
  redeemed_by_email: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  status: "available" | "redeemed" | "expired" | "revoked";
};

export async function adminCreateBatch(
  body: { mentor_label: string; quantity: number; duration_days: number },
): Promise<{ keys: AccessKeyOut[] }> {
  return api<{ keys: AccessKeyOut[] }>("/api/admin/access-keys", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminListKeys(
  mentorLabel?: string,
  options?: { q?: string; status?: string },
): Promise<{ keys: AccessKeyOut[] }> {
  const params = new URLSearchParams();
  if (mentorLabel) params.set("mentor_label", mentorLabel);
  if (options?.q) params.set("q", options.q);
  if (options?.status) params.set("status", options.status);
  const qs = params.toString();
  return api<{ keys: AccessKeyOut[] }>(
    `/api/admin/access-keys${qs ? `?${qs}` : ""}`,
  );
}

export async function adminRevokeKey(
  keyId: string,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/admin/access-keys/${keyId}/revoke`, {
    method: "POST",
  });
}

export async function adminHardDeleteKey(
  keyId: string,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/admin/access-keys/${keyId}/hard-delete`, {
    method: "POST",
  });
}

export async function adminExtendKey(
  keyId: string,
  extraDays: number,
): Promise<{ key: AccessKeyOut }> {
  return api<{ key: AccessKeyOut }>(`/api/admin/access-keys/${keyId}/extend`, {
    method: "POST",
    body: JSON.stringify({ extra_days: extraDays }),
  });
}

export async function adminGetStats(): Promise<AdminStats> {
  return api<AdminStats>("/api/admin/stats");
}

export type AuditEntry = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditLogResponse = {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
};

export async function adminGetAuditLog(
  options?: { limit?: number; offset?: number; action?: string; target_type?: string },
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  if (options?.action) params.set("action", options.action);
  if (options?.target_type) params.set("target_type", options.target_type);
  const qs = params.toString();
  return api<AuditLogResponse>(`/api/admin/audit${qs ? `?${qs}` : ""}`);
}

export async function redeemKey(
  token: string,
  keyCode: string,
): Promise<{ ok: boolean; expires_at: string }> {
  return api<{ ok: boolean; expires_at: string }>("/api/access-keys/redeem", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ key_code: keyCode }),
  });
}
