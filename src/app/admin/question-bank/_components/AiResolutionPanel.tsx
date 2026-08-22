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
  ["without_correction", "Sem resolução"],
  ["queued", "IA em andamento"],
  ["completed", "Já processadas"],
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
      return "Revisão humana";
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
      return "gabarito não bate";
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
      return "média ausente";
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
    return "border-danger bg-surfaceMuted/40/40/10";
  }
  if (item.has_canonical_correction || ["completed", "cached"].includes(item.ai_request_status)) {
    return "border-success bg-surfaceMuted/40/40/10";
  }
  if (["queued", "running", "processing"].includes(item.ai_request_status)) {
    return "border-info bg-surfaceMuted/40/40/10";
  }
  return "border-edge";
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
      setError(err instanceof Error ? err.message : "Falha ao carregar demandas de resolução.");
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
      setNotice("Prioridade segura: denúncias abertas selecionadas para revisão humana.");
      return;
    }
    if (brokenIds.length) {
      selectIds(brokenIds);
      setNotice("Questões quebradas/corrompidas selecionadas para correção estrutural.");
      return;
    }
    if (safeAiIds.length) {
      selectIds(safeAiIds);
      setNotice("Lote seguro selecionado. Rode dry-run antes de enfileirar IA.");
      return;
    }
    if (blockedIds.length) {
      selectIds(blockedIds);
      setNotice("Bloqueios editoriais selecionados para revisão humana.");
      return;
    }
    if (processedCleanIds.length) {
      selectIds(processedCleanIds);
      setNotice("Questões processadas e sem alertas selecionadas para auditoria editorial/SQLite.");
      return;
    }
    setNotice("Nada acionável neste recorte. Cole IDs ou mude o filtro.");
  }

  const cards = [
    ["Pedidas por alunos", data?.summary.student_requested ?? 0, "demandas reais do aluno"],
    ["Sem resolução", data?.summary.without_correction ?? 0, "sem correção canônica"],
    ["IA em andamento", data?.summary.queued ?? 0, "fila ou running"],
    ["Já processadas", data?.summary.completed ?? 0, "completed/cache"],
    ["Bloqueadas", data?.summary.blocked ?? 0, "qualidade/revisao"],
    ["Quebradas", brokenIds.length, "estrutura/importacao"],
    ["Denunciadas", reports.length, "reports abertos"],
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-surface border border-edge bg-surface p-5 ">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="paper-eyebrow">Resolução IA</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Central leiga de resolução de questões</h1>
            <p className="mt-2 max-w-3xl text-sm text-ink">
              Veja o que alunos pediram, cole lotes de IDs e envie para IA sem aprovar conteúdo médico automaticamente.
              Pedido de resolução não é denúncia: reports continuam separados.
            </p>
          </div>
          <button
            onClick={() => void loadDemand(filter)}
            disabled={loading || Boolean(busy)}
            className="border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
        {error ? (
          <div className="mt-4 border border-danger bg-surfaceMuted px-4 py-3 text-sm text-danger/40/30">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 border border-success bg-surfaceMuted px-4 py-3 text-sm text-success/40/30">
            {notice}
          </div>
        ) : null}
        {busy ? (
          <div className="mt-4 border border-info bg-surfaceMuted px-4 py-3 text-sm text-info/40/30">
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
        <div className="border border-danger bg-surfaceMuted p-4 text-danger ">
          <div className="paper-eyebrow opacity-70">1. Segurança médica</div>
          <div className="mt-1 text-lg font-semibold">Denúncias primeiro</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Questões denunciadas ficam fora da IA em lote até revisão humana.
          </p>
          <button
            onClick={() => selectIds(reportedIds)}
            disabled={!reportedIds.length}
            className="mt-3 bg-danger px-3 py-2 text-xs font-semibold text-ink transition hover:bg-danger disabled:opacity-50"
          >
            Selecionar denunciadas ({reportedIds.length})
          </button>
        </div>
        <div className="border border-danger bg-surfaceMuted p-4 text-danger ">
          <div className="paper-eyebrow opacity-70">2. Importação quebrada</div>
          <div className="mt-1 text-lg font-semibold">Corrigir estrutura</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Sem enunciado, sem gabarito, alternativa vazia, ordem A/C/B/D ou banca/ano no texto.
          </p>
          <button
            onClick={() => selectIds(brokenIds)}
            disabled={!brokenIds.length}
            className="mt-3 bg-danger px-3 py-2 text-xs font-semibold text-ink transition hover:bg-danger disabled:opacity-50"
          >
            Selecionar quebradas ({brokenIds.length})
          </button>
        </div>
        <div className="border border-info bg-surfaceMuted p-4 text-info ">
          <div className="paper-eyebrow opacity-70">3. Lote seguro</div>
          <div className="mt-1 text-lg font-semibold">Pode mandar para IA</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Sem denúncia, sem bloqueio, sem correção pronta e sem job rodando.
          </p>
          <button
            onClick={() => selectIds(safeAiIds)}
            disabled={!safeAiIds.length}
            className="mt-3 bg-info px-3 py-2 text-xs font-semibold text-ink transition hover:bg-info disabled:opacity-50"
          >
            Selecionar lote seguro ({safeAiIds.length})
          </button>
        </div>
        <div className="border border-warning bg-surfaceMuted p-4 text-warning ">
          <div className="paper-eyebrow opacity-70">4. Revisão humana</div>
          <div className="mt-1 text-lg font-semibold">Bloqueios editoriais</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Estrutura ruim, reports ou qualidade incerta devem virar fila humana.
          </p>
          <button
            onClick={() => selectIds([...new Set([...reportedIds, ...brokenIds, ...blockedIds])])}
            disabled={!reportedIds.length && !brokenIds.length && !blockedIds.length}
            className="mt-3 bg-warning px-3 py-2 text-xs font-semibold text-ink transition hover:bg-warning disabled:opacity-50"
          >
            Selecionar revisão ({new Set([...reportedIds, ...brokenIds, ...blockedIds]).size})
          </button>
        </div>
        <div className="border border-success bg-surfaceMuted p-4 text-success ">
          <div className="paper-eyebrow opacity-70">5. Valor editorial</div>
          <div className="mt-1 text-lg font-semibold">Prontas para gate/SQLite</div>
          <p className="mt-1 text-xs leading-5 opacity-80">
            IA rodada não aprova sozinha: daqui ainda passa por auditoria e gate médico.
          </p>
          <button
            onClick={() => selectIds(processedCleanIds)}
            disabled={!processedCleanIds.length}
            className="mt-3 bg-success px-3 py-2 text-xs font-semibold text-ink transition hover:bg-success disabled:opacity-50"
          >
            Selecionar processadas ({processedCleanIds.length})
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-surface border border-edge bg-surface p-5 ">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">Modo leigo: o que fazer agora</div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Use de cima para baixo: resolva denúncias, corrija questões quebradas, rode IA nos lotes seguros, mande bloqueios para revisão,
                  e só depois pense em publicar no catálogo SQLite.
                </p>
              </div>
              <span className="border border-edge px-2.5 py-1 text-micro font-semibold text-muted">
                {selected.size} selecionadas
              </span>
            </div>
            <button
              onClick={selectRecommendedNextBatch}
              className="mt-4 w-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper"
            >
              Escolher próximo lote seguro automaticamente
            </button>
            <ol className="mt-4 space-y-2 text-xs text-ink">
              <li><span className="font-semibold">Denunciada?</span> Não envie para IA em lote; mande para revisão humana e leia o motivo.</li>
              <li><span className="font-semibold">Quebrada?</span> Corrija importação/estrutura antes: IA não salva questão sem enunciado, gabarito ou alternativas boas.</li>
              <li><span className="font-semibold">Sem resolução e sem bloqueio?</span> Selecione lote seguro e rode dry-run antes de enfileirar.</li>
              <li><span className="font-semibold">Já processada?</span> Ignore, salvo se você marcou reprocessar conscientemente.</li>
              <li><span className="font-semibold">SQLite?</span> IA rodada ajuda, mas a entrada no catálogo depende de revisão humana/versionada e gate médico.</li>
            </ol>
          </div>

          <div className="border border-success bg-surface p-5 ">
            <div className="text-sm font-semibold text-ink">Saída editorial / SQLite</div>
            <p className="mt-1 text-xs leading-5 text-muted">
              Esta tela prepara valor editorial; ela não publica sozinha. Para uma questão entrar no catálogo SQLite do aluno,
              precisa estar sem denúncia aberta, sem bloqueio, com IA/resolução útil quando necessário e revisão humana versionada.
            </p>
            <div className="mt-4 grid gap-2 text-xs text-ink">
              <div className="flex items-center justify-between border border-edge px-3 py-2">
                <span>Sem denúncia aberta</span>
                <span className="font-semibold">{items.length - reportedIds.length}/{items.length || 0}</span>
              </div>
              <div className="flex items-center justify-between border border-edge px-3 py-2">
                <span>Sem bloqueio de qualidade</span>
                <span className="font-semibold">{items.length - blockedIds.length}/{items.length || 0}</span>
              </div>
              <div className="flex items-center justify-between border border-edge px-3 py-2">
                <span>Sem quebra estrutural/importação</span>
                <span className="font-semibold">{items.length - brokenIds.length}/{items.length || 0}</span>
              </div>
              <div className="flex items-center justify-between border border-edge px-3 py-2">
                <span>Processadas e limpas para auditoria</span>
                <span className="font-semibold">{processedCleanIds.length}</span>
              </div>
            </div>
            <p className="mt-3 text-micro leading-5 text-muted">
              Transferir para SQLite continua sendo operação do publisher/gate médico; aqui você reduz o caos antes do release.
            </p>
          </div>

          <div className="rounded-surface border border-edge bg-surface p-5 ">
            <div className="text-sm font-semibold text-ink">Filtros prontos</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilter(value);
                    void loadDemand(value);
                  }}
                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                    filter === value
                      ? "border-edge bg-paper text-ink"
                      : "border-edge text-ink hover:bg-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-surface border border-edge bg-surface p-5 ">
            <label className="text-sm font-semibold text-ink" htmlFor="ai-resolution-ids">
              Colar IDs de questões
            </label>
            <p className="mt-1 text-xs text-muted">
              Pode colar um por linha, separado por espaço, vírgula ou ponto-e-vírgula.
            </p>
            <textarea
              id="ai-resolution-ids"
              value={pastedIds}
              onChange={(event) => setPastedIds(event.target.value)}
              rows={7}
              className="mt-3 w-full rounded-control border border-edge bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-edge"
              placeholder="question_id_1&#10;question_id_2"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void loadDemand("all", parseIds(pastedIds))}
                disabled={loading || parseIds(pastedIds).length === 0}
                className="bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-50"
              >
                Classificar IDs
              </button>
              <button
                onClick={() => setSelected(new Set(eligibleIds))}
                disabled={!items.length}
                className="border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
              >
                Selecionar elegíveis
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={!selected.size}
                className="border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
              >
                Limpar seleção
              </button>
            </div>
            {data?.missing_question_ids.length ? (
              <div className="mt-3 border border-warning bg-surfaceMuted p-3 text-xs text-warning/40/30">
                IDs não encontrados: {data.missing_question_ids.join(", ")}
              </div>
            ) : null}
          </div>

          <div className="rounded-surface border border-edge bg-surface p-5 ">
            <div className="text-sm font-semibold text-ink">Ação em lote</div>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeProcessed}
                onChange={(event) => setIncludeProcessed(event.target.checked)}
              />
              Reprocessar também já processadas
            </label>
            <div className="mt-3 text-xs text-muted">
              Selecionadas: <span className="font-semibold">{selected.size}</span>. Enviáveis para IA agora:{" "}
              <span className="font-semibold">{batchableSelectedIds.length}</span>. Denunciadas ficam fora da IA e devem ir para revisão humana.
            </div>
            <div className="mt-4 grid gap-2">
              <button
                disabled={!batchableSelectedIds.length || Boolean(busy)}
                onClick={() => void runSafely("Calculando dry-run da IA", async () => {
                  const preview = await previewQuestionBankAdminAiEnrichment({ questionIds: batchableSelectedIds });
                  setAiPreview(preview);
                  setNotice(`Dry-run: ${preview.selected} selecionadas, estimativa registrada antes de enfileirar.`);
                })}
                className="border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
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
                className="bg-info px-4 py-2 text-sm font-semibold text-ink transition hover:bg-info disabled:opacity-50"
              >
                Enviar lote para IA
              </button>
              <button
                disabled={!selected.size || Boolean(busy)}
                onClick={() => void runSafely("Mandando para revisão humana", async () => {
                  const result = await routeQuestionBankEditorialBatch(selectedIds, "editorial_review");
                  setNotice(`${result.count} questões roteadas para revisão humana.`);
                })}
                className="bg-warning px-4 py-2 text-sm font-semibold text-ink transition hover:bg-warning disabled:opacity-50"
              >
                Mandar para revisão humana
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
                className="border border-edge px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
              >
                Ignorar ja processadas
              </button>
            </div>
          </div>

          {aiPreview ? <JsonPanel title="Resultado / dry-run do lote" value={aiPreview} /> : null}
          {detail ? <JsonPanel title={`Detalhes ${detail.id}`} value={detail} /> : null}
        </div>

        <div className="rounded-control border border-edge bg-surface ">
          <div className="flex items-center justify-between gap-3 border-b border-edge p-4">
            <div>
              <div className="text-sm font-semibold text-ink">Fila de resolução</div>
              <div className="text-xs text-muted">{items.length} itens carregados</div>
            </div>
            <button
              disabled={!items.length}
              onClick={() => {
                const allSelected = items.every((item) => selected.has(item.question_id));
                setSelected(allSelected ? new Set() : new Set(items.map((item) => item.question_id)));
              }}
              className="border border-edge px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-50"
            >
              {items.every((item) => selected.has(item.question_id)) ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>
          <div className="max-h-[760px] overflow-auto">
            {items.length ? (
              <table className="min-w-full divide-y divide-edge text-sm">
                <thead className="paper-eyebrow sticky top-0 bg-surface text-left">
                  <tr>
                    <th className="px-3 py-3">Sel.</th>
                    <th className="px-3 py-3">Questão</th>
                    <th className="px-3 py-3">Demanda</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Ação</th>
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
                        <div className="text-xs font-semibold text-ink">{item.question_id}</div>
                        <div className="mt-1 max-w-xl text-xs leading-5 text-ink">
                          {item.stem_preview || "Sem enunciado disponível neste recorte."}
                        </div>
                        {item.quality_blockers.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.quality_blockers.map((blocker) => (
                              <span key={blocker} className="bg-surfaceMuted px-2 py-0.5 text-micro font-semibold text-danger/40">
                                {blockerLabel(blocker)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {questionReports.length ? (
                          <div className="mt-2 space-y-1 border border-danger bg-surface p-2 text-micro text-danger/50/20">
                            <div className="paper-eyebrow">
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
                              <div>+{questionReports.length - 2} outras denúncias abertas</div>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-ink">
                        <div>{item.request_count} pedidos</div>
                        <div>{item.unique_users} alunos</div>
                        <div>{item.latest_requested_at ? formatRelativeTime(new Date(item.latest_requested_at)) : "sem data"}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink">
                        <div className="font-semibold">{statusLabel(item.ai_request_status)}</div>
                        <div>{item.has_canonical_correction ? "correção canônica existe" : "sem correção canônica"}</div>
                        <div>{item.has_open_reports ? `${item.open_reports} reports abertos` : "sem reports abertos"}</div>
                        <div>{isBroken ? "quebrada/corrompida" : "estrutura sem alerta"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold text-ink">
                          {item.has_open_reports ? "Revisão humana" : isBroken ? "Corrigir estrutura" : actionLabel(item.recommended_action)}
                        </div>
                        <button
                          onClick={() => void runSafely("Carregando detalhes", async () => {
                            setDetail(await getQuestionBankAdminQuestion(item.question_id));
                          })}
                          className="mt-2 border border-edge px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface"
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
              <div className="p-8 text-center text-sm text-muted">
                Nenhuma questão neste recorte. Cole IDs ou mude o filtro.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
