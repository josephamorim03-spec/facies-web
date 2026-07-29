"use client";

import {
  browseQuestionBankTopics,
  getOperationalStreak,
  getOperationalTurboOverview,
  getProfile,
  getQuestionBankLongitudinalDiagnosis,
  getQuestionBankPerformance,
  getReviewAgenda,
  getStudyPerformanceSummary,
  getTurboAreaStats,
  listDirectedStudies,
  listEvents,
  listReviewTasks,
  listScheduleSuggestions,
  previewQuestionBankAvailability,
  getStudentExperience,
} from "@/lib/api";
import { getStudentWarmupIntent } from "@/lib/navConfig";

type RoutePrefetcher = {
  prefetch: (href: string) => void;
};

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const DATA_WARMUP_COOLDOWN_MS = 20_000;
const warmedDataAt = new Map<string, number>();

function normalizeRoute(href: string): string {
  try {
    const parsed = new URL(href, window.location.origin);
    return parsed.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const [withoutHash] = href.split("#", 1);
    const [withoutQuery] = withoutHash.split("?", 1);
    return (withoutQuery || "/").replace(/\/+$/, "") || "/";
  }
}

function isWarmableRoute(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/auth") || pathname.startsWith("/login")) return false;
  if (pathname.startsWith("/banco/sessao")) return false;
  if (pathname.startsWith("/revisao-turbo/sessao")) return false;
  return true;
}

export function canWarmNavigationData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (connection?.saveData) return false;
  const effectiveType = connection?.effectiveType?.toLowerCase() ?? "";
  if (effectiveType === "slow-2g" || effectiveType === "2g") return false;
  return true;
}

export function warmRoute(href: string, router?: RoutePrefetcher): void {
  if (!router) return;
  const pathname = normalizeRoute(href);
  if (!isWarmableRoute(pathname)) return;
  try {
    router.prefetch(href);
  } catch {
    // Prefetch is opportunistic; navigation must never depend on it.
  }
}

export function warmRouteData(href: string, token: string | null | undefined): void {
  if (!token || !canWarmNavigationData()) return;
  const pathname = normalizeRoute(href);
  if (!isWarmableRoute(pathname)) return;
  const now = Date.now();
  const cacheKey = `${pathname}:${token.slice(0, 12)}`;
  const lastWarm = warmedDataAt.get(cacheKey) ?? 0;
  if (now - lastWarm < DATA_WARMUP_COOLDOWN_MS) return;
  warmedDataAt.set(cacheKey, now);

  const requests: Array<Promise<unknown>> = [getProfile(token)];
  requests.push(getStudentExperience(token, "week"));
  const intent = getStudentWarmupIntent(pathname);

  if (intent === "today") {
    requests.push(
      getReviewAgenda(token),
      listReviewTasks(token, { status: "pending" }),
      listReviewTasks(token, { status: "done" }),
      listDirectedStudies(token),
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getStudyPerformanceSummary(token),
    );
  } else if (intent === "kros" || intent === "bank") {
    requests.push(
      browseQuestionBankTopics(token, { limit: 40, include_empty: false }),
      previewQuestionBankAvailability(token),
      getQuestionBankPerformance(token),
    );
  } else if (intent === "cards") {
    requests.push(
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getTurboAreaStats(token),
    );
  } else if (intent === "evolution") {
    requests.push(
      listDirectedStudies(token),
      listReviewTasks(token, { status: "pending" }),
      listReviewTasks(token, { status: "done" }),
      getStudyPerformanceSummary(token),
      getQuestionBankLongitudinalDiagnosis(token),
      getTurboAreaStats(token),
    );
  } else if (intent === "planning") {
    requests.push(
      getReviewAgenda(token),
      listReviewTasks(token, { status: "pending" }),
      listEvents(token),
      listScheduleSuggestions(token),
      getStudyPerformanceSummary(token),
    );
  }

  void Promise.allSettled(requests);
}
