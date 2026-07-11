import { api, authHeader } from "../shared/http";
import type { TrainerAction } from "./trainer";

export type CapabilityHealth = "available" | "degraded" | "disabled";

export type CapabilityStatus = {
  key: string;
  enabled: boolean;
  can_start_action: boolean;
  health: CapabilityHealth;
  reason: string | null;
  required_env: string[];
};

export type CapabilitiesResponse = {
  capabilities: CapabilityStatus[];
};

export type LearningActionStartResult = {
  action_id: string;
  action_kind: string;
  status: "started" | "handoff";
  href: string | null;
  session_id: string | null;
  review_task_id: string | null;
  event_id: string | null;
  blocked_reason: string | null;
};

export async function getCapabilities(token: string): Promise<CapabilitiesResponse> {
  return api<CapabilitiesResponse>("/api/capabilities", {
    headers: authHeader(token),
    clientCache: { ttlMs: 30_000, swrMs: 2 * 60_000, tags: ["capabilities"] },
  });
}

export async function startTrainerAction(
  token: string,
  actionId: string,
  payload: {
    recommendation_id: string;
    action: TrainerAction;
    source_page: string;
    event_id?: string;
  },
): Promise<LearningActionStartResult> {
  return api<LearningActionStartResult>(
    `/api/trainer/actions/${encodeURIComponent(actionId)}/start`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    },
  );
}
