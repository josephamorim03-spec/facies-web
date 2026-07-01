import { clearAuthToken } from "../../auth";
import {
  dispatchSessionExpired,
  isProtectedApiPath,
  isSessionExpirationSuppressedPath,
  SESSION_EXPIRED_HEADER,
  SESSION_EXPIRED_MESSAGE,
} from "../../sessionExpiration";
import { repairMojibake, repairMojibakeDeep } from "../../textEncoding";

export type APIError = { message: string; status?: number; details?: unknown };
export type APIRetryPolicy = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  retryOnStatuses?: number[];
  allowRetryOnNonIdempotent?: boolean;
};
export type ClientCachePolicy = {
  ttlMs?: number;
  swrMs?: number;
  tags?: string[];
  key?: string;
};
export type APIRequestInit = RequestInit & {
  timeoutMs?: number;
  retry?: APIRetryPolicy | false;
  requestId?: string;
  idempotencyKey?: string | null;
  clientCache?: ClientCachePolicy | false;
};

const DEFAULT_API_TIMEOUT_MS = 15000;
export const STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS = 180000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 220;
const DEFAULT_RETRY_MAX_DELAY_MS = 1800;
const DEFAULT_RETRY_JITTER_RATIO = 0.25;
export const INTERNAL_CSRF_HEADER = "X-KrosMed-CSRF";
export const INTERNAL_CSRF_VALUE = "1";
const RETRYABLE_STATUS_CODES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);

type ResolvedClientCachePolicy = Required<Pick<ClientCachePolicy, "ttlMs" | "swrMs">> & {
  tags: string[];
  key?: string;
};

type ClientCacheEntry = {
  path: string;
  tags: Set<string>;
  value: unknown;
  expiresAt: number;
  swrExpiresAt: number;
};

const clientCacheStore = new Map<string, ClientCacheEntry>();
const clientCacheInflight = new Map<string, Promise<unknown>>();
const clientCacheRefreshing = new Set<string>();
let clientCacheGeneration = 0;

function createTimeoutSignal(
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
    timedOut: () => didTimeout,
  };
}

