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
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm dark:border-gray-800 dark:bg-gray-950">
      {([["ingestao", "Ingestao"], ["questoes", "Curadoria"]] as const).map(([value, label]) => (
        <button
          key={value}
          onClick={() => onViewChange(value)}
          className={`rounded-md px-4 py-1.5 font-semibold transition ${
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
  const editorialHealth = pipelineStatus?.editorial_health;
  const summary = pipelineStatus?.summary;
  const healthTone =
    editorialHealth?.state === "blocked"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
      : editorialHealth?.state === "needs_review"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";
  return (
    <>
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Banco de Questoes</p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">Operacao KrosBank</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Ingestao, fila tecnica e curadoria editorial.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastRefreshedLabel ? <span className="text-xs text-gray-400 dark:text-gray-500">{lastRefreshedLabel}</span> : null}
            <button
              onClick={onRefresh}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Atualizar
            </button>
            <button
              onClick={onRunAll}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              Processar fila
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {busy ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            {busy}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Publicadas" value={summary?.published_questions ?? 0} helper="visiveis no banco" />
        <StatCard label="Revisao humana" value={summary?.human_review_questions ?? 0} helper="questoes para curadoria" tone={summary?.human_review_questions ? "accent" : "default"} />
        <StatCard label="Fila tecnica" value={summary?.pending_jobs ?? 0} helper="jobs, nao questoes" />
        <StatCard label="Rodando" value={summary?.processing_jobs ?? 0} tone="accent" helper="processando agora" />
        <StatCard label="Falhas" value={summary?.failed_jobs ?? 0} tone={summary?.failed_jobs ? "danger" : "default"} helper="exigem retry" />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Leitura Editorial</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Publicacao e qualidade</h2>
            <div className={`mt-3 inline-flex rounded-lg border px-3 py-1 text-xs font-semibold ${healthTone}`}>
              {editorialHealth?.label ?? "sem leitura"}
            </div>
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-4">
            <StatCard label="Baixa conf." value={editorialHealth?.low_confidence_questions ?? 0} helper="auditar" />
            <StatCard label="Reports" value={editorialHealth?.open_reports ?? 0} helper="alunos" tone={editorialHealth?.open_reports ? "accent" : "default"} />
            <StatCard label="Bloqueadas" value={editorialHealth?.blocked_questions ?? 0} helper="nao publicaveis" tone={editorialHealth?.blocked_questions ? "danger" : "default"} />
            <StatCard label="Atencao" value={editorialHealth?.needs_attention ?? 0} helper="jobs presos" tone={editorialHealth?.needs_attention ? "danger" : "default"} />
          </div>
        </div>

        {editorialHealth?.funnel?.length ? (
          <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            {editorialHealth.funnel.map((stage) => (
              <div key={stage.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{stage.label}</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{stage.done}</div>
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  fila {stage.pending} / rodando {stage.processing} / falha {stage.failed}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {editorialHealth?.top_actions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {editorialHealth.top_actions.map((action) => (
              <span key={action} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300">
                {action}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
