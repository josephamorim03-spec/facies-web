import { api, authHeader } from "../shared/http";

// Push Notifications
// ---------------------------------------------------------------------------

export type NotificationSettings = {
  notify_streak: boolean;
  notify_weekly_goal: boolean;
  notify_important_topic: boolean;
  notify_theory_review: boolean;
  is_active: boolean;
};

export async function getVapidPublicKey(token: string): Promise<{ public_key: string }> {
  return api<{ public_key: string }>("/api/notifications/vapid-key", {
    headers: authHeader(token),
  });
}

export async function saveNotificationSubscription(
  token: string,
  sub: PushSubscriptionJSON
): Promise<void> {
  const keys = sub.keys as { p256dh: string; auth: string };
  await api<void>("/api/notifications/subscribe", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }),
  });
}

export async function deleteNotificationSubscription(token: string): Promise<void> {
  await api<void>("/api/notifications/subscribe", {
    method: "DELETE",
    headers: authHeader(token),
  });
}

export async function getNotificationSettings(token: string): Promise<NotificationSettings> {
  return api<NotificationSettings>("/api/notifications/settings", {
    headers: authHeader(token),
  });
}

export async function updateNotificationSettings(
  token: string,
  settings: Partial<Omit<NotificationSettings, "is_active">>
): Promise<NotificationSettings> {
  return api<NotificationSettings>("/api/notifications/settings", {
    method: "PUT",
    headers: authHeader(token),
    body: JSON.stringify(settings),
  });
}
