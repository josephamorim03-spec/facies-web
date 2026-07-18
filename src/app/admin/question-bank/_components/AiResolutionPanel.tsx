"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getQuestionBankAdminQuestion,
  getQuestionBankAiResolutionRequests,
  previewQuestionBankAdminAiEnrichment,
  routeQuestionBankEditorialBatch,
  runQuestionBankAdminAiEnrichment,
  type QuestionBankAdminQuestionDetail,
  type QuestionBankAiEnrichmentResult,
  type QuestionBankAiResolutionDemand,
  type QuestionBankAiResolutionDemandItem,
} from "@/lib/api/domains/question-bank-admin";

import { JsonPanel, StatCard } from "./AdminShared";
import { formatRelativeTime } from "./adminQuestionBankUtils";

type DemandFilter =
  | "student_requested"
  | "without_correction"
  | "queued"
  | "completed"
  | "blocked"
  | "has_reports"
  | "all";

const FILTERS: Array<[DemandFilter, string]> = [
  ["student_requested", "Pedidas por alunos"],
  ["without_correction", "Sem resolucao"],
  ["queued", "IA em andamento"],
  ["completed", "Ja processadas"],
  ["blocked", "Bloqueadas"],
  ["all", "Todas"],
];

const EMPTY_ITEMS: QuestionBankAiResolutionDemandItem[] = [];

function parseIds(text: string): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of text.replace(/[,;]/g, "\n").split(/\s+/)) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function statusLabel(status: string): string {
  switch (status) {
    case "cached":
      return "cache pronto";
    case "completed":
      return "IA rodada";
    case "queued":
      return "na fila";
    case "running":
    case "processing":
      return "rodando";
    case "blocked_by_quality":
      return "bloqueada";
    case "idle":
      return "sem pedido";
    default:
      return status || "sem status";
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "send_to_ai":
      return "Enviar para IA";
    case "send_to_human_review":
      return "Revisao humana";
    case "already_processed":
      return "Ignorar";
    case "wait":
      return "Aguardar";
    default:
      return action || "Avaliar";
  }
}

function rowTone(item: QuestionBankAiResolutionDemandItem): string {
  if (item.quality_blockers.length || item.ai_request_status === "blocked_by_quality") {
    return "border-red-100 bg-red-50/40 dark:border-red-950/40 dark:bg-red-950/10";
  }
  if (item.has_canonical_correction || ["completed", "cached"].includes(item.ai_request_status)) {
    return "border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/10";
  }
  if (["queued", "running", "processing"].includes(item.ai_request_status)) {
    return "border-blue-100 bg-blue-50/40 dark:border-blue-950/40 dark:bg-blue-950/10";
  }
  return "border-gray-100 dark:border-gray-800";
}

