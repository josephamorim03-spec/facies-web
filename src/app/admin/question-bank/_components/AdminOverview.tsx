import { type QuestionBankAdminPipelineStatus } from "@/lib/api/domains/question-bank-admin";

import { StatCard } from "./AdminShared";

type View = "ingestao" | "questoes";

export function AdminViewSwitcher({
  view,
  onViewChange,
}: {
  view: View;
  onViewChange: (view: View) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1 text-sm dark:border-gray-800 dark:bg-gray-950">
      {([["ingestao", "Ingestao"], ["questoes", "Questoes"]] as const).map(([value, label]) => (
        <button
          key={value}
          onClick={() => onViewChange(value)}
          className={`rounded-full px-4 py-1.5 font-semibold transition ${
            view === value
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AdminOverview({
  pipelineStatus,
  lastRefreshedLabel,
  error,
  busy,
  onRefresh,
  onRunAll,
}: {
  pipelineStatus: QuestionBankAdminPipelineStatus | null;
  lastRefreshedLabel: string;
  error: string;
  busy: string;
  onRefresh: () => void;
  onRunAll: () => void;
}) {
  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Banco de Questoes</p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">KrosBank Admin</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Importar, processar, revisar e publicar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastRefreshedLabel ? <span className="text-xs text-gray-400 dark:text-gray-500">{lastRefreshedLabel}</span> : null}
            <button
              onClick={onRefresh}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Atualizar
            </button>
            <button
              onClick={onRunAll}
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              Rodar tudo
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {busy ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            {busy}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pendentes" value={pipelineStatus?.summary.pending_jobs ?? 0} />
        <StatCard label="Rodando" value={pipelineStatus?.summary.processing_jobs ?? 0} tone="accent" />
        <StatCard label="Falhos" value={pipelineStatus?.summary.failed_jobs ?? 0} tone="danger" />
        <StatCard label="Publicadas" value={pipelineStatus?.summary.published_questions ?? 0} />
        <StatCard label="Review" value={pipelineStatus?.summary.human_review_questions ?? 0} />
      </section>
    </>
  );
}
