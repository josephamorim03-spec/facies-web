import { api, authHeader } from "../shared/http";

// ── Performance Types ────────────────────────────────────────────

export type PerformanceTheme = {
  key: string;
  area: string;
  theme: string;
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number;
  review_count: number;
  stable_review_ratio_pct: number | null;
  consistency_score: number | null;
  days_since_last_study: number | null;
};

export type PerformanceAreaSummary = {
  area: string;
  area_accuracy_pct: number | null;
  total_questions: number;
  themes: PerformanceTheme[];
  trend?: "up" | "flat" | "down" | null;
};

export type PerformanceDiagnosisTheme = {
  key: string;
  area: string;
  theme: string;
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number;
  retention_pct?: number | null;
  consistency_pct: number | null;
  system_confidence_pct?: number | null;
  impact_score_pct?: number | null;
  regression_risk_pct?: number | null;
  trend?: "up" | "flat" | "down";
  dominant_signal?: string | null;
  action_hint?: string | null;
  strong_score: number;
  weak_score: number;
};

export type PerformanceDiagnosis = {
  ready: boolean;
  reason: "insufficient_total" | "insufficient_themes" | null;
  total_questions: number;
  min_theme_questions: number;
  strengths: PerformanceDiagnosisTheme[];
  weaknesses: PerformanceDiagnosisTheme[];
};

export type StudyPerformanceSummary = {
  diagnosis: PerformanceDiagnosis;
  area_summaries: PerformanceAreaSummary[];
  health_score_pct: number | null;
};

export async function getStudyPerformanceSummary(token: string): Promise<StudyPerformanceSummary> {
  return api<StudyPerformanceSummary>("/api/studies/performance-summary", {
    headers: authHeader(token),
  });
}
