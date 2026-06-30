import { useState } from "react";

import {
  getQuestionBankAdminAiPreview,
  runQuestionBankAdminAi,
  type QuestionBankAiPreview,
  type QuestionBankAdminPipelineSnapshot,
  type QuestionBankAdminPipelineStatus,
  type QuestionBankAdminReadiness,
} from "@/lib/api/domains/question-bank-admin";

import { JsonPanel } from "./AdminShared";
import { JOB_TYPES, jobTypeLabel } from "./adminQuestionBankUtils";

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

  // IA dirigida: prévia de custo + execução com teto de chamadas, no escopo atual.
  const [aiMaxCalls, setAiMaxCalls] = useState(100);
  const [aiIncludeStrong, setAiIncludeStrong] = useState(true);
  const [aiBatch, setAiBatch] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<QuestionBankAiPreview | null>(null);
  const [aiResult, setAiResult] = useState<Awaited<ReturnType<typeof runQuestionBankAdminAi>> | null>(null);

  async function previewAi() {
    setAiBusy(true);
    setAiError(null);
    try {
      setAiPreview(await getQuestionBankAdminAiPreview(selectedImportId || undefined));
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
      const result = await runQuestionBankAdminAi({
        maxLlmCalls: aiMaxCalls,
        includeStrong: aiIncludeStrong,
        importedFileId: selectedImportId || undefined,
        batch: aiBatch,
      });
      setAiResult(result);
      onRefresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao rodar IA dirigida.");
    } finally {
      setAiBusy(false);
    }
  }

  const formatAge = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "-";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Fila tecnica</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Jobs por etapa e reprocessamento.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Etapa
            <select
              value={jobType}
              onChange={(event) => onJobTypeChange(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              {JOB_TYPES.map((type) => (
                <option key={type} value={type}>{jobTypeLabel(type)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Batch
            <input
              type="number"
              min={1}
              max={50}
              value={batchSize}
              onChange={(event) => onBatchSizeChange(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Workers
            <input
              type="number"
              min={1}
              max={1}
              value={workers}
              onChange={() => onWorkersChange(1)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onRunBatch}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Rodar lote
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">{selectedImportId ? "import selecionado" : "global"}</span>
          <button
            onClick={onRefresh}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Recalcular
          </button>
        </div>

        {/* IA dirigida: escopo + teto de custo + prévia */}
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">IA dirigida (com teto de custo)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Roda só as etapas de IA no escopo {selectedImportId ? "do import selecionado" : "global"}, limitado a um teto de chamadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void previewAi()}
              disabled={aiBusy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Prever custo
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Teto de chamadas
              <input
                type="number"
                min={1}
                max={5000}
                value={aiMaxCalls}
                onChange={(event) => setAiMaxCalls(Number(event.target.value))}
                className="w-32 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={aiIncludeStrong}
                onChange={(event) => setAiIncludeStrong(event.target.checked)}
              />
              Incluir IA forte
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={aiBatch}
                onChange={(event) => setAiBatch(event.target.checked)}
              />
              Lote por chamada (econômico)
            </label>
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={aiBusy}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {aiBusy ? "Processando…" : "Rodar IA (com teto)"}
            </button>
          </div>
          {aiError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{aiError}</p> : null}
          {aiPreview ? (
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              Pendentes — barata: <span className="font-semibold">{aiPreview.pending_by_stage["cheap_ai_classify_question"] ?? 0}</span>
              {" · "}forte: <span className="font-semibold">{aiPreview.pending_by_stage["strong_ai_classify_question"] ?? 0}</span>
              {" · "}roteio: <span className="font-semibold">{aiPreview.pending_by_stage["route_question_analysis"] ?? 0}</span>
              {" — estimativa de chamadas: "}<span className="font-semibold">{aiPreview.estimated_llm_calls}</span>
            </p>
          ) : null}
          {aiResult ? (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
              Rodou {aiResult.llm_calls_used} de {aiResult.max_llm_calls} chamada(s); restante {aiResult.remaining_budget}.
            </p>
          ) : null}
        </div>

        <div className="mt-4 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Etapa</th>
                <th className="px-4 py-3 font-semibold">Jobs</th>
                <th className="px-4 py-3 font-semibold">Mais antigo</th>
                <th className="px-4 py-3 font-semibold">Media</th>
                <th className="px-4 py-3 font-semibold">Erro</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.job_type} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{jobTypeLabel(stage.job_type)}</div>
                    <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{stage.job_type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">fila {stage.pending}</span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">rodando {stage.processing}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">ok {stage.done}</span>
                    </div>
                    {stage.failed > 0 ? (
                      <button
                        onClick={() => onRetryStage(stage.job_type)}
                        title={`Retry ${stage.failed} jobs falhos`}
                        className="mt-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
                      >
                        retry {stage.failed}
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatAge(stage.oldest_pending_age_seconds)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{stage.avg_duration_ms ? `${stage.avg_duration_ms} ms` : "-"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {stage.last_error ? (
                      <div>
                        <button
                          onClick={() => onExpandedErrorChange(expandedError === stage.job_type ? null : stage.job_type)}
                          className="text-left text-red-500 underline decoration-dotted hover:text-red-700 dark:text-red-400"
                        >
                          {stage.last_error.length > 56 ? `${stage.last_error.slice(0, 56)}...` : stage.last_error}
                        </button>
                        {expandedError === stage.job_type ? (
                          <pre className="mt-1 max-w-xs overflow-auto rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            {stage.last_error}
                          </pre>
                        ) : null}
                        {stage.last_error_at ? (
                          <span className="mt-0.5 block text-gray-400 dark:text-gray-500">{formatRelativeTime(stage.last_error_at)}</span>
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

      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Diagnostics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Readiness</div>
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              <div>Status: <span className="font-semibold">{readiness?.status || "-"}</span></div>
              <div>Banco: <span className="font-semibold">{readiness?.database || "-"}</span></div>
              <div>LLM: <span className="font-semibold">{readiness?.llm_enabled ? "on" : "off"}</span></div>
              <div>Auto: <span className="font-semibold">{readiness?.auto_pipeline_enabled ? "on" : "off"}</span></div>
              <div>Workers: <span className="font-semibold">{readiness?.pipeline_workers ?? "-"}</span></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Providers</div>
            <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div>Cheap: <span className="font-semibold">{readiness?.providers.cheap.model || "-"}</span></div>
              <div>Strong: <span className="font-semibold">{readiness?.providers.strong.model || "-"}</span></div>
            </div>
          </div>
        </div>
        <details className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">JSON bruto</summary>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            <JsonPanel title="Readiness raw" value={readiness} />
            <JsonPanel title="Pipeline raw" value={pipelineStatus} />
          </div>
        </details>
      </section>
    </div>
  );
}
