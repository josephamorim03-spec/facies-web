import { getProfile } from "@/lib/api";
import {
  buildStudyImportRuntimePath,
  readActiveStudyImportSessionId,
} from "@/lib/studyImportRuntime";

export const INITIAL_GOAL_SETUP_ROUTE = "/preferencias";
export const DEFAULT_AUTHENTICATED_ROUTE = "/hoje";
export const ACTIVATE_ROUTE = "/ativar-acesso";

export async function requiresInitialGoalSetup(token: string): Promise<boolean> {
  const profile = await getProfile(token);
  return !profile.has_completed_initial_goal_setup;
}

export async function resolveAuthenticatedLandingRoute(token: string): Promise<string> {
  const profile = await getProfile(token);
  if (profile.access_status !== "active") {
    return ACTIVATE_ROUTE;
  }
  if (!profile.has_completed_initial_goal_setup) {
    return INITIAL_GOAL_SETUP_ROUTE;
  }
  const activeImportSessionId = readActiveStudyImportSessionId();
  if (activeImportSessionId) {
    return buildStudyImportRuntimePath(activeImportSessionId);
  }
  return DEFAULT_AUTHENTICATED_ROUTE;
}
