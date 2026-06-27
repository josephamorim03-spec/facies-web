import {
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
              onChange={(event) => onBatchSizeChange(Number(event.target.value))}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Workers
            <input
              type="number"
              min={1}
              max={10}
              value={workers}
              onChange={(event) => onWorkersChange(Number(event.target.value))}
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

        <div className="mt-4 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold">Etapa</th>
                <th className="px-4 py-3 font-semibold">Jobs</th>
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
