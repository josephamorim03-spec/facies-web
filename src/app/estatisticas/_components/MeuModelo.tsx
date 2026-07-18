"use client";

// "Meu modelo" — a superfície escrutável do Open Learner Model.
//
// O backend (`/question-bank/learner-model`) já mantém, por microcompetência,
// o que o sistema acha que o aluno domina E quão certo está disso. Este é o
// único lugar onde o aluno VÊ esse modelo. Princípio inviolável: mostrar a
// incerteza honestamente — uma estimativa de baixa confiança nunca é
// apresentada como fato ("ainda estou medindo" em vez de um número falso).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getQuestionBankLearnerModel,
  type QuestionBankLearnerCompetency,
  type QuestionBankLearnerModel,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import {
  type GuidanceLabel,
  type GuidanceTone,
  cognitiveAutopsyCopy,
  memoryPhrase,
  readinessLabel,
} from "@/lib/guidanceCopy";
import { getErrorMessage } from "@/lib/error-utils";
import { Skeleton } from "@/components/Skeleton";

// Uma competência só é "medida" com evidência suficiente; abaixo disso o modelo
// mostra a incerteza em vez de fingir precisão.
const MEASURED_MIN_EXPOSURE = 3;
const HIGH_UNCERTAINTY = 0.6;
const FOCUS_LIMIT = 8;

const TONE_TEXT: Record<GuidanceTone, string> = {
  neutral: "text-muted",
  positive: "text-success",
  attention: "text-warning",
  critical: "text-danger",
};
const TONE_BAR: Record<GuidanceTone, string> = {
  neutral: "bg-primary",
  positive: "bg-success",
  attention: "bg-warning",
  critical: "bg-danger",
};

function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round((value <= 1 ? value * 100 : value))));
}

function isMeasured(c: QuestionBankLearnerCompetency): boolean {
  return c.exposure_count >= MEASURED_MIN_EXPOSURE && c.uncertainty < HIGH_UNCERTAINTY;
}

function masteryGuidance(masteryPct: number): GuidanceLabel {
  if (masteryPct >= 70) return readinessLabel("consolidando");
  if (masteryPct >= 45) return readinessLabel("atencao");
  return readinessLabel("critico");
}

function useLearnerModel() {
  const [data, setData] = useState<QuestionBankLearnerModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const model = await getQuestionBankLearnerModel(getAuthToken());
        if (alive) setData(model);
      } catch (e) {
        if (alive) setError(getErrorMessage(e, "Não consegui carregar seu modelo agora."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}

function Meter({ value, tone }: { value: number; tone: GuidanceTone }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-surfaceMuted" aria-hidden="true">
      <div className={`h-1.5 rounded-full ${TONE_BAR[tone]}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function CognitiveChip({ score, tag }: { score: number; tag: string }) {
  if (score < 0.5) return null;
  const copy = cognitiveAutopsyCopy(tag);
  if (!copy) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border border-edge px-2 py-0.5 text-xs ${TONE_TEXT[copy.tone]}`}
      aria-label={`${copy.label}: ${copy.phrase}`}
      title={copy.phrase}
    >
      {copy.label}
    </span>
  );
}

function FocusCard({ c }: { c: QuestionBankLearnerCompetency }) {
  const masteryPct = pct(c.mastery_score);
  const mastery = masteryGuidance(masteryPct);
  const retention = memoryPhrase(c.retention_score);
  return (
    <li className="rounded-lg border border-edge bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-base font-semibold text-ink">
            {c.node_name || "Competência"}
          </p>
          <p className={`mt-0.5 font-serif text-sm ${TONE_TEXT[mastery.tone]}`}>{mastery.phrase}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`text-sm font-semibold ${TONE_TEXT[mastery.tone]}`}>{masteryPct}%</span>
          {c.needs_review ? (
            <span className="rounded-full border border-edge px-2 py-0.5 text-xs text-warning">
              revisar
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Meter value={masteryPct} tone={mastery.tone} />
        <p className="text-xs text-muted">{retention.phrase}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CognitiveChip score={c.overconfidence_score} tag="overconfident" />
        <CognitiveChip score={c.trap_sensitivity} tag="distractor_seduction" />
      </div>

      {c.next_action || c.node_name ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          {/* Sugestão do tutor + deep-link honesto: o banco usa `?theme=` como
              busca de tópicos, então buscar o nome da microcompetência leva o
              aluno direto a ela — sem mudar contrato nem prometer o que a URL
              não entrega. */}
          {c.next_action ? (
            <p className="min-w-0 truncate text-xs text-muted">{c.next_action}</p>
          ) : (
            <span />
          )}
          {c.node_name ? (
            <Link
              href={`/banco-de-questoes?theme=${encodeURIComponent(c.node_name)}`}
              className="shrink-0 rounded-md border border-edge px-2.5 py-1 text-xs font-medium text-primary hover:bg-surfaceMuted focus-visible:outline"
            >
              Praticar
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function MeuModelo() {
  const { data, loading, error } = useLearnerModel();

  const { focus, measuring } = useMemo(() => {
    const all = data?.competencies ?? [];
    const measured = all.filter(isMeasured);
    // Prioriza o julgamento do próprio backend (`needs_review`), depois a
    // fraqueza — em vez de um sort ingênuo só por mastery.
    const focusList = [...measured]
      .sort((a, b) => {
        if (a.needs_review !== b.needs_review) return a.needs_review ? -1 : 1;
        return a.mastery_score - b.mastery_score;
      })
      .slice(0, FOCUS_LIMIT);
    const measuringList = all.filter((c) => !isMeasured(c));
    return { focus: focusList, measuring: measuringList };
  }, [data]);

  if (loading) {
    return (
      <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold">Meu modelo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </section>
    );
  }

  // Erro é não-bloqueante: esta seção fica abaixo da dobra, degrada em silêncio.
  if (error) {
    return (
      <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold">Meu modelo</h2>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  const hasAny = (data?.competencies?.length ?? 0) > 0;
  const hasMeasured = focus.length > 0;

  return (
    <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">Meu modelo</h2>
        <span className="text-xs text-muted">o que eu acho que você já sabe</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Este é o retrato que uso para escolher suas questões — inclusive onde ainda estou te
        conhecendo.
      </p>

      {!hasAny ? (
        <p className="mt-4 font-serif text-sm text-muted">
          Ainda estou te conhecendo. Resolva algumas questões e seu modelo de aprendizado aparece
          aqui.
        </p>
      ) : null}

      {hasMeasured ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-muted">Onde seu esforço rende mais agora</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {focus.map((c) => (
              <FocusCard key={c.knowledge_node_id} c={c} />
            ))}
          </ul>
        </div>
      ) : null}

      {measuring.length > 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-edge bg-surfaceMuted p-4">
          <h3 className="text-sm font-medium text-ink">Ainda estou medindo</h3>
          <p className="mt-1 text-xs text-muted">
            Pouca evidência por aqui — não vou fingir que já sei. Praticar estes temas afina o
            retrato.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {measuring.slice(0, 12).map((c) => (
              <span
                key={c.knowledge_node_id}
                className="inline-flex items-center rounded-full border border-edge px-2 py-0.5 text-xs text-muted"
              >
                {c.node_name || "Competência"}
              </span>
            ))}
            {measuring.length > 12 ? (
              <span className="inline-flex items-center px-1 text-xs text-muted">
                +{measuring.length - 12}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
