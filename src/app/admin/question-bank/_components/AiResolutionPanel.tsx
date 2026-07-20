"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getQuestionBankAdminQuestion,
  getQuestionBankAiResolutionRequests,
  listQuestionBankReports,
  previewQuestionBankAdminAiEnrichment,
  routeQuestionBankEditorialBatch,
  runQuestionBankAdminAiEnrichment,
  type QuestionBankAdminQuestionDetail,
  type QuestionBankAiEnrichmentResult,
  type QuestionBankAiResolutionDemand,
  type QuestionBankAiResolutionDemandItem,
  type QuestionBankReport,
} from "@/lib/api/domains/question-bank-admin";

import { JsonPanel, StatCard } from "./AdminShared";
import { formatRelativeTime } from "./adminQuestionBankUtils";

type DemandFilter =
  | "student_requested"
  | "without_correction"
  | "queued"
  | "completed"
  | "blocked"
  | "broken"
  | "has_reports"
  | "all";

const FILTERS: Array<[DemandFilter, string]> = [
  ["student_requested", "Pedidas por alunos"],
  ["without_correction", "Sem resolucao"],
  ["queued", "IA em andamento"],
  ["completed", "Ja processadas"],
  ["blocked", "Bloqueadas"],
  ["broken", "Quebradas"],
  ["has_reports", "Denunciadas"],
  ["all", "Todas"],
];

const EMPTY_ITEMS: QuestionBankAiResolutionDemandItem[] = [];
const EMPTY_REPORTS: QuestionBankReport[] = [];
const BROKEN_BLOCKER_CODES = new Set([
  "missing_stem",
  "stem_too_short",
  "missing_answer",
  "answer_not_in_alternatives",
  "missing_options",
  "empty_alternative",
  "alternative_order_invalid",
  // source_metadata_in_stem saiu: virou warning no backend (header de
  // proveniencia vazado e defeito editorial, nao questao quebrada). Mante-lo
  // aqui deixaria a aba "Quebradas" contando questoes que o backend ja nao
  // bloqueia. O label textual segue abaixo, para quando o codigo aparecer
  // como warning ou como blocker canonico do kbank.
  // Este sim quebra a questao: o titulo grudado no enunciado contem o gabarito.
  // `topic_header_in_stem` fica de fora de proposito — e warning, porque atinge
  // ~3% do banco e vaza apenas o tema, nao a resposta.
  "answer_revealed_in_stem",
  "missing_required_media",
]);

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

function blockerLabel(code: string): string {
  switch (code) {
    case "missing_stem":
      return "sem enunciado";
    case "stem_too_short":
      return "enunciado incompleto";
    case "missing_answer":
      return "sem gabarito";
    case "answer_not_in_alternatives":
      return "gabarito nao bate";
    case "missing_options":
      return "faltam alternativas";
    case "empty_alternative":
      return "alternativa vazia";
    case "alternative_order_invalid":
      return "ordem A/B/C/D quebrada";
    case "source_metadata_in_stem":
      return "banca/ano no enunciado";
    case "answer_revealed_in_stem":
      return "resposta no titulo do enunciado";
    case "answer_term_in_stem":
      return "termo da resposta no enunciado";
    case "topic_header_in_stem":
      return "tema como titulo no enunciado";
    case "missing_required_media":
      return "midia ausente";
    default:
      return code.replaceAll("_", " ");
  }
}

function reportTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case "wrong_answer":
      return "gabarito";
    case "bad_structure":
      return "estrutura";
    case "missing_options":
      return "alternativas";
    case "truncated_or_merged_stem":
      return "enunciado";
    case "missing_media":
      return "midia";
    case "wrong_metadata":
      return "metadados";
    case "outdated":
      return "desatualizada";
    case "unclear":
      return "confusa";
    case "error":
      return "erro";
    case "other":
      return "outro";
    default:
      return type || "report";
  }
}

function reportReason(report: QuestionBankReport): string {
  const reason = String(report.report_reason || "").trim();
  if (reason) return reason.slice(0, 180);
  const diagnosis = report.ai_diagnosis;
  const summary = diagnosis && typeof diagnosis.summary === "string" ? diagnosis.summary.trim() : "";
  if (summary) return summary.slice(0, 180);
  return "Sem motivo textual informado.";
}

