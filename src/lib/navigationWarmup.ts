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

  // ⚠️ OS FLASHCARDS DEIXARAM DE SAIR POR PATHNAME (2026-09-10).
  //
  // Este bloco tinha um ramo `pathname.startsWith("/cards")` ANTES do teste de
  // intent, com o motivo escrito ao lado: `/cards` era secao da Pratica, entao
  // `getStudentWarmupIntent` devolvia "pratica" para ele e aquecia as consultas
  // do banco de questoes, que nao servem a tela de cards. Era um remendo
  // correto sobre uma taxonomia errada.
  //
  // Cards e' aba agora, com intent proprio. O ramo especial saiu, e a excecao
  // por caminho deixou de existir junto com a causa dela.
  if (intent === "cards") {
    requests.push(
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getTurboAreaStats(token),
    );
  } else if (intent === "inicio") {
    // O Inicio e' o RESUMO, entao ele toca as mesmas fontes que os blocos
    // resumidos: o dia (agenda + revisoes), a sequencia, e o diagnostico
    // longitudinal de onde estao os assuntos quentes.
    //
    // ⚠️ `getQuestionBankLongitudinalDiagnosis` entra aqui pela primeira vez
    // como aquecimento de tela que o RENDERIZA. Ele ja' era pre-aquecido para a
    // Evolucao -- e nenhuma tela o desenhava. Agora tem consumidor.
    const today = todayISO();
    requests.push(
      getStudentToday(token),
      listReviewTasks(token, { status: "pending", date: today }),
      listReviewTasks(token, { status: "done", date: today }),
      listDirectedStudies(token),
      listEvents(token),
      getOperationalTurboOverview(token, { previewLimit: 4 }),
      getOperationalStreak(token),
      getStudyPerformanceSummary(token),
      getQuestionBankLongitudinalDiagnosis(token),
    );
  } else if (intent === "banco") {
    requests.push(
      browseQuestionBankTopics(token, { limit: 40, include_empty: false }),
      previewQuestionBankAvailability(token),
      getQuestionBankPerformance(token),
    );
  } else if (intent === "mais") {
    // 🚨 AQUI O INTENT NAO CHEGA, e e' preciso o caminho.
    //
    // Os outros quatro intents sao UMA tela cada (ou variacoes dela). O "Mais"
    // e' um MENU de nove telas com dados que nao se parecem: o calendario, a
    // evolucao, a conta. Aquecer pelo intent daria a todas o mesmo conjunto --
    // ou o mais gordo, desperdicando oito nonos, ou o mais magro, deixando
    // todas frias.
    //
    // ⚠️ E' a mesma forma que acabei de REMOVER do `/cards` acima, e a
    // diferenca importa: la' o ramo por caminho remendava uma taxonomia que
    // punha duas telas diferentes na mesma aba, e o conserto foi separar as
    // abas. Aqui a aba e' um menu POR DESENHO -- ela nao vai deixar de conter
    // nove telas. Excecao por caminho e' o remedio certo quando a causa e'
    // definitiva, e o remendo errado quando a causa e' um erro de taxonomia.
    //
    // ⚠️ Sem este mapa, o Cronograma REGREDIA: ele aquecia
    // `listScheduleSuggestions` pela antiga aba Plano, e o import ficou orfao
    // quando a aba deixou de existir. Foi o import morto que denunciou.
    if (pathname.startsWith("/cronograma")) {
      requests.push(getReviewAgenda(token), listScheduleSuggestions(token), listEvents(token));
    } else if (pathname.startsWith("/evolucao") || pathname.startsWith("/estatisticas")) {
      requests.push(
        listDirectedStudies(token),
        listReviewTasks(token, { status: "pending" }),
        listReviewTasks(token, { status: "done" }),
        getStudyPerformanceSummary(token),
        getQuestionBankLongitudinalDiagnosis(token),
        getTurboAreaStats(token),
      );
    } else if (pathname.startsWith("/plano")) {
      requests.push(getStudyPerformanceSummary(token), getReviewAgenda(token));
    } else {
      // A propria tela do menu: ela resume a sequencia e o proximo
      // compromisso, e mais nada. Aquecer os nove destinos ao tocar num menu
      // seriam nove requisicoes para uma navegacao que vai acabar em UMA.
      requests.push(getOperationalStreak(token), getReviewAgenda(token));
    }
  }

  void Promise.allSettled(requests);
}
