import {
  type QuestionBankAdminPipelineStatus,
  type QuestionBankStemIncompleteReclassification,
} from "@/lib/api/domains/question-bank-admin";

import { StatCard } from "./AdminShared";

export type AdminQuestionBankView = "ingestao" | "curadoria" | "resolucao-ia" | "questoes";

export function AdminViewSwitcher({
  view,
  onViewChange,
}: {
  view: AdminQuestionBankView;
  onViewChange: (view: AdminQuestionBankView) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm dark:border-gray-800 dark:bg-gray-950">
      {([["ingestao", "Ingestão"], ["curadoria", "Curadoria"], ["questoes", "Questões"]] as const).map(([value, label]) => (
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
      <button
        onClick={() => onViewChange("resolucao-ia")}
        className={`rounded-md px-4 py-1.5 font-semibold transition ${
          view === "resolucao-ia"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
            : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
      >
        Resolucao IA
      </button>
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
  stemReclassResult,
  onPreviewStemReclassification,
}: {
  pipelineStatus: QuestionBankAdminPipelineStatus | null;
  lastRefreshedLabel: string;
  error: string;
  busy: string;
  onRefresh: () => void;
  onRunAll: () => void;
  stemReclassResult: QuestionBankStemIncompleteReclassification | null;
  onPreviewStemReclassification: () => void;
}) {
  if (!pipelineStatus) return null;
  const editorialHealth = pipelineStatus.editorial_health;
  const summary = pipelineStatus.summary;
  const hotspots = pipelineStatus.backlog_hotspots;
  const taxonomyAudit = pipelineStatus.taxonomy_audit;
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
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Banco de Questões</p>
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="PDFs/imports" value={summary?.imported_files ?? 0} helper={`${summary?.artifact_imports ?? 0} artefatos fora da conta principal`} />
        <StatCard label="Candidatos" value={summary?.candidate_total ?? 0} helper={`${summary?.dedup_pending_candidates ?? 0} ainda em dedup`} />
        <StatCard label="Publicadas" value={summary?.published_questions ?? 0} helper={`${summary?.zero_ai_published_questions ?? 0} sem IA`} />
        <StatCard label="Fila pronta" value={summary?.ready_pending_jobs ?? 0} helper="jobs prontos para claim" />
        <StatCard label="Rodando" value={summary?.processing_jobs ?? 0} tone="accent" helper="processando agora" />
        <StatCard label="Retry agendado" value={summary?.retry_scheduled_jobs ?? 0} tone={summary?.retry_scheduled_jobs ? "accent" : "default"} helper="aguardando backoff" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
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
              <StatCard label="Sem specialty" value={summary?.published_without_specialty ?? 0} helper="gaveta incompleta" tone={summary?.published_without_specialty ? "danger" : "default"} />
              <StatCard label="Rehomes" value={summary?.folder_taxonomy_rehomes ?? 0} helper="pasta venceu" tone={summary?.folder_taxonomy_rehomes ? "accent" : "default"} />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Re-lint auditado</div>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-100">
                  Simula a liberação de questões bloqueadas por <code>stem_incomplete</code> usando o lint revisado.
                </p>
              </div>
              <button
                type="button"
                onClick={onPreviewStemReclassification}
                disabled={Boolean(busy)}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/60 dark:bg-gray-950 dark:text-amber-200"
              >
                Simular re-lint
              </button>
            </div>
            {stemReclassResult ? (
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-white/80 p-3 dark:bg-black/20">
                  <div className="text-xs font-semibold uppercase opacity-70">Liberariam</div>
                  <div className="mt-1 text-2xl font-semibold">{stemReclassResult.published}</div>
                </div>
                <div className="rounded-lg bg-white/80 p-3 dark:bg-black/20">
                  <div className="text-xs font-semibold uppercase opacity-70">Continuam revisão</div>
                  <div className="mt-1 text-2xl font-semibold">{stemReclassResult.kept_review}</div>
                </div>
                <div className="rounded-lg bg-white/80 p-3 dark:bg-black/20">
                  <div className="text-xs font-semibold uppercase opacity-70">Checksum</div>
                  <div className="mt-2 truncate font-mono text-xs">{stemReclassResult.checksum}</div>
                </div>
                <div className="rounded-lg bg-white/80 p-3 sm:col-span-3 dark:bg-black/20">
                  <div className="text-xs font-semibold uppercase opacity-70">Bloqueios restantes</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(stemReclassResult.after_blockers).length ? Object.entries(stemReclassResult.after_blockers).map(([code, count]) => (
                      <span key={code} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
                        {code}: {count}
                      </span>
                    )) : <span className="text-xs opacity-70">Nenhum blocker restante no lote simulado.</span>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Imports</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.imported_files ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Candidatos</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.candidate_total ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Canonicas</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.canonical_questions ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Publicadas</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.published_questions ?? 0}</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Conversao media:{" "}
            <span className="font-semibold">
              {summary?.imported_files
                ? `${((summary.published_questions ?? 0) / Math.max(summary.imported_files, 1)).toFixed(1)} questões/import`
                : "0.0 questões/import"}
            </span>
            {" "}e{" "}
            <span className="font-semibold">
              {summary?.candidate_total
                ? `${(((summary.published_questions ?? 0) / Math.max(summary.candidate_total, 1)) * 100).toFixed(1)}% dos candidatos`
                : "0.0% dos candidatos"}
            </span>
            {" "}chegando em publicacao.
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

          {editorialHealth?.top_actions.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {editorialHealth.top_actions.map((action) => (
                <span key={action} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300">
                  {action}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Conflitos pasta x primario</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.folder_taxonomy_conflicts ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Sem specialty</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.published_without_specialty ?? 0}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Re-homadas</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{summary?.folder_taxonomy_rehomes ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Hotspots</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Onde o backlog pesa</h2>
          </div>
          <div className="mt-4 space-y-4">
            {([
              ["Muitos candidatos, zero publicadas", hotspots.many_candidates_zero_published ?? []],
              ["Baixo rendimento (1-2 candidatas)", hotspots.low_yield_candidates ?? []],
              ["Artefatos tecnicos", hotspots.technical_artifacts ?? []],
            ] as const).map(([label, items]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</div>
                <div className="mt-3 space-y-2">
                  {items.length ? items.map((item) => (
                    <div key={`${label}-${item.imported_file_id}`} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-800 dark:text-gray-100">{item.file_name || item.imported_file_id}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.source_label || "sem fonte"}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                        <div>{item.candidate_count} cand.</div>
                        <div>{item.published_question_count} pub.</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Sem itens relevantes agora.</div>
                  )}
                </div>
              </div>
            ))}
            {([
              ["Conflitos de gaveta", taxonomyAudit?.conflict_examples ?? []],
              ["Publicadas sem specialty", taxonomyAudit?.missing_specialty_examples ?? []],
            ] as const).map(([label, items]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</div>
                <div className="mt-3 space-y-2">
                  {items.length ? items.map((item) => (
                    <div key={`${label}-${item.question_id}`} className="text-sm">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{item.question_id}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.stem_sample || "sem amostra"}</div>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Sem itens relevantes agora.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
