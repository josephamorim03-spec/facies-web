import { api, authHeader } from "../shared/http";

export type EvolutionWindow = {
  range_key: string;
  date_from: string;
  date_to: string;
  granularity: "daily" | "weekly" | "monthly";
  timezone: string;
};

export type EvolutionPoint = {
  bucket: string;
  /** `null` é ausência de medida, não zero minuto. */
  observed_minutes: number | null;
  sleep_minutes: number | null;
  sleep_quality: number | null;
  energy: number | null;
  on_call_days: number;
  covered_days: number;
};

export type EvolutionBand = {
  label: "menor_volume" | "maior_volume";
  n: number;
  ci_low: number | null;
  ci_high: number | null;
};

/**
 * Não existe campo para o coeficiente pontual, e isso é do contrato: mostrar rho
 * sozinho convida a ler precisão que a amostra não sustenta.
 */
export type EvolutionAssociation = {
  routine_metric: string;
  outcome_metric: string;
  n: number;
  ci_low: number | null;
  ci_high: number | null;
  conclusive: boolean;
  days_missing: number;
  bands: EvolutionBand[];
};

export type StudentEvolution = {
  contract_version: "student-evolution-v1";
  window: EvolutionWindow;
  points: EvolutionPoint[];
  associations: EvolutionAssociation[];
};

export async function getStudentEvolution(
  token: string,
  range = "12w",
): Promise<StudentEvolution> {
  return api<StudentEvolution>(
    `/api/student/evolution?range=${encodeURIComponent(range)}`,
    { headers: authHeader(token), cache: "no-store" },
  );
}
