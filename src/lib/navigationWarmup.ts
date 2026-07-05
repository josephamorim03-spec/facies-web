"use client";

import {
  browseQuestionBankTopics,
  getOperationalStreak,
  getOperationalTurboOverview,
  getProfile,
  getQuestionBankLongitudinalDiagnosis,
  getQuestionBankPerformance,
  getQuestionBankReviewQueue,
  getReviewAgenda,
  getStudyPerformanceSummary,
  getTurboAreaStats,
  listDirectedStudies,
  listEvents,
  listQuestionBankSessions,
  listReviewTasks,
  listScheduleSuggestions,
  previewQuestionBankAvailability,
} from "@/lib/api";

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
  if (pathname.startsWith("/banco-de-questoes/sessao")) return false;
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

  if (pathname === "/hoje") {
    requests.push(
      getReviewAgenda(token),
      listReviewTasks(token, { status: "pending" }),
      listReviewTasks(token, { status: "done" }),
      listDirectedStudies(token),
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getStudyPerformanceSummary(token),
    );
  } else if (pathname === "/banco-de-questoes") {
    requests.push(
      browseQuestionBankTopics(token, { limit: 40, include_empty: false }),
      previewQuestionBankAvailability(token),
      getQuestionBankReviewQueue(token),
      getQuestionBankPerformance(token),
    );
  } else if (pathname === "/cards-adaptativos" || pathname === "/revisao-turbo" || pathname === "/caderno") {
    requests.push(
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getTurboAreaStats(token),
    );
  } else if (pathname === "/revisoes" || pathname === "/provas") {
    // /provas (Simulados) e /revisoes (Sessões) compartilham o mesmo painel de dados.
    requests.push(
      listQuestionBankSessions(token, { limit: 30 }),
      listReviewTasks(token, { status: "pending" }),
      getStudyPerformanceSummary(token),
      getQuestionBankLongitudinalDiagnosis(token),
    );
  } else if (
    pathname === "/dados-e-relatorios" ||
    pathname === "/estatisticas" ||
    pathname === "/dados-e-relatorios/relatorio" ||
    pathname === "/estatisticas/relatorio"
  ) {
    requests.push(
      listDirectedStudies(token),
      listReviewTasks(token, { status: "pending" }),
      listReviewTasks(token, { status: "done" }),
      getStudyPerformanceSummary(token),
      getQuestionBankLongitudinalDiagnosis(token),
      getTurboAreaStats(token),
    );
  } else if (
    pathname === "/rotina-e-metas" ||
    pathname === "/desempenho" ||
    pathname === "/cronograma" ||
    pathname === "/agenda-operacional" ||
    pathname === "/calendario"
  ) {
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
