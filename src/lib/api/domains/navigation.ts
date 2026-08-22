import { api, authHeader } from "../shared/http";
import type { TrainerAction } from "./trainer";

export type NavigationEnergy = "low" | "normal" | "high";
export type NavigationCognitiveLoad = "low" | "moderate" | "high";

/**
 * O dimensionamento do dia, e a evidência que o sustenta.
 *
 * Isto já **é** a resposta. A tela não pergunta tempo nem energia: ela mostra a
 * sessão do tamanho que o dia comporta e diz de onde tirou o número. Perguntar
 * custava um toque por sessão e devolvia o palpite de quem ainda não tinha
 * começado a estudar; o calendário e as rotas iniciadas custam zero e devolvem o
 * que aconteceu.
 *
 * `presets` sobrevive para o ESCAPE, que continua existindo — inferência sem
 * caminho de volta é imposição pelo outro lado.
 */
export type NavigationPrompt = {
  /** Tamanhos alternativos, para quem discorda do dimensionamento. */
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
  /** O orçamento que o motor USOU — inferido, salvo escape explícito. */
  available_minutes: number;
  /** A energia que o motor USOU. Nunca `null`: o servidor resolve antes. */
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

/**
 * Monta a rota do dia.
 *
 * Sem argumento, o servidor dimensiona — é o caminho normal. `availableMinutes`
 * e `energy` são o escape de quem discorda, e valem só para esta rota: declarar
 * 20 minutos hoje não reensina o motor a prever 20.
 *
 * `null` e `undefined` significam a mesma coisa aqui, e ambos viram ausência no
 * corpo. Mandar `available_minutes: null` explicitamente também funciona, mas
 * omitir é mais barato de ler do outro lado.
 */
export async function buildNavigationRoute(
  token: string,
  input: {
    availableMinutes?: number | null;
    energy?: NavigationEnergy | null;
    interruptionOverride?: boolean | null;
  } = {},
): Promise<NavigationRoute> {
  return api<NavigationRoute>("/api/navigation/route", {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      available_minutes: input.availableMinutes ?? null,
      energy: input.energy ?? null,
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
