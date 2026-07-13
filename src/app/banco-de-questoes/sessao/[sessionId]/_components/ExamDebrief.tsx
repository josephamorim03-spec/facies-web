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

type Tab = "resumo" | "tempo" | "confianca" | "temas";

const PACING_LABEL: Record<string, string> = {
  aceleracao: "Aceleração no final",
  fadiga: "Possível fadiga no fim",
  pressao: "Pressão de tempo no fim",
  estavel: "Pacing estável",
};

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;
}

function DebriefSkeleton() {
  return <div className="paper-skeleton h-24 rounded-xl border border-edge bg-surface" aria-hidden="true" />;
}

/**
 * Prescriptive top-of-review for simulados: observed result, biggest loss, main
 * temporal signal, calibration and next action, plus tabs (Resumo/Tempo/
 * Confiança/Temas). Fetched read-only; on failure returns null so the parent
 * renders the normal PostExamReview.
 */
export default function ExamDebrief({ sessionId }: { sessionId: string }) {
  const [debrief, setDebrief] = useState<QuestionBankExamDebrief | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("resumo");

  useEffect(() => {
    let active = true;
    getQuestionBankExamDebrief(getAuthToken(), sessionId)
      .then((d) => {
        if (active) setDebrief(d);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const weakest = useMemo(() => {
    if (!debrief) return null;
    const weak = debrief.knowledge_breakdown
      .filter((n) => n.correct + n.wrong >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)[0];
    return weak ?? null;
  }, [debrief]);

  if (!ready) return <DebriefSkeleton />;
  if (failed || !debrief) return null; // parent renders PostExamReview normally

  const { summary, pacing, calibration, timeline, data_quality: dq } = debrief;
  const primary = debrief.trainer_followup[0] ?? null;
  const timelineData = timeline.by_position_thirds.map((b) => ({
    label: b.label,
    acuracia: b.accuracy === null ? null : Math.round(b.accuracy * 100),
  }));
  const calibData = calibration.bins
    .filter((b) => b.count > 0)
    .map((b) => ({ label: `${b.confidence}`, acerto: b.accuracy === null ? 0 : Math.round(b.accuracy * 100) }));

  return (
    <details aria-label="Análise detalhada do simulado" className="rounded-xl border border-edge bg-surface p-4 sm:p-5">
      <summary className="cursor-pointer font-serif text-lg font-semibold text-ink">Abrir análise detalhada do simulado</summary>
      <div className="mt-4">
      {/* First fold */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Debrief do simulado</p>
          <h2 className="font-serif text-2xl font-semibold text-ink">
            {summary.correct}/{summary.answered} · {Math.round(summary.accuracy * 100)}% de acerto
          </h2>
          <p className="mt-1 text-sm text-muted">
            {weakest
              ? `Maior perda: ${weakest.node_name ?? "competência"} (${pct(weakest.accuracy)}).`
              : "Sem concentração clara de perdas."}{" "}
            {PACING_LABEL[pacing.label] ?? "Pacing estável"}.
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

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-1 border-b border-edge">
        {([
          ["resumo", "Resumo"],
          ["tempo", "Tempo"],
          ["confianca", "Confiança"],
          ["temas", "Temas"],
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Respondidas" value={`${summary.answered}/${summary.total_questions}`} />
            <Stat label="Em branco" value={String(summary.omitted)} />
            <Stat label="Tempo médio" value={summary.avg_time_ms ? `${Math.round(summary.avg_time_ms / 1000)}s` : "—"} />
            <Stat
              label="Orçamento"
              value={summary.time_budget_minutes ? `${summary.time_budget_minutes} min` : "estimado"}
            />
          </div>
        )}

        {tab === "tempo" && (
          <div className="space-y-2">
            <p className="text-muted">{PACING_LABEL[pacing.label] ?? "Pacing estável"} · acurácia por terço da prova.</p>
            {timelineData.some((d) => d.acuracia !== null) ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={timelineData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-edge, #e5e7eb)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                  <Tooltip
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{ zIndex: 20, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="acuracia" stroke="var(--color-primary, #2563eb)" strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Insufficient />
            )}
            {pacing.speededness.detected && (
              <p className="text-xs text-warning">{pacing.speededness.detail}</p>
            )}
          </div>
        )}

        {tab === "confianca" && (
          <div className="space-y-2">
            {calibration.coverage > 0 ? (
              <>
                <p className="text-muted">
                  Acerto por nível de confiança{calibration.brier !== null ? ` · Brier ${calibration.brier}` : ""}.
                  {calibration.overconfident_wrong > 0 && ` ${calibration.overconfident_wrong} erro(s) de alta confiança.`}
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={calibData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-edge, #e5e7eb)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip
                    allowEscapeViewBox={{ x: false, y: false }}
                    wrapperStyle={{ zIndex: 20, fontSize: 12 }}
                  />
                    <Bar dataKey="acerto" fill="var(--color-primary, #2563eb)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-muted">
                Você não registrou confiança neste simulado. Marque a confiança antes do gabarito para calibrar.
              </p>
            )}
          </div>
        )}

        {tab === "temas" && (
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
        )}
      </div>

      {dq.notes.length > 0 && <p className="mt-3 text-xs text-muted">{dq.notes.join(" ")}</p>}
      </div>
    </details>
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

function Insufficient() {
  return <p className="text-muted">Dados insuficientes para este gráfico.</p>;
}