export function getAPIErrorCode(err: unknown): string | null {
  const details = (err as APIError | undefined)?.details as Record<string, unknown> | undefined;
  const detail = details?.detail;
  if (detail && typeof detail === "object") {
    const code = (detail as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  if (typeof details?.code === "string") return details.code;
  return null;
}

export function getAPIErrorDetail(err: unknown): Record<string, unknown> | null {
  const details = (err as APIError | undefined)?.details as Record<string, unknown> | undefined;
  if (details?.detail && typeof details.detail === "object") return details.detail as Record<string, unknown>;
  if (details && typeof details === "object") return details;
  return null;
}

export async function parseJsonSafe(res: Response): Promise<any> {
  const txt = await res.text();
  try {
    const parsed = txt ? JSON.parse(txt) : null;
    return repairMojibakeDeep(parsed);
  } catch {
    return repairMojibake(txt);
  }
}

function resolveRequestId(explicitRequestId?: string): string {
  if (explicitRequestId?.trim()) return explicitRequestId.trim();
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function normalizeHeaders(initHeaders?: HeadersInit): Headers {
  return new Headers(initHeaders ?? {});
}

function methodFromInit(init?: RequestInit): string {
  const method = String(init?.method ?? "GET").trim().toUpperCase();
  return method || "GET";
}

function methodIsIdempotent(method: string): boolean {
  return (
    method === "GET" ||
    method === "HEAD" ||
    method === "OPTIONS" ||
    method === "PUT" ||
    method === "DELETE"
  );
}

function methodCanUseClientCache(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

function isMutatingMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function normalizeApiPath(path: string): { pathname: string; pathWithSearch: string; sameOrigin: boolean } | null {
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://krosmed.local";
    const parsed = new URL(path, base);
    const sameOrigin = parsed.origin === base;
    return {
      pathname: parsed.pathname,
      pathWithSearch: `${parsed.pathname}${parsed.search}`,
      sameOrigin,
    };
  } catch {
    return null;
  }
}

function isClientCacheRuntime(): boolean {
  return typeof window !== "undefined";
}

function isSensitiveApiPath(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return true;
  if (
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/jobs") ||
    pathname.startsWith("/api/version")
  ) {
    return true;
  }
  if (pathname.startsWith("/api/question-bank/sessions")) return true;
  if (pathname.startsWith("/api/studies/import/sessions")) return true;
  if (pathname.startsWith("/api/import/sessions")) return true;
  if (pathname.startsWith("/api/notes/operational/attachments")) return true;
  if (pathname === "/api/notes/operational/turbo") return true;
  if (
    pathname.startsWith("/api/notes/operational/turbo/session/") &&
    !pathname.startsWith("/api/notes/operational/turbo/session/daily-completed-cards")
  ) {
    return true;
  }
  return false;
}

function defaultClientCachePolicy(pathname: string): ResolvedClientCachePolicy | null {
  if (isSensitiveApiPath(pathname)) return null;
  if (pathname === "/api/profile") {
    return { ttlMs: 5 * 60_000, swrMs: 30 * 60_000, tags: ["profile"] };
  }
  if (pathname === "/api/reviews/agenda") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["reviews", "agenda"] };
  }
  if (pathname === "/api/reviews/tasks") {
    return { ttlMs: 45_000, swrMs: 5 * 60_000, tags: ["reviews", "studies"] };
  }
  if (pathname === "/api/studies/directed") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["studies", "reviews"] };
  }
  if (pathname === "/api/studies/performance-summary") {
    return { ttlMs: 90_000, swrMs: 5 * 60_000, tags: ["performance", "studies"] };
  }
  if (pathname === "/api/events") {
    return { ttlMs: 45_000, swrMs: 5 * 60_000, tags: ["calendar", "schedule"] };
  }
  if (pathname === "/api/schedule/workload" || pathname === "/api/schedule/suggestions") {
    return { ttlMs: 45_000, swrMs: 2 * 60_000, tags: ["schedule", "calendar"] };
  }
  if (pathname === "/api/schedule/generate" || pathname === "/api/subjects/rank" || pathname === "/api/user/state") {
    return { ttlMs: 45_000, swrMs: 2 * 60_000, tags: ["schedule", "performance"] };
  }
  if (pathname === "/api/question-bank/topics") {
    return { ttlMs: 5 * 60_000, swrMs: 30 * 60_000, tags: ["question-bank", "question-bank-topics"] };
  }
  if (pathname === "/api/question-bank/availability") {
    return { ttlMs: 30_000, swrMs: 2 * 60_000, tags: ["question-bank", "question-bank-availability"] };
  }
  if (pathname === "/api/question-bank/questions") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["question-bank", "question-bank-questions"] };
  }
  if (pathname === "/api/question-bank/diagnosis/longitudinal") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["question-bank", "performance"] };
  }
  if (pathname === "/api/question-bank/review-queue") {
    return { ttlMs: 30_000, swrMs: 2 * 60_000, tags: ["question-bank", "reviews"] };
  }
  if (pathname === "/api/question-bank/next-action") {
    return { ttlMs: 30_000, swrMs: 2 * 60_000, tags: ["question-bank", "reviews", "performance"] };
  }
  if (pathname === "/api/question-bank/performance") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["question-bank", "performance"] };
  }
  if (pathname === "/api/notes/operational/turbo/area-stats") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["notes", "turbo", "performance"] };
  }
  if (pathname === "/api/notes/operational/turbo/overview") {
    return { ttlMs: 30_000, swrMs: 2 * 60_000, tags: ["notes", "turbo"] };
  }
  if (pathname === "/api/notes/operational/streak") {
    return { ttlMs: 60_000, swrMs: 5 * 60_000, tags: ["notes", "streak"] };
  }
  if (pathname === "/api/notes/operational/turbo/session/daily-completed-cards") {
    return { ttlMs: 90_000, swrMs: 5 * 60_000, tags: ["notes", "turbo", "performance"] };
  }
  if (pathname === "/api/notes/operational") {
    return { ttlMs: 30_000, swrMs: 2 * 60_000, tags: ["notes", "turbo"] };
  }
  return null;
}

function resolveClientCachePolicy(path: string, init: APIRequestInit | undefined, method: string): {
  key: string;
  path: string;
  policy: ResolvedClientCachePolicy;
} | null {
  if (!isClientCacheRuntime() || !methodCanUseClientCache(method)) return null;
  if (init?.clientCache === false || init?.cache === "no-store" || init?.signal) return null;
  const normalized = normalizeApiPath(path);
  if (!normalized?.sameOrigin) return null;
  const defaults = defaultClientCachePolicy(normalized.pathname);
  const explicit = init?.clientCache && typeof init.clientCache === "object" ? init.clientCache : null;
  if (!defaults && !explicit) return null;
  const ttlMs = Math.max(0, explicit?.ttlMs ?? defaults?.ttlMs ?? 60_000);
  if (ttlMs <= 0) return null;
  const swrMs = Math.max(0, explicit?.swrMs ?? defaults?.swrMs ?? 0);
  const headers = normalizeHeaders(init?.headers);
  const authKey = headers.get("Authorization") ?? "";
  const key = explicit?.key ?? `${method} ${normalized.pathWithSearch} ${authKey}`;
  const tags = Array.from(new Set([...(defaults?.tags ?? []), ...(explicit?.tags ?? [])].filter(Boolean)));
  return {
    key,
    path: normalized.pathWithSearch,
    policy: { ttlMs, swrMs, tags },
  };
}

