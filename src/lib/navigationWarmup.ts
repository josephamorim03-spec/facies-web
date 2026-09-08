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
  getStudentToday,
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

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

  // Cada aba absorveu os intents antigos: `planning` virou secao de CONDUTA
  // (Hoje + Minha semana + O plano) e os flashcards viraram secao de PRATICA. Os
  // conjuntos de dados dos pais foram fundidos — quem toca a aba pode ir para
  // qualquer uma das secoes, entao aquecer so metade deixaria o segundo
  // destino frio exatamente na navegacao mais provavel.
  //
  // ⚠️ Os flashcards saem por PATHNAME, e nao por intent: `/cards` virou secao
  // da Pratica, entao `getStudentWarmupIntent` devolve "pratica" para ele e as
  // consultas do banco de questoes nao servem a tela de cards.
  if (pathname.startsWith("/cards")) {
    requests.push(
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getTurboAreaStats(token),
    );
  } else if (intent === "conduta") {
    const today = todayISO();
    requests.push(
      getStudentToday(token),
      listReviewTasks(token, { status: "pending", date: today }),
      listReviewTasks(token, { status: "done", date: today }),
      listDirectedStudies(token),
      listEvents(token),
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getStudyPerformanceSummary(token),
      // vindos do antigo intent `planning` (Cronograma)
      getReviewAgenda(token),
      listScheduleSuggestions(token),
    );
  } else if (intent === "pratica") {
    requests.push(
      browseQuestionBankTopics(token, { limit: 40, include_empty: false }),
      previewQuestionBankAvailability(token),
      getQuestionBankPerformance(token),
    );
  } else if (intent === "evolucao") {
    // vindos do antigo intent `evolution`
    requests.push(
      listDirectedStudies(token),
      listReviewTasks(token, { status: "pending" }),
      listReviewTasks(token, { status: "done" }),
      getStudyPerformanceSummary(token),
      getQuestionBankLongitudinalDiagnosis(token),
      getTurboAreaStats(token),
    );
  }

  void Promise.allSettled(requests);
}
