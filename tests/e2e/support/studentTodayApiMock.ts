import type { Page } from "@playwright/test";

import { currentTodayISO } from "./cronogramaApiMock";

/**
 * Baseline de `/api/student/today` e `/api/student/agenda` para o `/hoje` canônico.
 *
 * Existe porque `cronogramaApiMock` responde **503 deliberado** nesses caminhos
 * ("not mocked in calendar flow"): ele foi escrito para a tela LEGADA. Sem este
 * suporte, qualquer spec da tela canônica — que é a que produção serve, via
 * `NEXT_PUBLIC_STUDENT_AGENDA_V1` no `vercel.json` — cai no alerta
 * "Não foi possível carregar seu dia".
 *
 * Instale DEPOIS de `mockCronogramaApi`: no Playwright a rota registrada por
 * último vence, e é assim que o 503 é contornado.
 *
 * Baseline, e não fixture completa, de propósito: cada spec sobrepõe o que a sua
 * asserção precisa. Uma fixture única acabaria carregando os dias densos de um
 * spec e as ações de outro, e ninguém conseguiria mudar nada sem quebrar todos.
 */

export type StudentTodayOverrides = {
  /** Substitui a ação principal; `null` remove (dia de descanso). */
  primaryAction?: Record<string, unknown> | null;
  todayLoadLabel?: string;
  weeklyProgressPct?: number;
};

export function studentTodayPayload(
  today: string,
  overrides: StudentTodayOverrides = {},
): Record<string, unknown> {
  const primary =
    overrides.primaryAction === undefined
      ? {
          kind: "scheduled_topic_practice",
          title: "Revisar Pneumonia",
          rationale: "Revisão no ponto.",
          estimated_minutes: 20,
          href: "/banco",
          cta_label: "Revisar agora",
          source: "schedule",
          priority_reason: "Revisão vencida.",
          confidence: "high",
          area: "CM",
          agenda_occurrence_id: "review_task:primary",
        }
      : overrides.primaryAction;

  return {
    contract_version: "student-today-v1",
    generated_at: `${today}T12:00:00Z`,
    status: "complete",
    primary_action: primary,
    backup_actions: [],
    today_load: {
      label: overrides.todayLoadLabel ?? "adequada",
      estimated_minutes: 40,
      recommended_limit_minutes: 60,
      overload_alert: false,
      short_message: "Carga adequada.",
    },
    schedule_preview: {
      date: today,
      items: [],
      overdue_count: 0,
      hidden_count: 0,
      reschedule_recommended: false,
    },
    review_snapshot: {
      pending_reviews: 2,
      overdue_reviews: 0,
      cards_due: 0,
      estimated_minutes: 40,
    },
    progress_snapshot: {
      questions_done_week: 50,
      weekly_goal_questions: 100,
      weekly_progress_pct: overrides.weeklyProgressPct ?? 50,
      accuracy_pct: 72,
    },
    details: {
      active_session: null,
      trainer_action: null,
      secondary_actions: [],
      schedule_suggestions_count: 0,
      evidence_confidence: "medium",
    },
    missing_sources: [],
  };
}

export function studentAgendaPayload(today: string): Record<string, unknown> {
  return {
    contract_version: "student-agenda-v1",
    generated_at: `${today}T12:00:00Z`,
    status: "complete",
    timezone: "America/Sao_Paulo",
    today,
    date_from: today,
    date_to: today,
    summary: {
      completed_items: 0,
      total_items: 0,
      overdue_items: 0,
      questions_done_week: 50,
      weekly_goal_questions: 100,
      weekly_progress_pct: 50,
    },
    overdue: [],
    days: [
      {
        date: today,
        is_today: true,
        planned_minutes: 0,
        planned_questions: 0,
        recommended_questions: 20,
        completed_items: 0,
        total_items: 0,
        overdue_items: 0,
        overloaded: false,
        items: [],
      },
    ],
    missing_sources: [],
  };
}

/** Instala o baseline. Retorna a data local usada, para as asserções. */
export async function mockStudentTodayApi(
  page: Page,
  overrides: StudentTodayOverrides = {},
): Promise<string> {
  const today = currentTodayISO();
  await page.route("**/api/student/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/student/today") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(studentTodayPayload(today, overrides)),
      });
    }
    if (path === "/api/student/agenda") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(studentAgendaPayload(today)),
      });
    }
    return route.fallback();
  });
  return today;
}