export default function AiResolutionPanel() {
  const [filter, setFilter] = useState<DemandFilter>("student_requested");
  const [data, setData] = useState<QuestionBankAiResolutionDemand | null>(null);
  const [pastedIds, setPastedIds] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [includeProcessed, setIncludeProcessed] = useState(false);
  const [aiPreview, setAiPreview] = useState<QuestionBankAiEnrichmentResult | null>(null);
  const [detail, setDetail] = useState<QuestionBankAdminQuestionDetail | null>(null);

  const items = data?.items ?? EMPTY_ITEMS;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const eligibleIds = useMemo(
    () => items.filter((item) => includeProcessed || item.can_admin_batch).map((item) => item.question_id),
    [includeProcessed, items],
  );

  async function loadDemand(nextFilter = filter, ids?: string[]) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await getQuestionBankAiResolutionRequests({
        filter: ids?.length ? "all" : nextFilter,
        questionIds: ids,
        limit: 80,
      });
      setData(response);
      setSelected(new Set(response.items.filter((item) => item.can_admin_batch).map((item) => item.question_id)));
      setAiPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar demandas de resolucao.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDemand("student_requested");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelected(questionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    setAiPreview(null);
  }

  async function runSafely(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  const cards = [
    ["Pedidas por alunos", data?.summary.student_requested ?? 0, "demandas reais do aluno"],
    ["Sem resolucao", data?.summary.without_correction ?? 0, "sem correcao canonica"],
    ["IA em andamento", data?.summary.queued ?? 0, "fila ou running"],
    ["Ja processadas", data?.summary.completed ?? 0, "completed/cache"],
    ["Bloqueadas", data?.summary.blocked ?? 0, "qualidade/revisao"],
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Resolucao IA</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">Central leiga de resolucao de questoes</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Veja o que alunos pediram, cole lotes de IDs e envie para IA sem aprovar conteudo medico automaticamente.
              Pedido de resolucao nao e denuncia: reports continuam separados.
            </p>
          </div>
          <button
            onClick={() => void loadDemand(filter)}
            disabled={loading || Boolean(busy)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {notice}
          </div>
        ) : null}
        {busy ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            {busy}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, helper]) => (
          <StatCard key={label} label={label} value={value} helper={helper} tone={label === "Bloqueadas" && value ? "danger" : "default"} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filtros prontos</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilter(value);
                    void loadDemand(value);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    filter === value
                      ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100" htmlFor="ai-resolution-ids">
              Colar IDs de questoes
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pode colar um por linha, separado por espaco, virgula ou ponto-e-virgula.
            </p>
            <textarea
              id="ai-resolution-ids"
              value={pastedIds}
              onChange={(event) => setPastedIds(event.target.value)}
              rows={7}
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="question_id_1&#10;question_id_2"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void loadDemand("all", parseIds(pastedIds))}
                disabled={loading || parseIds(pastedIds).length === 0}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
              >
                Classificar IDs
              </button>
              <button
                onClick={() => setSelected(new Set(eligibleIds))}
                disabled={!items.length}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Selecionar elegiveis
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={!selected.size}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Limpar selecao
              </button>
            </div>
            {data?.missing_question_ids.length ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                IDs nao encontrados: {data.missing_question_ids.join(", ")}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Acao em lote</div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={includeProcessed}
                onChange={(event) => setIncludeProcessed(event.target.checked)}
              />
              Reprocessar tambem ja processadas
            </label>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Selecionadas: <span className="font-semibold">{selected.size}</span>. Por padrao, questoes com IA pronta/cache ou correcao canonica ficam fora.
            </div>
            <div className="mt-4 grid gap-2">
              <button
                disabled={!selected.size || Boolean(busy)}
                onClick={() => void runSafely("Calculando dry-run da IA", async () => {
                  const preview = await previewQuestionBankAdminAiEnrichment({ questionIds: selectedIds });
                  setAiPreview(preview);
                  setNotice(`Dry-run: ${preview.selected} selecionadas, estimativa registrada antes de enfileirar.`);
                })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Ver custo/quantidade primeiro
              </button>
              <button
                disabled={!selected.size || Boolean(busy)}
                onClick={() => void runSafely("Enfileirando lote para IA", async () => {
                  const result = await runQuestionBankAdminAiEnrichment({
                    maxNewJobs: selected.size,
                    questionIds: selectedIds,
                    batch: true,
                  });
                  setAiPreview(result);
                  setNotice(`Lote enviado: ${result.enqueued} enfileiradas de ${result.selected} selecionadas.`);
                  await loadDemand(filter, parseIds(pastedIds).length ? parseIds(pastedIds) : undefined);
                })}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                Enviar lote para IA
              </button>
              <button
                disabled={!selected.size || Boolean(busy)}
                onClick={() => void runSafely("Mandando para revisao humana", async () => {
                  const result = await routeQuestionBankEditorialBatch(selectedIds, "editorial_review");
                  setNotice(`${result.count} questoes roteadas para revisao humana.`);
                })}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
              >
                Mandar para revisao humana
              </button>
              <button
                disabled={!selected.size}
                onClick={() => {
                  const next = new Set(
                    selectedIds.filter((id) => {
                      const item = items.find((row) => row.question_id === id);
                      return item && !item.has_canonical_correction && !["completed", "cached"].includes(item.ai_request_status);
                    }),
                  );
                  setSelected(next);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Ignorar ja processadas
              </button>
            </div>
          </div>

          {aiPreview ? <JsonPanel title="Resultado / dry-run do lote" value={aiPreview} /> : null}
          {detail ? <JsonPanel title={`Detalhes ${detail.id}`} value={detail} /> : null}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fila de resolucao</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{items.length} itens carregados</div>
            </div>
            <button
              disabled={!items.length}
              onClick={() => {
                const allSelected = items.every((item) => selected.has(item.question_id));
                setSelected(allSelected ? new Set() : new Set(items.map((item) => item.question_id)));
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {items.every((item) => selected.has(item.question_id)) ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>
          <div className="max-h-[760px] overflow-auto">
            {items.length ? (
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-3">Sel.</th>
                    <th className="px-3 py-3">Questao</th>
                    <th className="px-3 py-3">Demanda</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.question_id} className={`border-t align-top ${rowTone(item)}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(item.question_id)}
                          onChange={() => toggleSelected(item.question_id)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{item.question_id}</div>
                        <div className="mt-1 max-w-xl text-xs leading-5 text-gray-600 dark:text-gray-300">
                          {item.stem_preview || "Sem enunciado disponivel neste recorte."}
                        </div>
                        {item.quality_blockers.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.quality_blockers.map((blocker) => (
                              <span key={blocker} className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                {blocker}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        <div>{item.request_count} pedidos</div>
                        <div>{item.unique_users} alunos</div>
                        <div>{item.latest_requested_at ? formatRelativeTime(new Date(item.latest_requested_at)) : "sem data"}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        <div className="font-semibold">{statusLabel(item.ai_request_status)}</div>
                        <div>{item.has_canonical_correction ? "correcao canonica existe" : "sem correcao canonica"}</div>
                        <div>{item.has_open_reports ? `${item.open_reports} reports` : "sem reports no KMed"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">{actionLabel(item.recommended_action)}</div>
                        <button
                          onClick={() => void runSafely("Carregando detalhes", async () => {
                            setDetail(await getQuestionBankAdminQuestion(item.question_id));
                          })}
                          className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma questao neste recorte. Cole IDs ou mude o filtro.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
