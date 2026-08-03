"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, RefreshCw } from "lucide-react";

import {
  getCurrentPlan,
  patchPlanActivity,
  regeneratePlan,
  type StudyPlan,
  type StudyPlanActivity,
  type StudyPlanEvidenceLevel,
} from "@/lib/api/domains/study-plan";
import { getAuthToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const EVIDENCE_LABEL: Record<StudyPlanEvidenceLevel, string> = {
  inicial: "Perfil inicial",
  adaptado_por_evidencias: "Perfil adaptado por evidências",
  alta_confianca: "Perfil de alta confiança",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  leve: "leve",
  padrao: "padrão",
  critico: "exige foco",
};

const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  return `${WEEKDAY[date.getDay()]}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function groupByDay(activities: StudyPlanActivity[]): [string, StudyPlanActivity[]][] {
  const groups = new Map<string, StudyPlanActivity[]>();
  for (const activity of activities) {
    if (activity.scheduled_date === null) continue; // vão para a seção própria
    const bucket = groups.get(activity.scheduled_date) ?? [];
    bucket.push(activity);
    groups.set(activity.scheduled_date, bucket);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => [day, items.sort((x, y) => x.slot_order - y.slot_order)]);
}

export default function TrilhaPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentPlan(getAuthToken())
      .then((result) => {
        if (!cancelled) setPlan(result);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(() => groupByDay(plan?.activities ?? []), [plan]);
  const unscheduled = useMemo(
    () => (plan?.activities ?? []).filter((a) => a.scheduled_date === null),
    [plan],
  );
  const evidenceSummary = useMemo(() => {
    const raw = (plan?.explanation as { evidence_summary?: unknown })?.evidence_summary;
    return typeof raw === "string" && raw.trim() ? raw : null;
  }, [plan]);
  const evidenceReasons = useMemo(() => {
    const raw = (plan?.explanation as { reasons: unknown })?.reasons;
    return Array.isArray(raw) ? raw.map(String) : [];
  }, [plan]);
  const restDays = useMemo(() => {
    const raw = (plan?.explanation as { rest_days: unknown })?.rest_days;
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  }, [plan]);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      setPlan(await regeneratePlan(getAuthToken()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível refazer sua trilha.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLock(activity: StudyPlanActivity) {
    setError(null);
    try {
      const updated = await patchPlanActivity(getAuthToken(), activity.activity_id, {
        locked: !activity.locked,
      });
      setPlan((previous) =>
        previous
          ? {
              ...previous,
              activities: previous.activities.map((item) =>
                item.activity_id === updated.activity_id ? updated : item,
              ),
            }
          : previous,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível fixar esta atividade.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-muted" />
        <span className="sr-only">Carregando trilha</span>
      </main>
    );
  }

  if (unavailable || !plan) {
    return (
      <main className="space-y-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">Trilha</h1>
        <EmptyState
          title="Sua trilha ainda não existe"
          description="Responda o questionário inicial para o KrosMed montar seu cronograma."
          action={
            <Link href="/onboarding">
              <Button variant="primary" size="md">
                Responder questionário
              </Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Trilha</h1>
          {/* Rótulo sempre com o número que o produziu: os limiares são
              heurística não validada (KROS-007). */}
          <p className="mt-1 text-sm text-muted">
            {plan.horizon_start} a {plan.horizon_end} ·{" "}
            {EVIDENCE_LABEL[plan.evidence_level]}
            {evidenceSummary ? ` · ${evidenceSummary}` : ""}
          </p>
        </div>
        <Button variant="secondary" loading={busy} disabled={busy} onClick={regenerate}>
          <RefreshCw aria-hidden className="h-4 w-4" />
          Refazer
        </Button>
      </header>

      {error && (
        <Alert variant="danger" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* O rótulo nunca aparece sozinho: sempre com as evidências que o
          sustentam e o que ainda falta (KROS-007). */}
      <Alert variant="info">
        <p className="font-medium">{EVIDENCE_LABEL[plan.evidence_level]}</p>
        {evidenceReasons.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs">
            {evidenceReasons.map((reason) => (
              <li key={reason}>✓ {reason}</li>
            ))}
          </ul>
        )}
        {plan.evidence_level !== "alta_confianca" && (
          <p className="mt-1 text-xs">
            Ainda insuficiente para priorizar por microcompetência.
          </p>
        )}
      </Alert>

      {/* Atividade que não coube na rotina existe e é explicada. Descartar em
          silêncio parecia bug do produto. */}
      {unscheduled.length > 0 && (
        <section
          className="rounded-control border border-edge bg-surfaceMuted p-4"
          aria-labelledby="trilha-unscheduled"
        >
          <h2 id="trilha-unscheduled" className="text-sm font-medium text-ink">
            Não coube na sua rotina
          </h2>
          <ul className="mt-3 space-y-3">
            {unscheduled.map((activity) => {
              const window = activity.recommended_window;
              return (
                <li key={activity.activity_id} className="border-t border-edge pt-3 first:border-0 first:pt-0">
                  <p className="text-sm font-medium text-ink">{activity.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {window
                      ? `Precisa de ~${window.required_minutes} min. Seu maior dia livre tem ${window.largest_day_minutes} min — faltam ${window.missing_minutes}.`
                      : "Não encontramos uma janela sustentável neste período."}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Você pode ampliar um dia em Preferências, ou fazer uma versão
                    menor desta atividade.
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {days.length === 0 ? (
        <EmptyState
          title="Nenhuma atividade no horizonte"
          description="Sua rotina atual não comporta carga adicional. Ajuste sua disponibilidade se quiser mais."
        />
      ) : (
        <ol className="space-y-4">
          {days.map(([day, activities]) => (
            <li key={day} className="rounded-control border border-edge bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                {formatDay(day)}
              </p>
              <ul className="mt-3 space-y-3">
                {activities.map((activity) => (
                  <li
                    key={activity.activity_id}
                    className="flex flex-wrap items-start justify-between gap-3 border-t border-edge pt-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{activity.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {activity.estimated_questions} questões · {activity.estimated_minutes} min ·{" "}
                        {DIFFICULTY_LABEL[activity.difficulty_class] ?? activity.difficulty_class}
                        {activity.status === "done" ? " · concluída" : ""}
                      </p>
                    </div>
                    {activity.status !== "done" && (
                      <Button
                        variant={activity.locked ? "outline" : "ghost"}
                        size="xs"
                        aria-pressed={activity.locked}
                        onClick={() => void toggleLock(activity)}
                      >
                        <Lock aria-hidden className="h-3.5 w-3.5" />
                        {activity.locked ? "Fixada" : "Fixar"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {restDays.size > 0 && (
        <p className="text-xs text-muted">
          {restDays.size} dia(s) de descanso protegidos no período — a trilha não agenda nada neles.
        </p>
      )}
    </main>
  );
}
