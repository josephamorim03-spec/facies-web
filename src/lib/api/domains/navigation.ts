import { api, authHeader } from "../shared/http";
import type { TrainerAction } from "./trainer";

export type NavigationEnergy = "low" | "normal" | "high";
export type NavigationCognitiveLoad = "low" | "moderate" | "high";

/**
 * O que a tela precisa para perguntar tempo e energia sem cobrar digitação.
 *
 * Os dois continuam sendo sempre perguntados. A rotina do aluno não substitui a
 * pergunta: ela fornece os presets e o valor pré-selecionado, para responder
 * custar um toque — mas a tela também aceita o tempo digitado, porque preset é
 * atalho e não o conjunto das respostas possíveis.
 */
export type NavigationPrompt = {
  /** Presets de tempo já informados pela rotina — não a lista fixa da spec. */
  presets: number[];
  suggested_minutes: number;
  suggested_energy: NavigationEnergy;
  /**
   * `daily_checkin` quando o aluno declarou energia hoje; `assumed` quando é
   * palpite. A tela usa isso para dizer "assumi normal" em vez de afirmar que
   * ele declarou.
   */
  energy_source: "daily_checkin" | "assumed";
  /** Inferido de plantão, nunca perguntado — mas exibido e corrigível. */
  interruption_risk: boolean;
  interruption_reason: string | null;
  /**
   * Horas que o calendário já bloqueou hoje — a EVIDÊNCIA por trás de
   * `interruption_risk`. A tela mostra "12h bloqueadas" em vez de afirmar
   * "plantão" sem dizer de onde tirou.
   */
  blocked_hours_today: number;
  /**
   * Previsão crua da rotina. Difere de `suggested_minutes`, que cai em 45
   * quando não há previsão — e "previu 45" não é "não soube prever".
   */
  predicted_minutes: number;
};

export type NavigationRouteAction = {
  action: TrainerAction;
  estimated_minutes: number;
  cognitive_load: NavigationCognitiveLoad;
  reason_codes: string[];
};

export type NavigationRouteStatus = "accepted" | "rejected" | "completed";

export type NavigationRoute = {
  /** `null` quando a gravacao falhou: a rota vale, mas nao aceita desfecho. */
  route_id: string | null;
  actions: NavigationRouteAction[];
  /** Invariante do produto: nunca maior que `available_minutes`. */
  total_minutes: number;
  available_minutes: number;
  energy: NavigationEnergy;
  interruption_risk: boolean;
  policy_version: string;
  reason_codes: string[];
};

export async function getNavigationPrompt(token: string): Promise<NavigationPrompt> {
  return api<NavigationPrompt>("/api/navigation/prompt", {
    headers: authHeader(token),
  });
}

export async function buildNavigationRoute(
  token: string,
  input: {
    availableMinutes: number;
    energy: NavigationEnergy;
    interruptionOverride?: boolean | null;
  },
): Promise<NavigationRoute> {
  return api<NavigationRoute>("/api/navigation/route", {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      available_minutes: input.availableMinutes,
      energy: input.energy,
      interruption_override: input.interruptionOverride ?? null,
    }),
  });
}

/**
 * Registra o desfecho da rota.
 *
 * Sem isto o kill criterion do Navigator ("a rota montada faz o aluno terminar
 * mais que a lista ordenada?") nao tem dado e o criterio vira fachada. Recusa e'
 * sinal tao valioso quanto conclusao: uma rota recusada com frequencia e' a
 * evidencia mais direta de que o montador esta errando.
 */
export async function resolveNavigationRoute(
  token: string,
  routeId: string,
  status: NavigationRouteStatus,
): Promise<{ route_id: string; status: NavigationRouteStatus }> {
  // Mapa explicito, e nao derivacao por string: "completed" -> "complete" nao
  // sai de nenhuma regra simples, e um endpoint errado falharia em runtime.
  const path: Record<NavigationRouteStatus, string> = {
    accepted: "accept",
    rejected: "reject",
    completed: "complete",
  };
  return api(`/api/navigation/${encodeURIComponent(routeId)}/${path[status]}`, {
    method: "POST",
    headers: authHeader(token),
  });
}