function mutationInvalidationTags(path: string): string[] {
  const normalized = normalizeApiPath(path);
  const pathname = normalized?.pathname ?? path;
  const tags = new Set<string>();
  if (pathname.startsWith("/api/profile")) tags.add("profile");
  if (pathname.startsWith("/api/question-bank")) {
    tags.add("question-bank");
    tags.add("reviews");
    tags.add("studies");
    tags.add("performance");
  }
  if (pathname.startsWith("/api/notes/operational")) {
    tags.add("notes");
    tags.add("turbo");
    tags.add("performance");
    tags.add("reviews");
  }
  if (pathname.startsWith("/api/reviews")) {
    tags.add("reviews");
    tags.add("studies");
    tags.add("performance");
    tags.add("question-bank");
  }
  if (pathname.startsWith("/api/studies")) {
    tags.add("studies");
    tags.add("reviews");
    tags.add("performance");
    tags.add("question-bank");
  }
  if (pathname.startsWith("/api/events")) {
    tags.add("calendar");
    tags.add("schedule");
    tags.add("reviews");
  }
  if (pathname.startsWith("/api/schedule") || pathname.startsWith("/api/user/state")) {
    tags.add("schedule");
    tags.add("calendar");
    tags.add("reviews");
    tags.add("performance");
  }
  return Array.from(tags);
}

export function invalidateClientCache(tagsOrPrefixes?: string | string[]): void {
  if (!isClientCacheRuntime()) return;
  clientCacheGeneration += 1;
  if (!tagsOrPrefixes) {
    clientCacheStore.clear();
    clientCacheInflight.clear();
    clientCacheRefreshing.clear();
    return;
  }
  const tokens = Array.isArray(tagsOrPrefixes) ? tagsOrPrefixes : [tagsOrPrefixes];
  const normalizedTokens = tokens.map((token) => token.trim()).filter(Boolean);
  if (normalizedTokens.length === 0) return;
  for (const [key, entry] of clientCacheStore.entries()) {
    const shouldDelete = normalizedTokens.some((token) => {
      if (token.startsWith("/")) return entry.path.startsWith(token) || key.includes(token);
      return entry.tags.has(token);
    });
    if (shouldDelete) {
      clientCacheStore.delete(key);
      clientCacheInflight.delete(key);
      clientCacheRefreshing.delete(key);
    }
  }
}

async function refreshClientCache<T>(
  key: string,
  path: string,
  init: APIRequestInit | undefined,
  cachePath: string,
  policy: ResolvedClientCachePolicy,
): Promise<T> {
  const pending = clientCacheInflight.get(key);
  if (pending) return pending as Promise<T>;
  const generation = clientCacheGeneration;
  const request = requestApi<T>(path, { ...init, clientCache: false })
    .then((value) => {
      const now = Date.now();
      if (generation === clientCacheGeneration) {
        clientCacheStore.set(key, {
          path: cachePath,
          tags: new Set(policy.tags),
          value,
          expiresAt: now + policy.ttlMs,
          swrExpiresAt: now + policy.ttlMs + policy.swrMs,
        });
      }
      return value;
    })
    .finally(() => {
      clientCacheInflight.delete(key);
      clientCacheRefreshing.delete(key);
    });
  clientCacheInflight.set(key, request);
  return request;
}

function revalidateClientCacheInBackground<T>(
  key: string,
  path: string,
  init: APIRequestInit | undefined,
  cachePath: string,
  policy: ResolvedClientCachePolicy,
): void {
  if (clientCacheRefreshing.has(key)) return;
  clientCacheRefreshing.add(key);
  void refreshClientCache<T>(key, path, init, cachePath, policy).catch(() => {
    clientCacheRefreshing.delete(key);
  });
}

async function apiWithClientCache<T>(
  path: string,
  init: APIRequestInit | undefined,
  cacheConfig: { key: string; path: string; policy: ResolvedClientCachePolicy },
): Promise<T> {
  const now = Date.now();
  const cached = clientCacheStore.get(cacheConfig.key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  if (cached && cached.swrExpiresAt > now) {
    revalidateClientCacheInBackground<T>(
      cacheConfig.key,
      path,
      init,
      cacheConfig.path,
      cacheConfig.policy,
    );
    return cached.value as T;
  }
  try {
    return await refreshClientCache<T>(
      cacheConfig.key,
      path,
      init,
      cacheConfig.path,
      cacheConfig.policy,
    );
  } catch (err) {
    if (cached) return cached.value as T;
    throw err;
  }
}

function parseRetryAfterMs(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30000, seconds * 1000);
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, Math.min(30000, dateMs - Date.now()));
}

