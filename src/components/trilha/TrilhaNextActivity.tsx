"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  getCurrentPlan,
  startPlanActivity,
  type StudyFallbackReason,
  type StudyPlan,
  type StudyPlanActivity,
  type StudyPlanEvidenceLevel,
} from "@/lib/api/domains/study-plan";
import { getAuthToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

const EVIDENCE_COPY: Record<StudyPlanEvidenceLevel, { label: string; note: string }> = {
  inicial: {
    label: "Perfil inicial",
    note: "Montado a partir do seu questionário, ainda sem evidência de desempenho.",
  },
  adaptado_por_evidencias: {
    label: "Perfil adaptado por evidências",
    note: "A prioridade por área já é confiável. Por microcompetência, ainda não.",
  },
  alta_confianca: {
    label: "Perfil de alta confiança",
    note: "Bateria diagnóstica completa e cobertura ampla de áreas.",
  },
};

/** O que dizer quando a sessão entregue não é a prometida. */
const FALLBACK_COPY: Record<StudyFallbackReason, string> = {
  stratification_failed:
    "Não havia questões inéditas suficientes em todas as áreas. Este simulado não tem a cobertura completa do diagnóstico.",
  insufficient_candidates:
    "Não havia questões inéditas suficientes para completar a bateria planejada.",
  catalog_version_changed:
    "O banco de questões foi atualizado desde que esta atividade foi planejada.",
  objective_changed: "Seus objetivos mudaram desde que esta atividade foi planejada.",
  availability_changed: "Sua disponibilidade mudou e esta atividade precisa ser reencaixada.",
  policy_version_changed: "A política adaptativa foi atualizada desde que esta atividade foi planejada.",
  review_task_unavailable: "Esta revisão já foi concluída ou deixou de estar pendente.",
  invalid_recipe_version: "Esta atividade foi planejada por uma versão anterior da trilha.",
  exam_already_occurred: "A prova desta atividade já ocorreu.",
};

/** Evidências que sustentam o rótulo, vindas de `explanation.reasons`. */
function evidenceReasons(plan: StudyPlan): string[] {
  const raw = (plan.explanation as { reasons: unknown })?.reasons;
  return Array.isArray(raw) ? raw.map(String) : [];
}

/**
 * Resumo bruto ("2 de 3 diagnósticos · 4 áreas").
 *
 * Os limiares que produzem o rótulo são heurística não validada. Mostrar
 * "Perfil de alta confiança" sozinho apresentaria estimativa como confirmação —
 * por isso o número acompanha o rótulo, não fica só na gaveta.
 */
function evidenceSummary(plan: StudyPlan): string | null {
  const raw = (plan.explanation as { evidence_summary?: unknown })?.evidence_summary;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function selectedBecause(activity: StudyPlanActivity): string[] {
  const raw = (activity.rationale as { selected_because?: unknown })?.selected_because;
  return Array.isArray(raw) ? raw.map(String) : [];
}

type Props = {
  /**
   * O que mostrar quando não há trilha — flag desligada, onboarding pendente ou
   * plano sem atividade. Recebe a ação padrão do dia.
   */
  fallback?: ReactNode;
};

/**
 * Próxima atividade da trilha — **o único herói da tela**.
 *
 * A trilha é a autoridade sobre o que fazer e quando (KROS-009). Quando ela não
 * existe, este componente renderiza o `fallback` em vez de aparecer ao lado
 * dele: duas seções de "próxima ação", de motores diferentes, empilhadas, foi o
 * problema que o KROS-009 corrigiu.
 *
 * Com a flag desligada o comportamento é idêntico ao anterior, porque o
 * `fallback` é exatamente o que a página renderizava antes.
 */
export function TrilhaNextActivity({ fallback = null }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentPlan(getAuthToken())
      .then((result) => {
        if (!cancelled) setPlan(result);
      })
      .catch(() => {
        // Flag desligada (404) ou onboarding incompleto (409): o painel
        // simplesmente não aparece.
        if (!cancelled) setPlan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Só atividade agendada pode ser "o próximo passo": a que não coube na rotina
  // não tem data e é mostrada em /trilha, com a explicação e as saídas.
  const next = plan?.activities
    .filter(
      (activity) =>
        activity.status === "pending" &&
        activity.kind !== "rest" &&
        activity.scheduled_date !== null,
    )
    .sort((a, b) =>
      a.scheduled_date === b.scheduled_date
        ? a.slot_order - b.slot_order
        : (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""),
    )[0];

  const start = useCallback(async () => {
    if (!next) return;
    setStarting(true);
    setError(null);
    try {
      const result = await startPlanActivity(getAuthToken(), next.activity_id);

      if (!result.session) {
        // `unavailable` ou `requires_regeneration`: não há sessão para abrir.
        setError(
          result.fallback_reason
            ? FALLBACK_COPY[result.fallback_reason]
            : result.launch_status === "requires_regeneration"
              ? "Sua trilha precisa ser refeita antes de iniciar esta atividade."
              : "Esta atividade não está disponível agora.",
        );
        setStarting(false);
        return;
      }

      if (result.launch_status === "launched_with_fallback" && result.fallback_reason) {
        // O aluno recebeu algo diferente do prometido — dizer, não esconder.
        setNotice(FALLBACK_COPY[result.fallback_reason]);
      }
      router.push(`/banco/sessao/${result.session.session_id}`);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível iniciar esta atividade.",
      );
      setStarting(false);
    }
  }, [next, router]);

  // Durante o carregamento mostramos o fallback, não um spinner: com a flag
  // desligada a requisição responde 404 e um spinner faria a ação do dia
  // desaparecer por um instante — regressão visível para quem não usa a trilha.
  if (loading || !plan || !next) return <>{fallback}</>;

  const evidence = EVIDENCE_COPY[plan.evidence_level];
  const evidences = evidenceReasons(plan);
  const summary = evidenceSummary(plan);
  const because = selectedBecause(next);
  // O filtro acima já garante data não-nula; o `??` é só para o compilador.
  const isToday = (next.scheduled_date ?? "") <= todayISO();

  return (
    <section
      className="rounded-control border border-edge bg-surface p-4"
      aria-labelledby="trilha-next-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          {isToday ? "Sua trilha hoje" : `Próximo passo · ${next.scheduled_date}`}
        </p>
        <span
          className="shrink-0 rounded-full border border-edge px-2 py-0.5 text-[11px] text-muted"
          title={evidence.note}
        >
          {evidence.label}
          {summary ? ` · ${summary}` : ""}
        </span>
      </div>

      <h2 id="trilha-next-heading" className="mt-2 font-serif text-lg text-ink">
        {next.title}
      </h2>
      <p className="mt-1 text-xs text-muted">
        {next.estimated_questions} questões · cerca de {next.estimated_minutes} min
      </p>

      {error && (
        <Alert variant="danger" className="mt-3" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {notice && (
        <Alert variant="warning" className="mt-3" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="md" loading={starting} disabled={starting} onClick={start}>
          Começar
        </Button>
        {because.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showWhy}
            onClick={() => setShowWhy((value) => !value)}
          >
            Por que isto?
            <ChevronDown
              aria-hidden
              className={`h-4 w-4 transition-transform ${showWhy ? "rotate-180" : ""}`}
            />
          </Button>
        )}
      </div>

      {showWhy && (
        <div className="mt-3 space-y-3 border-t border-edge pt-3">
          <ul className="space-y-1 text-xs text-muted">
            {because.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>

          {/* O rótulo de evidência nunca aparece sozinho: sempre com o que o
              sustenta e o que ainda falta (KROS-007). */}
          <div>
            <p className="text-xs font-medium text-ink">{evidence.label}</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
              {evidences.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-muted">{evidence.note}</p>
          </div>
        </div>
      )}
    </section>
  );
}
