"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAuthToken } from "@/lib/auth";
import { getQuestionBankExamDebrief, type QuestionBankExamDebrief } from "@/lib/api";

type Tab = "resumo" | "tempo" | "confianca" | "temas" | "estrategia" | "questoes";

const PACING_LABEL: Record<string, string> = {
  aceleracao: "Aceleração no final",
  fadiga: "Possível fadiga no fim",
  pressao: "Pressão de tempo no fim",
  estavel: "Pacing estável",
};

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? "-" : `${Math.round(v * 100)}%`;
}

function seconds(ms: number | null | undefined): string {
  return ms === null || ms === undefined ? "-" : `${Math.round(ms / 1000)}s`;
}

function DebriefSkeleton() {
  return <div className="h-40 animate-pulse rounded-2xl border border-edge bg-surface" />;
}

function qualityLabel(debrief: QuestionBankExamDebrief): { label: string; tone: string } {
  const dq = debrief.data_quality;
  if (dq.timing_coverage >= 0.8 && dq.confidence_coverage >= 0.8 && !dq.idle_suspect) {
    return { label: "dados fortes", tone: "text-success" };
  }
  if (dq.timing_source === "mixed" || dq.idle_suspect) {
    return { label: "timing parcial", tone: "text-warning" };
  }
  if (dq.confidence_coverage < 0.5) {
    return { label: "confiança insuficiente", tone: "text-warning" };
  }
  return { label: "estimado", tone: "text-muted" };
}

/**
 * Prescriptive top-of-review for simulados. Read-only; on failure returns null
 * so the parent can render the normal PostExamReview.
 */