function computeBackoffMs(
  attempt: number,
  policy: Required<Omit<APIRetryPolicy, "retryOnStatuses">>,
): number {
  const unclamped = policy.baseDelayMs * (2 ** Math.max(0, attempt - 1));
  const capped = Math.min(policy.maxDelayMs, unclamped);
  const jitterRange = Math.max(0, capped * policy.jitterRatio);
  if (jitterRange <= 0) return Math.round(capped);
  const delta = (Math.random() * jitterRange * 2) - jitterRange;
  return Math.max(0, Math.round(capped + delta));
}

function defaultRetryPolicy(initRetry: APIRetryPolicy | false | undefined): Required<APIRetryPolicy> {
  if (initRetry === false) {
    return {
      maxAttempts: 1,
      baseDelayMs: DEFAULT_RETRY_BASE_DELAY_MS,
      maxDelayMs: DEFAULT_RETRY_MAX_DELAY_MS,
      jitterRatio: DEFAULT_RETRY_JITTER_RATIO,
      retryOnStatuses: [...RETRYABLE_STATUS_CODES],
      allowRetryOnNonIdempotent: false,
    };
  }
  return {
    maxAttempts: Math.max(1, Number(initRetry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)),
    baseDelayMs: Math.max(0, Number(initRetry?.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS)),
    maxDelayMs: Math.max(1, Number(initRetry?.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS)),
    jitterRatio: Math.max(0, Math.min(1, Number(initRetry?.jitterRatio ?? DEFAULT_RETRY_JITTER_RATIO))),
    retryOnStatuses:
      Array.isArray(initRetry?.retryOnStatuses) && initRetry.retryOnStatuses.length > 0
        ? initRetry.retryOnStatuses.filter(
            (status) => Number.isInteger(status) && status >= 400 && status <= 599,
          )
        : [...RETRYABLE_STATUS_CODES],
    allowRetryOnNonIdempotent: Boolean(initRetry?.allowRetryOnNonIdempotent),
  };
}

function buildTimeoutError(): APIError {
  return {
    message: "Tempo de resposta excedido. Tente novamente em instantes.",
    status: 504,
    details: { code: "upstream_timeout" },
  };
}

async function waitMs(durationMs: number, signal?: AbortSignal): Promise<void> {
  if (durationMs <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(resolve, durationMs);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function mergeSignals(primary: AbortSignal, secondary?: AbortSignal): AbortSignal {
  if (!secondary) return primary;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([primary, secondary]);
  }
  const controller = new AbortController();
  const abortFrom = () => controller.abort();
  if (primary.aborted || secondary.aborted) {
    controller.abort();
  } else {
    primary.addEventListener("abort", abortFrom, { once: true });
    secondary.addEventListener("abort", abortFrom, { once: true });
  }
  return controller.signal;
}

function shouldRetryMethod(
  method: string,
  headers: Headers,
  retryPolicy: Required<APIRetryPolicy>,
): boolean {
  if (retryPolicy.maxAttempts <= 1) return false;
  if (methodIsIdempotent(method)) return true;
  const hasIdempotencyKey = Boolean(headers.get("X-Idempotency-Key")?.trim());
  return hasIdempotencyKey || retryPolicy.allowRetryOnNonIdempotent;
}

function buildSessionExpiredError(details?: unknown): APIError {
  const requestId =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>).request_id
      : undefined;
  return {
    message: SESSION_EXPIRED_MESSAGE,
    status: 401,
    details: {
      code: "session_expired",
      ...(typeof requestId === "string" ? { request_id: requestId } : {}),
    },
  };
}

function shouldHandleSessionExpired(path: string, res: Response): boolean {
  return res.status === 401 && isProtectedApiPath(path);
}

function handleSessionExpiredResponse(path: string, res: Response): void {
  if (!shouldHandleSessionExpired(path, res)) return;
  if (typeof window !== "undefined" && !isSessionExpirationSuppressedPath(window.location.pathname)) {
    invalidateClientCache();
    clearAuthToken();
    dispatchSessionExpired({
      reason: res.headers.get(SESSION_EXPIRED_HEADER) === "1" ? "expired" : "unauthorized",
    });
  }
}