function rowTone(item: QuestionBankAiResolutionDemandItem): string {
  if (item.has_open_reports || item.quality_blockers.length || item.ai_request_status === "blocked_by_quality") {
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

function isInProgress(item: QuestionBankAiResolutionDemandItem): boolean {
  return ["queued", "running", "processing"].includes(item.ai_request_status);
}

function isProcessed(item: QuestionBankAiResolutionDemandItem): boolean {
  return item.has_canonical_correction || ["completed", "cached"].includes(item.ai_request_status);
}

function hasBrokenStructure(item: QuestionBankAiResolutionDemandItem): boolean {
  return item.quality_blockers.some((code) => BROKEN_BLOCKER_CODES.has(code));
}

function isSafeForAi(item: QuestionBankAiResolutionDemandItem): boolean {
  return !item.has_open_reports && !item.quality_blockers.length && !isProcessed(item) && !isInProgress(item);
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
  const [reports, setReports] = useState<QuestionBankReport[]>(EMPTY_REPORTS);

  const reportsByQuestionId = useMemo(() => {
    const grouped = new Map<string, QuestionBankReport[]>();
    for (const report of reports) {
      const questionId = String(report.question_id || "").trim();
      if (!questionId) continue;
      grouped.set(questionId, [...(grouped.get(questionId) ?? []), report]);
    }
    return grouped;
  }, [reports]);
  const items = useMemo(
    () => (data?.items ?? EMPTY_ITEMS).map((item) => {
      const questionReports = reportsByQuestionId.get(item.question_id) ?? EMPTY_REPORTS;
      return questionReports.length
        ? { ...item, has_open_reports: true, open_reports: questionReports.length }
        : item;
    }),
    [data?.items, reportsByQuestionId],
  );
  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const batchableSelectedIds = useMemo(
    () => selectedIds.filter((id) => {
      const item = items.find((row) => row.question_id === id);
      if (!item || item.has_open_reports) return false;
      return includeProcessed || item.can_admin_batch;
    }),
    [includeProcessed, items, selectedIds],
  );
  const eligibleIds = useMemo(
    () => items.filter((item) => includeProcessed || isSafeForAi(item)).map((item) => item.question_id),
    [includeProcessed, items],
  );
  const reportedIds = useMemo(() => items.filter((item) => item.has_open_reports).map((item) => item.question_id), [items]);
  const blockedIds = useMemo(
    () => items.filter((item) => item.quality_blockers.length || item.ai_request_status === "blocked_by_quality").map((item) => item.question_id),
    [items],
  );
  const brokenIds = useMemo(() => items.filter(hasBrokenStructure).map((item) => item.question_id), [items]);
  const safeAiIds = useMemo(() => items.filter(isSafeForAi).map((item) => item.question_id), [items]);
  const processedCleanIds = useMemo(
    () => items.filter((item) => isProcessed(item) && !item.has_open_reports && !item.quality_blockers.length).map((item) => item.question_id),
    [items],
  );

  async function loadDemand(nextFilter = filter, ids?: string[]) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const reportsResponse = await listQuestionBankReports({ status: "pending", limit: 200 });
      setReports(reportsResponse.items);
      const reportQuestionIds = reportsResponse.items.map((report) => String(report.question_id || "").trim()).filter(Boolean);
      const lookupIds = ids?.length ? ids : nextFilter === "has_reports" ? [...new Set(reportQuestionIds)] : undefined;
      const upstreamFilter: Exclude<DemandFilter, "broken"> = nextFilter === "broken" ? "blocked" : nextFilter;
      const response = await getQuestionBankAiResolutionRequests({
        filter: lookupIds?.length ? "all" : upstreamFilter,
        questionIds: lookupIds,
        limit: 80,
      });
      const reportsQuestionIds = new Set(reportsResponse.items.map((report) => String(report.question_id || "").trim()).filter(Boolean));
      const hydratedItems = response.items.map((item) => (
        reportsQuestionIds.has(item.question_id)
          ? {
              ...item,
              has_open_reports: true,
              open_reports: reportsResponse.items.filter((report) => report.question_id === item.question_id).length,
            }
          : item
      ));
      setData({
        ...response,
        filter: nextFilter,
        items: nextFilter === "has_reports"
          ? hydratedItems.filter((item) => item.has_open_reports)
          : nextFilter === "broken"
            ? hydratedItems.filter(hasBrokenStructure)
            : hydratedItems,
      });
      setSelected(new Set(hydratedItems.filter((item) => item.can_admin_batch && !item.has_open_reports).map((item) => item.question_id)));
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

  function selectIds(ids: string[]) {
    setSelected(new Set(ids));
    setAiPreview(null);
  }

  function selectRecommendedNextBatch() {
    if (reportedIds.length) {
      selectIds(reportedIds);
      setNotice("Prioridade segura: denuncias abertas selecionadas para revisao humana.");
      return;
    }
    if (brokenIds.length) {
      selectIds(brokenIds);
      setNotice("Questoes quebradas/corrompidas selecionadas para correcao estrutural.");
      return;
    }
    if (safeAiIds.length) {
      selectIds(safeAiIds);
      setNotice("Lote seguro selecionado. Rode dry-run antes de enfileirar IA.");
      return;
    }
    if (blockedIds.length) {
      selectIds(blockedIds);
      setNotice("Bloqueios editoriais selecionados para revisao humana.");
      return;
    }
    if (processedCleanIds.length) {
      selectIds(processedCleanIds);
      setNotice("Questoes processadas e sem alertas selecionadas para auditoria editorial/SQLite.");
      return;
    }
    setNotice("Nada acionavel neste recorte. Cole IDs ou mude o filtro.");
  }

  const cards = [
    ["Pedidas por alunos", data?.summary.student_requested ?? 0, "demandas reais do aluno"],
    ["Sem resolucao", data?.summary.without_correction ?? 0, "sem correcao canonica"],
    ["IA em andamento", data?.summary.queued ?? 0, "fila ou running"],
    ["Ja processadas", data?.summary.completed ?? 0, "completed/cache"],
    ["Bloqueadas", data?.summary.blocked ?? 0, "qualidade/revisao"],
    ["Quebradas", brokenIds.length, "estrutura/importacao"],
    ["Denunciadas", reports.length, "reports abertos"],
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {cards.map(([label, value, helper]) => (
          <StatCard key={label} label={label} value={value} helper={helper} tone={(label === "Bloqueadas" || label === "Denunciadas" || label === "Quebradas") && value ? "danger" : "default"} />
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-5">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
          <div className="text-xs font-semibold uppercase opacity-70">1. Seguranca medica</div>
          <div className="mt-1 text-lg font-semibold">Denuncias primeiro</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Questoes denunciadas ficam fora da IA em lote ate revisao humana.
          </p>
          <button
            onClick={() => selectIds(reportedIds)}
            disabled={!reportedIds.length}
            className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            Selecionar denunciadas ({reportedIds.length})
          </button>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
          <div className="text-xs font-semibold uppercase opacity-70">2. Importacao quebrada</div>
          <div className="mt-1 text-lg font-semibold">Corrigir estrutura</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Sem enunciado, sem gabarito, alternativa vazia, ordem A/C/B/D ou banca/ano no texto.
          </p>
          <button
            onClick={() => selectIds(brokenIds)}
            disabled={!brokenIds.length}
            className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            Selecionar quebradas ({brokenIds.length})
          </button>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
          <div className="text-xs font-semibold uppercase opacity-70">3. Lote seguro</div>
          <div className="mt-1 text-lg font-semibold">Pode mandar para IA</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Sem denuncia, sem bloqueio, sem correcao pronta e sem job rodando.
          </p>
          <button
            onClick={() => selectIds(safeAiIds)}
            disabled={!safeAiIds.length}
            className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            Selecionar lote seguro ({safeAiIds.length})
          </button>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="text-xs font-semibold uppercase opacity-70">4. Revisao humana</div>
          <div className="mt-1 text-lg font-semibold">Bloqueios editoriais</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Estrutura ruim, reports ou qualidade incerta devem virar fila humana.
          </p>
          <button
            onClick={() => selectIds([...new Set([...reportedIds, ...brokenIds, ...blockedIds])])}
            disabled={!reportedIds.length && !brokenIds.length && !blockedIds.length}
            className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            Selecionar revisao ({new Set([...reportedIds, ...brokenIds, ...blockedIds]).size})
          </button>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
          <div className="text-xs font-semibold uppercase opacity-70">5. Valor editorial</div>
          <div className="mt-1 text-lg font-semibold">Prontas para gate/SQLite</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            IA rodada nao aprova sozinha: daqui ainda passa por auditoria e gate medico.
          </p>
          <button
            onClick={() => selectIds(processedCleanIds)}
            disabled={!processedCleanIds.length}
            className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            Selecionar processadas ({processedCleanIds.length})
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Modo leigo: o que fazer agora</div>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  Use de cima para baixo: resolva denuncias, corrija questoes quebradas, rode IA nos lotes seguros, mande bloqueios para revisao,
                  e so depois pense em publicar no catalogo SQLite.
                </p>
              </div>
              <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:border-gray-800 dark:text-gray-400">
                {selected.size} selecionadas
              </span>
            </div>
            <button
              onClick={selectRecommendedNextBatch}
              className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              Escolher proximo lote seguro automaticamente
            </button>
            <ol className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <li><span className="font-semibold">Denunciada?</span> Nao envie para IA em lote; mande para revisao humana e leia o motivo.</li>
              <li><span className="font-semibold">Quebrada?</span> Corrija importacao/estrutura antes: IA nao salva questao sem enunciado, gabarito ou alternativas boas.</li>
              <li><span className="font-semibold">Sem resolucao e sem bloqueio?</span> Selecione lote seguro e rode dry-run antes de enfileirar.</li>
              <li><span className="font-semibold">Ja processada?</span> Ignore, salvo se voce marcou reprocessar conscientemente.</li>
              <li><span className="font-semibold">SQLite?</span> IA rodada ajuda, mas a entrada no catalogo depende de revisao humana/versionada e gate medico.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-gray-900">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saida editorial / SQLite</div>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Esta tela prepara valor editorial; ela nao publica sozinha. Para uma questao entrar no catalogo SQLite do aluno,
              precisa estar sem denuncia aberta, sem bloqueio, com IA/resolucao util quando necessario e revisao humana versionada.
            </p>
            <div className="mt-4 grid gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <span>Sem denuncia aberta</span>
                <span className="font-semibold">{items.length - reportedIds.length}/{items.length || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <span>Sem bloqueio de qualidade</span>
                <span className="font-semibold">{items.length - blockedIds.length}/{items.length || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <span>Sem quebra estrutural/importacao</span>
                <span className="font-semibold">{items.length - brokenIds.length}/{items.length || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <span>Processadas e limpas para auditoria</span>
                <span className="font-semibold">{processedCleanIds.length}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
              Transferir para SQLite continua sendo operacao do publisher/gate medico; aqui voce reduz o caos antes do release.
            </p>
          </div>

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
              Selecionadas: <span className="font-semibold">{selected.size}</span>. Enviaveis para IA agora:{" "}
              <span className="font-semibold">{batchableSelectedIds.length}</span>. Denunciadas ficam fora da IA e devem ir para revisao humana.
            </div>
            <div className="mt-4 grid gap-2">
              <button
                disabled={!batchableSelectedIds.length || Boolean(busy)}
                onClick={() => void runSafely("Calculando dry-run da IA", async () => {
                  const preview = await previewQuestionBankAdminAiEnrichment({ questionIds: batchableSelectedIds });
                  setAiPreview(preview);
                  setNotice(`Dry-run: ${preview.selected} selecionadas, estimativa registrada antes de enfileirar.`);
                })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Ver custo/quantidade primeiro
              </button>
              <button
                disabled={!batchableSelectedIds.length || Boolean(busy)}
                onClick={() => void runSafely("Enfileirando lote para IA", async () => {
                  const result = await runQuestionBankAdminAiEnrichment({
                    maxNewJobs: batchableSelectedIds.length,
                    questionIds: batchableSelectedIds,
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
                      return item && !item.has_open_reports && !item.has_canonical_correction && !["completed", "cached"].includes(item.ai_request_status);
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
                  {items.map((item) => {
                    const questionReports = reportsByQuestionId.get(item.question_id) ?? EMPTY_REPORTS;
                    const isBroken = hasBrokenStructure(item);
                    return (
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
                                {blockerLabel(blocker)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {questionReports.length ? (
                          <div className="mt-2 space-y-1 rounded-lg border border-red-200 bg-white/70 p-2 text-[11px] text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                            <div className="font-semibold uppercase tracking-wide">
                              {questionReports.length} denuncia{questionReports.length === 1 ? "" : "s"} aberta{questionReports.length === 1 ? "" : "s"}
                            </div>
                            {questionReports.slice(0, 2).map((report) => (
                              <div key={report.id} className="leading-4">
                                <span className="font-semibold">{reportTypeLabel(report.report_type)}</span>
                                {report.severity ? <span> / {report.severity}</span> : null}
                                <span>: {reportReason(report)}</span>
                              </div>
                            ))}
                            {questionReports.length > 2 ? (
                              <div>+{questionReports.length - 2} outras denuncias abertas</div>
                            ) : null}
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
                        <div>{item.has_open_reports ? `${item.open_reports} reports abertos` : "sem reports abertos"}</div>
                        <div>{isBroken ? "quebrada/corrompida" : "estrutura sem alerta"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          {item.has_open_reports ? "Revisao humana" : isBroken ? "Corrigir estrutura" : actionLabel(item.recommended_action)}
                        </div>
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
                    );
                  })}
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