export default function ExamDebrief({
  sessionId,
  onAvailableChange,
}: {
  sessionId: string;
  onAvailableChange?: (available: boolean) => void;
}) {
  const [debrief, setDebrief] = useState<QuestionBankExamDebrief | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("resumo");

  useEffect(() => {
    let active = true;
    onAvailableChange?.(false);
    getQuestionBankExamDebrief(getAuthToken(), sessionId)
      .then((d) => {
        if (!active) return;
        setDebrief(d);
        onAvailableChange?.(true);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        onAvailableChange?.(false);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [onAvailableChange, sessionId]);

  const weakest = useMemo(() => {
    if (!debrief) return null;
    const weak = debrief.knowledge_breakdown
      .filter((n) => n.correct + n.wrong >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)[0];
    return weak ?? null;
  }, [debrief]);

  if (!ready) return <DebriefSkeleton />;
  if (failed || !debrief) return null;

  const { summary, pacing, calibration, timeline, data_quality: dq, strategy } = debrief;
  const primary = debrief.trainer_followup[0] ?? null;
  const quality = qualityLabel(debrief);
  const thirdsData = timeline.by_position_thirds.map((b) => ({
    label: b.label,
    acuracia: b.accuracy === null ? null : Math.round(b.accuracy * 100),
    tempo: b.avg_time_ms === null ? null : Math.round(b.avg_time_ms / 1000),
  }));
  const quartersData = timeline.by_position_quarters.map((b) => ({
    label: b.label,
    acuracia: b.accuracy === null ? null : Math.round(b.accuracy * 100),
  }));
  const trajectoryData = timeline.by_trajectory_thirds.map((b) => ({
    label: b.label,
    acuracia: b.accuracy === null ? null : Math.round(b.accuracy * 100),
  }));
  const calibData = calibration.bins
    .filter((b) => b.count > 0)
    .map((b) => ({ label: `${b.confidence}`, acerto: b.accuracy === null ? 0 : Math.round(b.accuracy * 100) }));

  return (
    <section aria-label="Debrief do simulado" className="rounded-2xl border border-edge bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Debrief do simulado</p>
            <span className={`rounded-full border border-edge bg-paper px-2 py-0.5 text-[11px] font-semibold ${quality.tone}`}>
              {quality.label}
            </span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">
            {summary.correct}/{summary.answered} · {Math.round(summary.accuracy * 100)}% de acerto
          </h2>
          <p className="mt-1 text-sm text-muted">
            {weakest
              ? `Maior perda: ${weakest.node_name ?? "competência"} (${pct(weakest.accuracy)}).`
              : "Sem concentração clara de perdas."}{" "}
            {PACING_LABEL[pacing.label] ?? "Pacing estável"}.{" "}
            {calibration.overconfident_wrong > 0
              ? `${calibration.overconfident_wrong} erro(s) com alta confiança.`
              : "Calibração sem alerta forte."}
          </p>
        </div>
        {primary && (
          <Link
            href={primary.href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105"
          >
            {primary.title}
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-edge">
        {([
          ["resumo", "Resumo"],
          ["tempo", "Tempo"],
          ["confianca", "Confiança"],
          ["temas", "Temas"],
          ["estrategia", "Estratégia"],
          ["questoes", "Questões"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === value ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-ink">
        {tab === "resumo" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Respondidas" value={`${summary.answered}/${summary.total_questions}`} />
              <Stat label="Em branco" value={String(summary.omitted)} />
              <Stat label="Tempo médio" value={seconds(summary.avg_time_ms)} />
              <Stat label="Orçamento" value={summary.time_budget_minutes ? `${summary.time_budget_minutes} min` : "estimado"} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {debrief.trainer_followup.map((action) => (
                <Link key={`${action.kind}:${action.href}`} href={action.href} className="rounded-xl border border-edge bg-paper p-3 hover:border-primary">
                  <p className="text-sm font-semibold text-ink">{action.title}</p>
                  <p className="mt-1 text-xs text-muted">{action.rationale}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === "tempo" && (
          <div className="space-y-4">
            <p className="text-muted">
              {PACING_LABEL[pacing.label] ?? "Pacing estável"} · tempo esperado {seconds(pacing.expected_ms_per_question)} por questão.
            </p>
            {thirdsData.some((d) => d.acuracia !== null) ? (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={thirdsData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-edge, #e5e7eb)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="acuracia" stroke="var(--color-primary, #2563eb)" strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Insufficient />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniBlocks title="Quartis por posição" blocks={quartersData} />
              <MiniBlocks title="Trajetória real" blocks={trajectoryData} />
            </div>
            {pacing.speededness.detected && <p className="text-xs text-warning">{pacing.speededness.detail}</p>}
          </div>
        )}

        {tab === "confianca" && (
          <div className="space-y-2">
            {calibration.coverage > 0 ? (
              <>
                <p className="text-muted">
                  Cobertura {pct(calibration.coverage)}
                  {calibration.brier !== null ? ` · Brier ${calibration.brier}` : ""}.
                  {calibration.confidence_gap !== null ? ` Gap confiança-acerto ${pct(calibration.confidence_gap)}.` : ""}
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={calibData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-edge, #e5e7eb)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="acerto" fill="var(--color-primary, #2563eb)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Alta confiança + erro" value={String(calibration.overconfident_wrong)} />
                  <Stat label="Baixa confiança + acerto" value={String(calibration.uncertain_correct)} />
                </div>
              </>
            ) : (
              <p className="text-muted">
                Você não registrou confiança neste simulado. Marque a confiança antes do gabarito para calibrar.
              </p>
            )}
          </div>
        )}

        {tab === "temas" && (
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <ul className="space-y-1.5">
              {debrief.knowledge_breakdown
                .slice()
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 8)
                .map((n) => (
                  <li key={n.knowledge_node_id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-ink">{n.node_name ?? "Competência"}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted">
                      {pct(n.accuracy)} · {n.correct}/{n.correct + n.wrong}
                    </span>
                  </li>
                ))}
              {debrief.knowledge_breakdown.length === 0 && <Insufficient />}
            </ul>
            <div className="rounded-xl border border-edge bg-paper p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Padrão cognitivo</p>
              <p className="mt-1 text-sm font-semibold text-ink">{debrief.dominant_cognitive_tag ?? "sem dominante"}</p>
              <div className="mt-2 space-y-1 text-xs text-muted">
                {Object.entries(debrief.cognitive_breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="truncate">{key}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "estrategia" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Marcadas" value={String(strategy.marked)} />
            <Stat label="Eliminações" value={String(strategy.eliminated)} />
            <Stat label="Alteradas" value={strategy.changed === null ? "-" : String(strategy.changed)} />
            <Stat label="Revisitadas" value={strategy.revisited === null ? "-" : String(strategy.revisited)} />
            <Stat label="Certo → errado" value={strategy.right_to_wrong === null ? "-" : String(strategy.right_to_wrong)} />
            <Stat label="Errado → certo" value={strategy.wrong_to_right === null ? "-" : String(strategy.wrong_to_right)} />
            <Stat label="Nunca vistas" value={strategy.never_visited === null ? "-" : String(strategy.never_visited)} />
            <Stat label="Omitidas" value={String(strategy.omitted)} />
          </div>
        )}

        {tab === "questoes" && (
          <div className="rounded-xl border border-edge bg-paper p-4 text-sm text-muted">
            A revisão item a item está logo abaixo deste debrief. Use as abas de erros, acertos,
            marcadas e descartadas para auditar questões específicas sem misturar isso com a leitura do desempenho.
          </div>
        )}
      </div>

      {(dq.notes.length > 0 || dq.idle_suspect) && (
        <div className="mt-3 rounded-xl border border-edge bg-paper p-3 text-xs text-muted">
          <p className="font-semibold text-ink">Qualidade dos dados</p>
          <p className="mt-1">
            tempo: {dq.timing_source} · cobertura tempo {pct(dq.timing_coverage)} · cobertura confiança {pct(dq.confidence_coverage)}
          </p>
          {dq.notes.length > 0 && <p className="mt-1">{dq.notes.join(" ")}</p>}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-edge bg-paper p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-serif text-lg text-ink">{value}</p>
    </div>
  );
}

function MiniBlocks({ title, blocks }: { title: string; blocks: Array<{ label: string; acuracia: number | null }> }) {
  return (
    <div className="rounded-xl border border-edge bg-paper p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {blocks.map((block) => (
          <div key={block.label} className="rounded-lg bg-surface px-2 py-1.5">
            <p className="text-xs text-muted">{block.label}</p>
            <p className="font-semibold text-ink">{block.acuracia === null ? "-" : `${block.acuracia}%`}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Insufficient() {
  return <p className="text-muted">Dados insuficientes para este gráfico.</p>;
}