export async function toAPIError(res: Response): Promise<APIError> {
  const body = await parseJsonSafe(res);
  const rawDetail = body?.detail;
  const requestId = res.headers.get("x-request-id");
  const details =
    requestId && body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), request_id: requestId }
      : body;
  return {
    message:
      typeof rawDetail === "string"
        ? rawDetail
        : typeof rawDetail?.message === "string"
          ? rawDetail.message
          : body?.message ?? `Request failed: ${res.status}`,
    status: res.status,
    details,
  };
}

export async function fetchRaw(path: string, init?: APIRequestInit): Promise<Response> {
  const requestId = resolveRequestId(init?.requestId);
  const method = methodFromInit(init);
  const isFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = normalizeHeaders(init?.headers);
  if (!isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.idempotencyKey?.trim() && !headers.has("X-Idempotency-Key")) {
    headers.set("X-Idempotency-Key", init.idempotencyKey.trim());
  }
  if (!headers.has("X-Request-Id")) {
    headers.set("X-Request-Id", requestId);
  }
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS" &&
    !headers.has(INTERNAL_CSRF_HEADER)
  ) {
    headers.set(INTERNAL_CSRF_HEADER, INTERNAL_CSRF_VALUE);
  }

  const retryPolicy = defaultRetryPolicy(init?.retry);
  const canRetry = shouldRetryMethod(method, headers, retryPolicy);
  const retryStatuses = new Set<number>(retryPolicy.retryOnStatuses);
  const maxAttempts = canRetry ? retryPolicy.maxAttempts : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeout = createTimeoutSignal(init?.timeoutMs ?? DEFAULT_API_TIMEOUT_MS);
    const signal = mergeSignals(timeout.signal, init?.signal ?? undefined);
    try {
      const response = await fetch(path, {
        ...init,
        method,
        signal,
        headers,
      });
      if (!canRetry || !retryStatuses.has(response.status) || attempt >= maxAttempts) {
        handleSessionExpiredResponse(path, response);
        return response;
      }
      const retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
      const fallbackDelay = computeBackoffMs(attempt, retryPolicy);
      await waitMs(retryAfterMs ?? fallbackDelay, init?.signal ?? undefined);
      continue;
    } catch (err: unknown) {
      const isAbort = (err as { name?: string })?.name === "AbortError";
      const timedOut = timeout.timedOut();
      if (isAbort && !timedOut) {
        throw err;
      }
      if (attempt >= maxAttempts) {
        if (timedOut || isAbort) {
          throw buildTimeoutError();
        }
        throw err;
      }
      const fallbackDelay = computeBackoffMs(attempt, retryPolicy);
      await waitMs(fallbackDelay, init?.signal ?? undefined);
    } finally {
      timeout.cleanup();
    }
  }

  throw buildTimeoutError();
}

async function requestApi<T>(path: string, init?: APIRequestInit): Promise<T> {
  try {
    const res = await fetchRaw(path, init);

    if (!res.ok) {
      const err = await toAPIError(res);
      const sessionExpiredError = shouldHandleSessionExpired(path, res)
        ? buildSessionExpiredError(err.details)
        : null;
      if (sessionExpiredError) throw sessionExpiredError;
      throw err;
    }
    return (await parseJsonSafe(res)) as T;
  } catch (err: unknown) {
    const e = err as { name?: string; status?: number };
    if (e?.name === "AbortError" || e?.status === 504) {
      throw e?.status === 504 ? err : buildTimeoutError();
    }
    throw err;
  }
}

export async function api<T>(path: string, init?: APIRequestInit): Promise<T> {
  const method = methodFromInit(init);
  const cacheConfig = resolveClientCachePolicy(path, init, method);
  if (cacheConfig) {
    return apiWithClientCache<T>(path, init, cacheConfig);
  }

  const result = await requestApi<T>(path, init);
  if (isClientCacheRuntime() && isMutatingMethod(method)) {
    const tags = mutationInvalidationTags(path);
    if (tags.length > 0) invalidateClientCache(tags);
  }
  return result;
}

export function authHeader(token: string): Record<string, string> {
  const normalized = token.trim();
  if (!normalized) return {};
  return { Authorization: `Bearer ${normalized}` };
}

export async function fetchBlob(path: string, init?: APIRequestInit): Promise<Blob> {
  const res = await fetchRaw(path, init);
  if (!res.ok) {
    const err = await toAPIError(res);
    const sessionExpiredError = shouldHandleSessionExpired(path, res)
      ? buildSessionExpiredError(err.details)
      : null;
    if (sessionExpiredError) throw sessionExpiredError;
    throw err;
  }
  return res.blob();
}
