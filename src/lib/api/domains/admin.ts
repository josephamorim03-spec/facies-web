import { api } from "../shared/http";

export type AdminStats = {
  users: {
    total: number;
    last_7_days: number;
    last_30_days: number;
    with_active_access: number;
    never_had_access: number;
    expired_access: number;
  };
  access: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
    by_source: {
      source: string;
      total: number;
      active: number;
      expired: number;
      revoked: number;
    }[];
    granted_last_30_days: number;
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

// ─── Acesso (entitlements) ──────────────────────────────────────────────────

export type Entitlement = {
  entitlement_id: string;
  user_id: string;
  feature_scope: string;
  source_kind: string;
  source_id: string | null;
  starts_at: string;
  ends_at: string | null;
  revoked_at: string | null;
  created_at: string;
  created_by: string | null;
  note: string | null;
  is_active: boolean;
};

export type EntitlementList = {
  user_id: string;
  has_active_access: boolean;
  access_until: string | null;
  entitlements: Entitlement[];
};

export async function adminGetEntitlements(userId: string): Promise<EntitlementList> {
  return api<EntitlementList>(
    `/api/admin/entitlements?user_id=${encodeURIComponent(userId)}`,
  );
}

export async function adminGrantAccess(body: {
  user_id: string;
  days: number;
  reason?: string;
}): Promise<Entitlement> {
  return api<Entitlement>("/api/admin/entitlements", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminRevokeEntitlement(
  entitlementId: string,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(
    `/api/admin/entitlements/${encodeURIComponent(entitlementId)}/revoke`,
    { method: "POST" },
  );
}
