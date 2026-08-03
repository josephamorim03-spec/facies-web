import { getProfile } from "@/lib/api";
import { getOnboarding } from "@/lib/api/domains/study-plan";
import {
  buildStudyImportRuntimePath,
  readActiveStudyImportSessionId,
} from "@/lib/studyImportRuntime";

export const INITIAL_GOAL_SETUP_ROUTE = "/preferencias";
export const ONBOARDING_ROUTE = "/onboarding";
export const DEFAULT_AUTHENTICATED_ROUTE = "/hoje";
export const ACTIVATE_ROUTE = "/ativar-acesso";

export async function requiresInitialGoalSetup(token: string): Promise<boolean> {
  const profile = await getProfile(token);
  return !profile.has_completed_initial_goal_setup;
}

/**
 * Rota de setup para um aluno novo.
 *
 * O wizard da trilha está atrás de `ENABLE_ADAPTIVE_STUDY_PLAN_V1`, que o
 * browser não enxerga. Em vez de duplicar a flag no cliente, detectamos por
 * comportamento: com a flag desligada `/onboarding` responde 404 e o fluxo
 * antigo (`/preferencias`) continua valendo.
 */
async function resolveSetupRoute(token: string): Promise<string> {
  try {
    const onboarding = await getOnboarding(token);
    if (onboarding.next_step !== "ready") {
      return ONBOARDING_ROUTE;
    }
    return INITIAL_GOAL_SETUP_ROUTE;
  } catch {
    return INITIAL_GOAL_SETUP_ROUTE;
  }
}

export async function resolveAuthenticatedLandingRoute(token: string): Promise<string> {
  const profile = await getProfile(token);
  if (profile.access_status !== "active") {
    return ACTIVATE_ROUTE;
  }
  if (!profile.has_completed_initial_goal_setup) {
    return resolveSetupRoute(token);
  }
  const activeImportSessionId = readActiveStudyImportSessionId();
  if (activeImportSessionId) {
    return buildStudyImportRuntimePath(activeImportSessionId);
  }
  return DEFAULT_AUTHENTICATED_ROUTE;
}
