import { useCallback, useEffect, useRef, useState } from "react";

import {
  compactQuestionBankAdminImport,
  getQuestionBankAdminAiBatches,
  getQuestionBankAdminPipelineJob,
  getQuestionBankAdminStorageSummary,
  previewQuestionBankAdminAiEnrichment,
  runQuestionBankAdminAiEnrichment,
  type QuestionBankAiBatch,
  type QuestionBankAiEnrichmentResult,
  type QuestionBankAdminCompactionResult,
  type QuestionBankAdminPipelineSnapshot,
  type QuestionBankAdminPipelineStatus,
  type QuestionBankAdminReadiness,
  type QuestionBankAdminStorageSummary,
} from "@/lib/api/domains/question-bank-admin";

import { JsonPanel } from "./AdminShared";
import { JOB_TYPES, jobTypeLabel } from "./adminQuestionBankUtils";

function formatBytes(value?: number | null): string {
  if (!value || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let scaled = value;
  let idx = 0;
  while (scaled >= 1024 && idx < units.length - 1) {
    scaled /= 1024;
    idx += 1;
  }
  const digits = idx <= 1 ? 0 : 1;
  return `${scaled.toFixed(digits)} ${units[idx]}`;
}

const _brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function formatBRL(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return _brlFormatter.format(value);
}

const TERMINAL_JOB_STATUSES = new Set(["done", "failed", "succeeded", "completed", "cancelled"]);

type TrackedJob = { id: string; status: string };

type Props = {
  pipelineStatus: QuestionBankAdminPipelineStatus | null;
  readiness: QuestionBankAdminReadiness | null;
  selectedPipeline: QuestionBankAdminPipelineSnapshot | null;
  selectedImportId: string;
  jobType: string;
  batchSize: number;
  workers: number;
  expandedError: string | null;
  onJobTypeChange: (value: string) => void;
  onBatchSizeChange: (value: number) => void;
  onWorkersChange: (value: number) => void;
  onExpandedErrorChange: (value: string | null) => void;
  onRunBatch: () => void;
  onRetryStage: (stageJobType: string) => void;
  onRefresh: () => void;
  formatRelativeTime: (date: Date | string) => string;
};

export default function PipelineDiagnosticsPanel({
  pipelineStatus,
  readiness,
  selectedPipeline,
  selectedImportId,
  jobType,
  batchSize,
  workers,
  expandedError,
  onJobTypeChange,
  onBatchSizeChange,
  onWorkersChange,
  onExpandedErrorChange,
  onRunBatch,
  onRetryStage,
  onRefresh,
  formatRelativeTime,
}: Props) {
  const stages = selectedPipeline?.stage_stats || pipelineStatus?.stage_stats || [];

  // IA dirigida: prévia de custo (dry-run) + execução com teto de questões, sobre as
  // melhores questões sem enriquecimento (seleção global). Estado local sobrevive ao
  // refresh do dashboard (o painel permanece montado); a prévia é reatualizada após rodar.
  const [aiMaxNewJobs, setAiMaxNewJobs] = useState(25);
  const [aiBatch, setAiBatch] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<QuestionBankAiEnrichmentResult | null>(null);
  const [aiResult, setAiResult] = useState<QuestionBankAiEnrichmentResult | null>(null);
  const [aiJobs, setAiJobs] = useState<TrackedJob[]>([]);
  const [storageBusy, setStorageBusy] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [storageSummary, setStorageSummary] = useState<QuestionBankAdminStorageSummary | null>(null);
  const [compactDryRun, setCompactDryRun] = useState<QuestionBankAdminCompactionResult | null>(null);

  // Poll enqueued enrichment jobs until they reach a terminal state (live "acompanhar").
  const aiJobsRef = useRef<TrackedJob[]>([]);
  aiJobsRef.current = aiJobs;
  useEffect(() => {
    const pending = aiJobs.filter((job) => !TERMINAL_JOB_STATUSES.has(job.status));
    if (pending.length === 0) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const current = aiJobsRef.current.filter((job) => !TERMINAL_JOB_STATUSES.has(job.status));
      if (current.length === 0) return;
      const updates = await Promise.all(
        current.map(async (job) => {
          try {
            const fresh = await getQuestionBankAdminPipelineJob(job.id);
            return { id: job.id, status: fresh.status };
          } catch {
            return job;
          }
        }),
      );
      if (cancelled) return;
      setAiJobs((prev) =>
        prev.map((job) => updates.find((upd) => upd.id === job.id) ?? job),
      );
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [aiJobs]);

  const aiJobsDone = aiJobs.filter((job) => TERMINAL_JOB_STATUSES.has(job.status)).length;
  const aiJobsFailed = aiJobs.filter((job) => job.status === "failed").length;
  const storageGate = storageSummary?.storage_gate;
  const storageGateTone =
    storageGate?.state === "green"
      ? "text-success"
      : storageGate?.state === "yellow"
        ? "text-warning"
        : storageGate
          ? "text-danger"
          : "text-muted";
  const pilot500Forecast = storageSummary?.ai_backfill_forecast?.pilot_500;

  // Recent async enrichment batches (Workstream C): load on mount, poll while any is running.
  const [aiBatches, setAiBatches] = useState<QuestionBankAiBatch[]>([]);
  const refreshBatches = useCallback(async () => {
    try {
      const res = await getQuestionBankAdminAiBatches(8);
      setAiBatches(res.batches || []);
    } catch {
      /* batches list is best-effort */
    }
  }, []);
  useEffect(() => {
    void refreshBatches();
  }, [refreshBatches]);
  useEffect(() => {
    const hasPending = aiBatches.some((batch) => !TERMINAL_JOB_STATUSES.has(batch.status));
    if (!hasPending) return;
    const timer = setInterval(() => void refreshBatches(), 6000);
    return () => clearInterval(timer);
  }, [aiBatches, refreshBatches]);

  async function previewAi() {
    setAiBusy(true);
    setAiError(null);
    try {
      setAiPreview(await previewQuestionBankAdminAiEnrichment({ selectionLimit: aiMaxNewJobs }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao prever custo da IA.");
    } finally {
      setAiBusy(false);
    }
  }

  async function runAi() {
    setAiBusy(true);
    setAiError(null);
    try {
      const result = await runQuestionBankAdminAiEnrichment({
        maxNewJobs: aiMaxNewJobs,
        selectionLimit: aiMaxNewJobs,
        batch: aiBatch,
      });
      setAiResult(result);
      const tracked: TrackedJob[] = (result.results || [])
        .filter((item) => typeof item.job_id === "string" && item.job_id)
        .map((item) => ({ id: item.job_id as string, status: String(item.status ?? "pending") }));
      setAiJobs(tracked);
      if (result.batch_id) void refreshBatches();
      // Re-run the dry-run so the pending/cost figures reflect what is left after enqueue.
      void previewAi();
      onRefresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao rodar IA dirigida.");
    } finally {
      setAiBusy(false);
    }
  }

  async function refreshStorageSummary() {
    setStorageBusy(true);
    setStorageError(null);
    try {
      setStorageSummary(await getQuestionBankAdminStorageSummary());
    } catch (err) {
      setStorageError(err instanceof Error ? err.message : "Falha ao consultar storage.");
    } finally {
      setStorageBusy(false);
    }
  }

  async function runCompactDryRun() {
    if (!selectedImportId) {
      setStorageError("Selecione um import para simular a compactacao.");
      return;
    }
    setStorageBusy(true);
    setStorageError(null);
    try {
      const result = await compactQuestionBankAdminImport(selectedImportId, {
        dryRun: true,
        includeFailed: false,
        mode: "aggressive",
      });
      setCompactDryRun(result);
      setStorageSummary(await getQuestionBankAdminStorageSummary());
    } catch (err) {
      setStorageError(err instanceof Error ? err.message : "Falha no dry-run de compactacao.");
    } finally {
      setStorageBusy(false);
    }
  }

  const formatAge = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return "-";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
  };

  if (!pipelineStatus || !readiness) return null;

  return (
    <div className="space-y-5">
      <section className="rounded-surface border border-edge bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Fila tecnica</h2>
            <p className="mt-1 text-sm text-ink">Jobs por etapa e reprocessamento.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-ink">
            Etapa
            <select
              value={jobType}
              onChange={(event) => onJobTypeChange(event.target.value)}
              className="rounded-surface border border-edge bg-surface px-3 py-2 text-sm"
            >
              {JOB_TYPES.map((type) => (
                <option key={type} value={type}>{jobTypeLabel(type)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Batch
            <input
              type="number"
              min={1}
              max={50}
              value={batchSize}
              onChange={(event) => onBatchSizeChange(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
              className="rounded-surface border border-edge bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Workers
            <input
              type="number"
              min={1}
              max={1}
              value={workers}
              onChange={() => onWorkersChange(1)}
              className="rounded-surface border border-edge bg-surface px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onRunBatch}
            className="rounded-surface bg-info px-5 py-2 text-sm font-semibold text-ink transition hover:bg-info"
          >
            Rodar lote
          </button>
          <span className="text-xs text-muted">{selectedImportId ? "import selecionado" : "global"}</span>
          <button
            onClick={onRefresh}
            className="rounded-surface border border-edge px-5 py-2 text-sm font-semibold text-ink transition hover:border-edge hover:bg-surface"
          >
            Recalcular
          </button>
        </div>

        {/* IA dirigida: seleção econômica de enriquecimento + custo em R$ + acompanhamento */}
        <div className="mt-5 rounded-surface border border-warning bg-surfaceMuted/40 p-4/40/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">IA dirigida (enriquecimento econômico)</h3>
              <p className="text-xs text-ink">
                Roda a IA nas melhores questões publicadas sem enriquecimento (microcompetência, perfil,
                diagnóstico de distratores). Prévia é um <em>dry-run</em>; a execução enfileira até o limite.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void previewAi()}
              disabled={aiBusy}
              className="rounded-surface border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
            >
              Prever custo
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium text-ink">
              Máx. de questões
              <input
                type="number"
                min={1}
                max={100}
                value={aiMaxNewJobs}
                onChange={(event) => setAiMaxNewJobs(Number(event.target.value))}
                className="w-32 rounded-surface border border-edge bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={aiBatch}
                onChange={(event) => setAiBatch(event.target.checked)}
              />
              Modo lote assíncrono (~50% mais barato)
            </label>
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={aiBusy}
              className="rounded-surface bg-warning px-5 py-2 text-sm font-semibold text-ink transition hover:bg-warning disabled:opacity-50"
            >
              {aiBusy ? "Processando…" : "Rodar IA"}
            </button>
          </div>
          {aiError ? <p className="mt-2 text-sm text-danger">{aiError}</p> : null}
          {aiPreview?.cost_estimate ? (
            <div className="mt-3 rounded-surface border border-warning/70 bg-surface/60 p-3 text-sm/40/40">
              <p className="text-ink">
                Selecionadas: <span className="font-semibold">{aiPreview.cost_estimate.selected}</span>
                {" · "}chamadas estimadas: <span className="font-semibold">{aiPreview.cost_estimate.estimated_llm_calls}</span>
                {" ("}
                {aiPreview.cost_estimate.estimated_cheap_calls} barata + {aiPreview.cost_estimate.estimated_strong_calls} forte)
              </p>
              <p className="mt-1 text-ink">
                Custo estimado:{" "}
                <span className="font-semibold text-warning">
                  {formatBRL(aiPreview.cost_estimate.estimated_cost_brl)}
                </span>{" "}
                <span className="text-xs text-muted">
                  (US$ {aiPreview.cost_estimate.estimated_cost_usd.toFixed(4)} · câmbio {aiPreview.cost_estimate.usd_brl_rate})
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Tokens médios/questão — barata: {aiPreview.cost_estimate.avg_tokens_by_stage.cheap.prompt_tokens}↑/
                {aiPreview.cost_estimate.avg_tokens_by_stage.cheap.completion_tokens}↓
                {aiPreview.cost_estimate.avg_tokens_by_stage.cheap.sampled === 0 ? " (estimado)" : ""}
              </p>
              {(aiPreview.results || []).length > 0 ? (
                <div className="mt-2 border-t border-warning/50 pt-2/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    O que a IA vai completar (top {Math.min(5, aiPreview.results.length)})
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {aiPreview.results.slice(0, 5).map((cand, idx) => (
                      <li key={String(cand.question_id ?? idx)} className="flex flex-wrap items-center gap-1.5 text-xs text-ink">
                        <span className="font-mono text-muted">
                          {String(cand.question_id ?? "?").slice(0, 8)}
                        </span>
                        {((cand.missing_capabilities as string[] | undefined) || []).map((cap) => (
                          <span key={cap} className="rounded-control border border-edge px-1.5 py-0.5">
                            {cap === "microcompetency"
                              ? "microcompetência"
                              : cap === "pedagogical_profile"
                                ? "perfil pedagógico"
                                : cap === "distractor_diagnosis"
                                  ? "diagnóstico de distratores"
                                  : cap}
                          </span>
                        ))}
                        {typeof cand.priority_score === "number" ? (
                          <span className="text-muted">prioridade {(cand.priority_score as number).toFixed(2)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          {aiResult ? (
            <p className="mt-2 text-sm text-success">
              Enfileiradas {aiResult.enqueued} de {aiResult.selected} selecionada(s)
              {aiResult.cost_estimate
                ? ` · custo estimado ${formatBRL(aiResult.cost_estimate.estimated_cost_brl)}`
                : ""}
              .
            </p>
          ) : null}
          {aiJobs.length > 0 ? (
            <div className="mt-2 text-sm text-ink">
              Acompanhamento: <span className="font-semibold">{aiJobsDone}</span>/{aiJobs.length} concluído(s)
              {aiJobsFailed > 0 ? (
                <span className="text-danger"> · {aiJobsFailed} com falha</span>
              ) : null}
              {aiJobsDone < aiJobs.length ? (
                <span className="ml-1 text-xs text-muted">(atualizando…)</span>
              ) : null}
            </div>
          ) : null}
          {aiBatches.length > 0 ? (
            <div className="mt-3 border-t border-warning/60 pt-3/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Lotes assíncronos recentes
              </p>
              <ul className="mt-2 space-y-1">
                {aiBatches.map((batch) => (
                  <li key={batch.id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    <span
                      className={`rounded-control px-2 py-0.5 text-xs font-semibold ${
                        batch.status === "completed"
                          ? "bg-surfaceMuted text-success/40"
                          : batch.status === "failed"
                            ? "bg-surfaceMuted text-danger/40"
                            : "bg-surfaceMuted text-info/40"
                      }`}
                    >
                      {batch.status}
                    </span>
                    <span>
                      {batch.completed_count}/{batch.request_count} ok
                      {batch.failed_count > 0 ? ` · ${batch.failed_count} falha` : ""}
                    </span>
                    <span className="text-xs text-muted">
                      {batch.total_tokens} tokens · {formatBRL(batch.cost_brl)}
                    </span>
                    {!TERMINAL_JOB_STATUSES.has(batch.status) ? (
                      <span className="text-xs text-muted">(atualizando…)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-4 overflow-auto rounded-surface border border-edge">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-muted">
                <th className="px-4 py-3 font-semibold">Etapa</th>
                <th className="px-4 py-3 font-semibold">Jobs</th>
                <th className="px-4 py-3 font-semibold">Mais antigo</th>
                <th className="px-4 py-3 font-semibold">Media</th>
                <th className="px-4 py-3 font-semibold">Erro</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.job_type} className="border-t border-edge">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{jobTypeLabel(stage.job_type)}</div>
                    <div className="mt-0.5 text-xs text-muted">{stage.job_type}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-control bg-surface px-2 py-0.5 text-xs font-semibold text-ink">fila {stage.pending}</span>
                      <span className="rounded-control bg-surfaceMuted px-2 py-0.5 text-xs font-semibold text-info/40">rodando {stage.processing}</span>
                      <span className="rounded-control bg-surfaceMuted px-2 py-0.5 text-xs font-semibold text-success/40">ok {stage.done}</span>
                    </div>
                    {stage.failed > 0 ? (
                      <button
                        onClick={() => onRetryStage(stage.job_type)}
                        title={`Retry ${stage.failed} jobs falhos`}
                        className="mt-2 rounded-control bg-surfaceMuted px-2 py-0.5 text-xs font-semibold text-danger hover:bg-surfaceMuted/40"
                      >
                        retry {stage.failed}
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink">{formatAge(stage.oldest_pending_age_seconds)}</td>
                  <td className="px-4 py-3 text-ink">{stage.avg_duration_ms ? `${stage.avg_duration_ms} ms` : "-"}</td>
                  <td className="px-4 py-3 text-xs text-ink">
                    {stage.last_error ? (
                      <div>
                        <button
                          onClick={() => onExpandedErrorChange(expandedError === stage.job_type ? null : stage.job_type)}
                          className="text-left text-danger underline decoration-dotted hover:text-danger"
                        >
                          {stage.last_error.length > 56 ? `${stage.last_error.slice(0, 56)}...` : stage.last_error}
                        </button>
                        {expandedError === stage.job_type ? (
                          <pre className="mt-1 max-w-xs overflow-auto rounded-surface bg-surfaceMuted p-2 text-xs text-danger/40">
                            {stage.last_error}
                          </pre>
                        ) : null}
                        {stage.last_error_at ? (
                          <span className="mt-0.5 block text-muted">{formatRelativeTime(stage.last_error_at)}</span>
                        ) : null}
                      </div>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-surface border border-edge bg-surface p-5">
        <h2 className="text-xl font-semibold text-ink">Diagnostics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-surface border border-edge bg-surface p-4">
            <div className="text-xs font-semibold uppercase text-muted">Readiness</div>
            <div className="mt-3 text-sm text-ink">
              <div>Status: <span className="font-semibold">{readiness.status || "-"}</span></div>
              <div>Banco: <span className="font-semibold">{readiness.database || "-"}</span></div>
              <div>LLM: <span className="font-semibold">{readiness.llm_enabled ? "on" : "off"}</span></div>
              <div>Auto: <span className="font-semibold">{readiness.auto_pipeline_enabled ? "on" : "off"}</span></div>
              <div>Workers: <span className="font-semibold">{readiness.pipeline_workers ?? "-"}</span></div>
            </div>
          </div>
          <div className="rounded-surface border border-edge bg-surface p-4">
            <div className="text-xs font-semibold uppercase text-muted">Providers</div>
            <div className="mt-3 space-y-2 text-sm text-ink">
              <div>Cheap: <span className="font-semibold">{readiness.providers.cheap.model || "-"}</span></div>
              <div>Strong: <span className="font-semibold">{readiness.providers.strong.model || "-"}</span></div>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-surface border border-edge bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase text-muted">Storage</div>
              <div className="mt-2 grid gap-2 text-sm text-ink sm:grid-cols-2 lg:grid-cols-4">
                <div>DB logico: <span className="font-semibold">{formatBytes(storageSummary?.pg_database_size)}</span></div>
                <div>WAL: <span className="font-semibold">{formatBytes(storageSummary?.pg_wal_size)}</span></div>
                <div>Uso efetivo: <span className="font-semibold">{formatBytes(storageSummary?.effective_used_bytes)}</span></div>
                <div>Capacidade: <span className="font-semibold">{formatBytes(storageSummary?.volume_capacity_bytes)}</span></div>
                <div>Folga fisica: <span className="font-semibold">{formatBytes(storageSummary?.headroom_bytes)}</span></div>
                <div>Imagens: <span className="font-semibold">{storageSummary?.image_storage.backend || "-"}</span></div>
                <div>Duravel: <span className="font-semibold">{storageSummary?.image_storage.durable ? "sim" : storageSummary ? "nao" : "-"}</span></div>
                <div>Gate: <span className={`font-semibold ${storageGateTone}`}>{storageGate?.state || "-"}</span></div>
                <div>IA lote: <span className="font-semibold">{storageSummary?.safe_ai_batch_available ? "liberada" : storageSummary ? "bloqueada" : "-"}</span></div>
                <div>Limpeza: <span className="font-semibold">{formatBytes(storageGate?.cleanup.estimated_reclaimable_bytes)}</span></div>
                <div>Piloto 500: <span className="font-semibold">{formatBytes(pilot500Forecast?.estimated_bytes)}</span></div>
              </div>
              {storageGate ? (
                <p className="mt-2 text-sm text-ink">
                  Recomendacao: <span className="font-semibold">{storageGate.recommendation}</span>.
                  {" "}Pos-limpeza: {formatBytes(storageGate.cleanup.estimated_size_after_cleanup_bytes)}
                  {" "}({formatBytes(storageGate.cleanup.estimated_headroom_after_cleanup_bytes)} de folga).
                </p>
              ) : null}
              {compactDryRun ? (
                <p className="mt-2 text-sm text-ink">
                  Dry-run: {Object.entries(compactDryRun.counts || {}).map(([key, value]) => `${key} ${value}`).join(" / ") || "sem itens"}.
                  {" "}Estimado: {formatBytes(Object.values(compactDryRun.estimated_bytes || {}).reduce((sum, value) => sum + value, 0))}.
                </p>
              ) : null}
              {storageError ? <p className="mt-2 text-sm text-danger">{storageError}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refreshStorageSummary()}
                disabled={storageBusy}
                className="rounded-surface border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
              >
                Storage
              </button>
              <button
                type="button"
                onClick={() => void runCompactDryRun()}
                disabled={storageBusy || !selectedImportId}
                className="rounded-surface bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-50"
              >
                Dry-run compact
              </button>
            </div>
          </div>
        </div>
        <details className="mt-4 rounded-surface border border-edge bg-surface p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">JSON bruto</summary>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            <JsonPanel title="Readiness raw" value={readiness} />
            <JsonPanel title="Pipeline raw" value={pipelineStatus} />
          </div>
        </details>
      </section>
    </div>
  );
}
