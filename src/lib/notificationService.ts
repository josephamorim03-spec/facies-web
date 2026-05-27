/**
 * Browser-side Web Push helper.
 *
 * Usage:
 *   const sub = await requestAndSubscribe(vapidPublicKey);
 *   if (sub) await saveNotificationSubscription(token, sub.toJSON());
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Requests notification permission and creates a PushSubscription.
 * Returns null if permission was denied or push is unsupported.
 */
export async function requestAndSubscribe(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) return null;

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  return sub;
}

/**
 * Unsubscribes from push on the browser side (backend cleanup is separate).
 */
export async function browserUnsubscribe(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}
