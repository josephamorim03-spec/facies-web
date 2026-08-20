"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createQuestionBankAiRollout,
  decideQuestionBankAiDraft,
  getQuestionBankAdminAiPreflight,
  getQuestionBankAdminAiCosts,
  decideQuestionBankEditorialReview,
  getQuestionBankAiDrafts,
  getQuestionBankAdminQuestion,
  getQuestionBankEditorialIntelligenceCoverage,
  getQuestionBankEditorialQueue,
  getQuestionBankObservedItemQuality,
  previewQuestionBankAdminAiEnrichment,
  requestQuestionBankEditorialAnalysis,
  runQuestionBankAdminAiEnrichment,
  requestQuestionBankEditorialBatch,
  routeQuestionBankEditorialBatch,
  updateQuestionBankQuestionStatus,
  type QuestionBankAdminQuestionDetail,
  type QuestionBankAiDraft,
  type QuestionBankAiCostSummary,
  type QuestionBankAiEnrichmentResult,
  type QuestionBankAiPreflight,
  type QuestionBankEditorialBatchPreview,
  type QuestionBankEditorialIntelligenceCoverage,
  type QuestionBankEditorialReview,
  type QuestionBankObservedItemQuality,
} from "@/lib/api/domains/question-bank-admin";

const LANES = [
  ["", "Todas as lanes"],
  ["integrity_answer", "Integridade e gabarito"],
  ["difficulty_level", "Nível / dificuldade"],
  ["item_construction", "Construção do item"],
  ["pedagogical_value", "Valor pedagógico"],
  ["student_reports", "Denúncias"],
  ["ai_draft", "Rascunhos da IA"],
  ["taxonomy_metadata", "Taxonomia e metadados"],
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  medical_integrity: "Integridade médica e gabarito",
  item_construction: "Qualidade de construção",
  pedagogical_alignment: "Alinhamento pedagógico",
  psychometric_evidence: "Nível e evidência psicométrica",
  provenance_freshness: "Proveniência e atualidade",
};

const ADMIN_PANEL = "rounded-surface border border-edge bg-surface";
const ADMIN_CONTROL = "paper-control border border-edge bg-surface px-3 py-2 text-sm text-ink";
const ADMIN_BUTTON = "paper-control border border-edge px-4 py-2 text-sm font-semibold text-ink hover:bg-surfaceMuted disabled:opacity-50";
const ADMIN_BUTTON_SM = "paper-control border border-edge px-3 py-2 text-sm font-semibold text-ink hover:bg-surfaceMuted disabled:opacity-50";
const ADMIN_PRIMARY_BUTTON = "paper-control border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk hover:brightness-[1.04] disabled:opacity-50";
const ADMIN_PRIMARY_BUTTON_SM = "paper-control border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primaryInk hover:brightness-[1.04] disabled:opacity-50";
const ADMIN_DANGER_BUTTON = "paper-control border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-surfaceMuted disabled:opacity-50";
const ADMIN_WARNING_BUTTON = "paper-control border border-warning px-4 py-2 text-sm font-semibold text-warning hover:bg-surfaceMuted disabled:opacity-50";
const ADMIN_CHIP = "rounded-control border border-edge bg-paper px-2 py-0.5 text-[11px] text-muted";

function stateTone(state?: string | null): string {
  if (state === "blocked" || state === "fail" || state === "critical") return "border-danger bg-danger/5 text-danger";
  if (state === "needs_review" || state === "warning" || state === "high") return "border-warning bg-warning/5 text-warning";
  if (state === "ready" || state === "pass" || state === "low") return "border-success bg-success/5 text-success";
  return "border-edge bg-surfaceMuted text-muted";
}

function percent(value: number | null | undefined): string {
  return value == null ? "sem amostra" : `${Math.round(value * 100)}%`;
}

function moneyBrl(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `R$ ${n.toFixed(2)}` : "R$ 0.00";
}

function ageLabel(value: string | null): string {
  if (!value) return "sem data";
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed)) return "sem data";
  const hours = Math.max(0, Math.floor(elapsed / 3_600_000));
  return hours < 24 ? `${hours}h na fila` : `${Math.floor(hours / 24)}d na fila`;
}

function priorityReason(item: QuestionBankEditorialReview, observed?: QuestionBankObservedItemQuality): string {
  if (observed?.flags.includes("negative_discrimination")) return "discriminação negativa no mesmo formulário";
  if (item.overall_state === "blocked") return "gate editorial bloqueante";
  if (item.open_reports > 0) return `${item.open_reports} denúncia(s) aberta(s)`;
  if (Object.values(item.dimensions ?? {}).some((dimension) => dimension.state === "fail")) return "dimensão editorial reprovada";
  if (!item.review_id) return "ainda sem análise editorial";
  return "evidência ou decisão humana pendente";
}

export default function AiReviewPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [lane, setLane] = useState(searchParams.get("lane") ?? "");
  const [priority, setPriority] = useState(searchParams.get("priority") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [board, setBoard] = useState(searchParams.get("banca") ?? "");
  const [year, setYear] = useState(searchParams.get("ano") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("dificuldade") ?? "");
  const [specialty, setSpecialty] = useState(searchParams.get("especialidade") ?? "");
  const [onlyMismatch, setOnlyMismatch] = useState(searchParams.get("divergencia") === "1");
  const [onlyHumanPending, setOnlyHumanPending] = useState(searchParams.get("pendencia_humana") === "1");
  const [onlyAiPending, setOnlyAiPending] = useState(searchParams.get("pendencia_ia") === "1");
  const [items, setItems] = useState<QuestionBankEditorialReview[]>([]);
  const [aiDrafts, setAiDrafts] = useState<QuestionBankAiDraft[]>([]);
  const [aiCoverage, setAiCoverage] = useState<QuestionBankEditorialIntelligenceCoverage | null>(null);
  const [aiCosts, setAiCosts] = useState<QuestionBankAiCostSummary | null>(null);
  const [aiPreflight, setAiPreflight] = useState<QuestionBankAiPreflight | null>(null);
  const [pilotPreview, setPilotPreview] = useState<QuestionBankAiEnrichmentResult | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [quality, setQuality] = useState<Record<string, QuestionBankObservedItemQuality>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<QuestionBankEditorialReview | null>(null);
  const [detail, setDetail] = useState<QuestionBankAdminQuestionDetail | null>(null);
  const [note, setNote] = useState("");
  const [patchText, setPatchText] = useState("{}");
  const [batchPreview, setBatchPreview] = useState<QuestionBankEditorialBatchPreview | null>(null);
  const [routeLane, setRouteLane] = useState("editorial_review");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const syncUrl = useCallback((values: Record<string, string | boolean>) => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "curadoria");
    for (const [key, value] of Object.entries(values)) {
      if (value === "" || value === false) params.delete(key);
      else params.set(key, value === true ? "1" : String(value));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queue, evidence, coverage, drafts, costs] = await Promise.all([
        getQuestionBankEditorialQueue({ q, lane, priority, status, limit: 100 }),
        getQuestionBankObservedItemQuality().catch(() => ({ min_attempts: 30, items_analyzed: 0, items: [] })),
        getQuestionBankEditorialIntelligenceCoverage().catch(() => null),
        getQuestionBankAiDrafts({ status: "pending_review", limit: 20 }).catch(() => ({ drafts: [] })),
        getQuestionBankAdminAiCosts(30).catch(() => null),
      ]);
      setItems(queue.items);
      setTotal(queue.total);
      setQuality(Object.fromEntries(evidence.items.map((item) => [item.question_id, item])));
      setAiCoverage(coverage);
      setAiDrafts(drafts.drafts);
      setAiCosts(costs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar a fila editorial.");
    } finally {
      setLoading(false);
    }
  }, [lane, priority, q, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    syncUrl({ q, lane, priority, status, banca: board, ano: year, especialidade: specialty, dificuldade: difficulty, divergencia: onlyMismatch, pendencia_humana: onlyHumanPending, pendencia_ia: onlyAiPending });
  }, [board, difficulty, lane, onlyAiPending, onlyHumanPending, onlyMismatch, priority, q, specialty, status, syncUrl, year]);

  const visibleItems = useMemo(() => items.filter((item) => {
    const observed = quality[item.question_id];
    const predicted = item.difficulty_assessment?.predicted_score ?? item.difficulty_estimate;
    const mismatch = observed?.observed_difficulty != null && predicted != null
      ? Math.abs(observed.observed_difficulty - predicted) >= 0.2
      : false;
    return (!board || item.board_code?.toLowerCase().includes(board.toLowerCase()))
      && (!year || String(item.year ?? "") === year)
      && (!specialty || item.primary_node_name?.toLowerCase().includes(specialty.toLowerCase()))
      && (!difficulty || item.difficulty_assessment?.intended_level === difficulty)
      && (!onlyMismatch || mismatch)
      && (!onlyHumanPending || item.review_status === "draft_ready")
      && (!onlyAiPending || item.review_status === "queued" || item.review_status === "running" || item.review_status === "failed");
  }), [board, difficulty, items, onlyAiPending, onlyHumanPending, onlyMismatch, quality, specialty, year]);

  async function openItem(item: QuestionBankEditorialReview) {
    setActive(item);
    setDetail(null);
    setNote("");
    setPatchText(JSON.stringify(item.proposed_patch ?? {}, null, 2));
    try {
      setDetail(await getQuestionBankAdminQuestion(item.question_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir a questão.");
    }
  }

  async function analyzeOne(questionId: string) {
    setBusy(questionId);
    setError(null);
    try {
      await requestQuestionBankEditorialAnalysis(questionId);
      setNotice("Novo rascunho criado; nenhuma alteração foi publicada.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na análise editorial.");
    } finally {
      setBusy("");
    }
  }

  async function decide(action: "approve" | "reject" | "request_changes" | "specialist_review") {
    if (!active?.review_id) return;
    if (action === "reject" && !note.trim()) {
      setError("Informe o motivo da rejeição para preservar a auditoria editorial.");
      return;
    }
    let acceptedPatch: Record<string, unknown> | undefined;
    if (action === "approve") {
      try {
        acceptedPatch = JSON.parse(patchText) as Record<string, unknown>;
      } catch {
        setError("O patch editado não é um JSON válido.");
        return;
      }
    }
    setBusy(active.review_id);
    setError(null);
    try {
      await decideQuestionBankEditorialReview(active.review_id, action, { note, acceptedPatch });
      setNotice(action === "approve" ? "Rascunho aprovado e auditado; a publicação não foi alterada." : "Decisão editorial registrada.");
      setActive(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar a decisão.");
    } finally {
      setBusy("");
    }
  }

  async function previewBatch() {
    if (!selected.size) return;
    setBusy("batch-preview");
    try {
      const result = await requestQuestionBankEditorialBatch([...selected], true);
      setBatchPreview(result as QuestionBankEditorialBatchPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao estimar o lote.");
    } finally {
      setBusy("");
    }
  }

  async function runBatch() {
    if (!batchPreview) return;
    setBusy("batch-run");
    try {
      await requestQuestionBankEditorialBatch(batchPreview.question_ids, false);
      setNotice(`${batchPreview.count} análise(s) concluída(s) como rascunho.`);
      setBatchPreview(null);
      setSelected(new Set());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao executar o lote.");
    } finally {
      setBusy("");
    }
  }

  async function routeBatch() {
    if (!selected.size) return;
    setBusy("batch-route");
    try {
      const result = await routeQuestionBankEditorialBatch([...selected], routeLane);
      setNotice(`${result.count} rascunho(s) encaminhado(s) para a lane selecionada.`);
      setSelected(new Set());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao encaminhar o lote.");
    } finally {
      setBusy("");
    }
  }

  async function decideAiDraft(
    draft: QuestionBankAiDraft,
    action: "approve" | "reject" | "request_changes",
  ) {
    const key = `${draft.question_id}:${draft.draft_kind}`;
    const draftNote = draftNotes[key]?.trim() ?? "";
    if (action !== "approve" && !draftNote) {
      setError("Informe a justificativa para rejeitar ou solicitar ajustes.");
      return;
    }
    setBusy(key);
    setError(null);
    try {
      await decideQuestionBankAiDraft(draft.question_id, draft.draft_kind, {
        action,
        note: draftNote || undefined,
        evidenceCorpusVersion: draft.evidence_corpus_version,
      });
      setNotice(action === "approve" ? "Artefato aprovado e auditado." : "Decisao do artefato registrada.");
      setDraftNotes((current) => ({ ...current, [key]: "" }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao decidir o artefato de IA.");
    } finally {
      setBusy("");
    }
  }

  async function runAiPreflight() {
    setBusy("ai-preflight");
    setError(null);
    try {
      const result = await getQuestionBankAdminAiPreflight(100);
      setAiPreflight(result);
      setNotice(
        result.status === "ready"
          ? "Preflight aprovado para o piloto governado."
          : "Preflight exige atenção antes de consumir IA.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no preflight de IA.");
    } finally {
      setBusy("");
    }
  }

  async function previewAiPilot() {
    setBusy("ai-preview");
    setError(null);
    try {
      const result = await previewQuestionBankAdminAiEnrichment({
        selectionLimit: 100,
        costCapBrl: 25,
        requestedCapabilities: ["microcompetency"],
      });
      setPilotPreview(result);
      setNotice("Piloto simulado sem criar jobs.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao simular o piloto.");
    } finally {
      setBusy("");
    }
  }

  async function startAiPilot() {
    setBusy("ai-pilot");
    setError(null);
    try {
      const preflight = await getQuestionBankAdminAiPreflight(100);
      setAiPreflight(preflight);
      if (preflight.status !== "ready") {
        throw new Error("O preflight não está pronto. Corrija archive, storage, pipeline ou projeção antes do piloto.");
      }
      const rollout = await createQuestionBankAiRollout({
        scope: "pilot_micro_dna_100",
        costCapBrl: 25,
        hardStopFraction: 0.8,
        visibilityPolicy: "approved_only",
        metadata: { capabilities: ["microcompetency", "question_dna"], pilot_size: 100 },
      });
      const result = await runQuestionBankAdminAiEnrichment({
        rolloutId: rollout.rollout_id,
        costCapBrl: 25,
        maxNewJobs: 100,
        selectionLimit: 100,
        requestedCapabilities: ["microcompetency"],
      });
      setPilotPreview(result);
      setNotice(`Piloto governado criado: ${result.enqueued} questões enfileiradas.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar o piloto.");
    } finally {
      setBusy("");
    }
  }

  async function changeCanonicalStatus(action: "unpublish" | "block") {
    if (!active) return;
    if (!note.trim()) {
      setError("Informe a justificativa antes de bloquear ou despublicar.");
      return;
    }
    setBusy(`status-${action}`);
    try {
      await updateQuestionBankQuestionStatus(active.question_id, action, { reason: note });
      setNotice(action === "block" ? "Questão bloqueada para novas sessões." : "Questão despublicada para novas sessões.");
      setActive(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar o estado canônico.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-4">
      <header className={`${ADMIN_PANEL} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="paper-eyebrow">Workbench editorial</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">Curadoria e nível das questões</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Uma fila para evidência médica, construção, valor pedagógico e dificuldade. A IA produz somente rascunhos versionados para decisão humana.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void refresh()} className={ADMIN_BUTTON}>Atualizar</button>
            <select aria-label="Lane do lote" value={routeLane} onChange={(event) => setRouteLane(event.target.value)} className={ADMIN_CONTROL}>{LANES.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" disabled={!selected.size || Boolean(busy)} onClick={() => void routeBatch()} className={ADMIN_BUTTON}>Encaminhar ({selected.size})</button>
            <button type="button" disabled={!selected.size || Boolean(busy)} onClick={() => void previewBatch()} className={ADMIN_PRIMARY_BUTTON}>Analisar seleção ({selected.size})</button>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar no enunciado" className={ADMIN_CONTROL} />
          <select value={lane} onChange={(event) => setLane(event.target.value)} className={ADMIN_CONTROL}>{LANES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className={ADMIN_CONTROL}><option value="">Todas as prioridades</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={ADMIN_CONTROL}><option value="">Todos os estados de IA</option><option value="draft_ready">Rascunho pronto</option><option value="running">Rodando</option><option value="failed">Falhou</option><option value="stale">Obsoleto</option><option value="approved">Aprovado</option><option value="rejected">Rejeitado</option></select>
          <input value={board} onChange={(event) => setBoard(event.target.value)} placeholder="Banca" className={ADMIN_CONTROL} />
          <input value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ano" className={ADMIN_CONTROL} />
          <input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Especialidade" className={ADMIN_CONTROL} />
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={ADMIN_CONTROL}><option value="">Toda dificuldade pretendida</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option><option value="very_hard">Muito difícil</option><option value="unverifiable">Não verificável</option></select>
          <label className={`${ADMIN_CONTROL} flex items-center gap-2`}><input type="checkbox" checked={onlyMismatch} onChange={(event) => setOnlyMismatch(event.target.checked)} /> Divergência ≥ 0,20</label>
          <label className={`${ADMIN_CONTROL} flex items-center gap-2`}><input type="checkbox" checked={onlyHumanPending} onChange={(event) => setOnlyHumanPending(event.target.checked)} /> Decisão humana pendente</label>
          <label className={`${ADMIN_CONTROL} flex items-center gap-2`}><input type="checkbox" checked={onlyAiPending} onChange={(event) => setOnlyAiPending(event.target.checked)} /> IA pendente ou falhou</label>
        </div>
      </header>

      {notice ? <div className="rounded-surface border border-success bg-success/5 p-3 text-sm text-success">{notice}</div> : null}
      {error ? <div className="rounded-surface border border-danger bg-danger/5 p-3 text-sm text-danger">{error} <button type="button" onClick={() => void refresh()} className="ml-2 font-semibold underline">Tentar novamente</button></div> : null}

      {aiCoverage ? <section className="border-y border-edge py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><div className="text-xs text-muted">DNA canônico</div><strong>{aiCoverage.questions.with_question_dna.toLocaleString("pt-BR")}</strong></div>
          <div><div className="text-xs text-muted">Com microcompetência</div><strong>{aiCoverage.questions.with_microcompetency.toLocaleString("pt-BR")}</strong></div>
          <div><div className="text-xs text-muted">Artefatos validados</div><strong>{(aiCoverage.validation.valid ?? 0).toLocaleString("pt-BR")}</strong></div>
          <div><div className="text-xs text-muted">Ainda não validados</div><strong>{(aiCoverage.validation.unvalidated ?? 0).toLocaleString("pt-BR")}</strong></div>
          <div><div className="text-xs text-muted">Bloqueados pelo validador</div><strong>{(aiCoverage.validation.blocked ?? 0).toLocaleString("pt-BR")}</strong></div>
        </div>
      </section> : null}

      {aiCosts ? <section className="border-b border-edge pb-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted">Custo real 30d</div>
            <strong>{moneyBrl(aiCosts.rollout.reduce((sum, rollout) => sum + Number(rollout.cost_state?.actual_brl ?? 0), 0) ?? 0)}</strong>
          </div>
          <div>
            <div className="text-xs text-muted">Reservado agora</div>
            <strong>{moneyBrl(aiCosts.rollout.reduce((sum, rollout) => sum + Number(rollout.cost_state?.reserved_brl ?? 0), 0) ?? 0)}</strong>
          </div>
          <div>
            <div className="text-xs text-muted">Último rollout</div>
            <strong>{aiCosts.rollout?.[0]?.status ?? "sem lote"}</strong>
            <div className="mt-1 truncate text-xs text-muted">{aiCosts.rollout?.[0]?.scope ?? "nenhum escopo recente"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Stop-loss do último</div>
            <strong>{moneyBrl(aiCosts.rollout?.[0]?.cost_state?.stop_brl)}</strong>
            <div className="mt-1 text-xs text-muted">{aiCosts.rollout?.[0]?.cost_state?.allowed === false ? "pausado ou bloqueado" : "liberado pelo orçamento"}</div>
          </div>
        </div>
      </section> : null}

      <details className="group rounded-surface border border-edge bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink sm:px-5">
          <span>Piloto governado Micro + DNA</span>
          <span className="text-muted transition group-open:rotate-90" aria-hidden="true">&gt;</span>
        </summary>
        <div className="space-y-4 border-t border-edge p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-relaxed text-muted">100 questões, conteúdo aprovado apenas, teto de R$ 25 e pausa em 80%.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => void runAiPreflight()} className={ADMIN_BUTTON_SM}>Executar preflight</button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void previewAiPilot()} className={ADMIN_BUTTON_SM}>Simular 100</button>
              <button type="button" disabled={Boolean(busy) || aiPreflight?.status !== "ready"} onClick={() => void startAiPilot()} className={ADMIN_PRIMARY_BUTTON_SM}>Iniciar piloto</button>
            </div>
          </div>
        {aiPreflight ? <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="text-muted">Estado</span><div className="font-semibold">{aiPreflight.status}</div></div>
          <div><span className="text-muted">R2 de evidências</span><div className="font-semibold">{aiPreflight.analysis_archive.ready ? "pronto" : "pendente"}</div></div>
          <div><span className="text-muted">Storage</span><div className="font-semibold">{aiPreflight.storage.state ?? "desconhecido"}</div></div>
          <div><span className="text-muted">Jobs de IA</span><div className="font-semibold">{String(aiPreflight.pipeline.pending_ai_jobs ?? 0)}</div></div>
        </div> : null}
        {pilotPreview ? <div className="text-sm text-muted">
          Selecionadas {pilotPreview.selected.toLocaleString("pt-BR")}; enfileiradas {pilotPreview.enqueued.toLocaleString("pt-BR")}; custo estimado R$ {(pilotPreview.cost_estimate?.estimated_cost_brl ?? 0).toFixed(2)}.
        </div> : null}
        </div>
      </details>

      {aiDrafts.length ? <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Artefatos de IA aguardando curadoria</h2><span className="text-sm text-muted">{aiDrafts.length} mais antigos</span></div>
        <div className="grid gap-3">
          {aiDrafts.map((draft) => {
            const key = `${draft.question_id}:${draft.draft_kind}`;
            const errors = draft.validation_report?.errors ?? [];
            const warnings = draft.validation_report?.warnings ?? [];
            return <article key={`${draft.rollout_id}:${key}`} className={`${ADMIN_PANEL} p-4`}>
              <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{draft.draft_kind}</strong><span className={`rounded-control border px-2 py-0.5 text-xs ${errors.length ? stateTone("blocked") : warnings.length ? stateTone("warning") : stateTone("ready")}`}>{errors.length ? "bloqueado" : warnings.length ? "com alertas" : "validado"}</span><span className="text-xs text-muted">v{draft.question_version}</span></div>
              <p className="mt-2 line-clamp-2 font-serif text-sm">{draft.stem_preview}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold">Revisar artefato</summary>
                {errors.length ? <ul className="mt-2 list-disc pl-5 text-sm text-danger">{errors.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {warnings.length ? <ul className="mt-2 list-disc pl-5 text-sm text-warning">{warnings.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                <pre className="mt-3 max-h-72 overflow-auto rounded-surface bg-paper p-3 text-xs">{JSON.stringify(draft.payload, null, 2)}</pre>
                <textarea value={draftNotes[key] ?? ""} onChange={(event) => setDraftNotes((current) => ({ ...current, [key]: event.target.value }))} rows={2} placeholder="Nota editorial" className="mt-3 w-full rounded-surface border border-edge bg-transparent p-2 text-sm" />
                <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy) || errors.length > 0} onClick={() => void decideAiDraft(draft, "approve")} className={ADMIN_PRIMARY_BUTTON_SM}>Aprovar</button><button type="button" disabled={Boolean(busy)} onClick={() => void decideAiDraft(draft, "request_changes")} className={ADMIN_BUTTON_SM}>Solicitar ajustes</button><button type="button" disabled={Boolean(busy)} onClick={() => void decideAiDraft(draft, "reject")} className="paper-control border border-danger px-3 py-2 text-sm font-semibold text-danger disabled:opacity-50">Rejeitar</button></div>
              </details>
            </article>;
          })}
        </div>
      </section> : null}

      <div className="flex items-center justify-between text-sm text-muted"><span>{visibleItems.length} exibidas de {total}</span><span>Dificuldade observada aparece com ≥ 30 usuários únicos</span></div>
      {loading ? <div className="h-48 animate-pulse rounded-surface bg-surfaceMuted" aria-busy="true" /> : visibleItems.length === 0 ? <div className="rounded-surface border border-dashed border-edge p-12 text-center text-sm text-muted">Nenhuma questão corresponde aos filtros.</div> : (
        <div className="grid gap-3">
          {visibleItems.map((item) => {
            const observed = quality[item.question_id];
            const predicted = item.difficulty_assessment?.predicted_score ?? item.difficulty_estimate;
            const mismatch = observed?.observed_difficulty != null && predicted != null && Math.abs(observed.observed_difficulty - predicted) >= 0.2;
            return <article key={item.question_id} className={`${ADMIN_PANEL} p-4`}>
              <div className="flex gap-3">
                <input aria-label="Selecionar questão" type="checkbox" checked={selected.has(item.question_id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(item.question_id); else next.delete(item.question_id); return next; })} className="mt-1" />
                <button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-control border px-2 py-0.5 text-[11px] font-semibold ${stateTone(item.priority)}`}>{item.priority ?? "sem prioridade"}</span>
                    <span className={ADMIN_CHIP}>{LANES.find(([value]) => value === item.lane)?.[1] ?? item.lane ?? "Triagem editorial"}</span>
                    {mismatch ? <span className="rounded-control border border-danger bg-danger/5 px-2 py-0.5 text-[11px] font-semibold text-danger">difficulty_mismatch</span> : null}
                    {observed?.flags.includes("negative_discrimination") ? <span className="rounded-control border border-danger bg-danger/5 px-2 py-0.5 text-[11px] font-semibold text-danger">discriminação negativa</span> : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-warning">Prioridade: {priorityReason(item, observed)}</p>
                  <p className="mt-2 line-clamp-2 font-serif text-sm leading-relaxed text-ink">{item.stem_preview}</p>
                  <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3 lg:grid-cols-6">
                    <span>{[item.board_code, item.year].filter(Boolean).join(" · ") || item.institution || "fonte incompleta"}</span>
                    <span>Pretendida: {item.difficulty_assessment?.intended_level ?? "não definida"}</span>
                    <span>IA: {percent(predicted)}</span>
                    <span>Observada: {percent(observed?.observed_difficulty)} {observed ? `(n=${observed.unique_users})` : ""}</span>
                    <span>IA: {item.review_status ?? "não solicitada"}</span>
                    <span>{item.assigned_to ?? item.requested_by ?? "sem responsável"} · {ageLabel(item.age_reference)}</span>
                  </div>
                </button>
              </div>
            </article>;
          })}
        </div>
      )}

      {batchPreview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-paper/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-xl rounded-surface bg-surface p-5 shadow-overlay">
            <h2 className="font-serif text-xl font-semibold">Confirmar análise em lote</h2>
            <p className="mt-2 text-sm text-muted">{batchPreview.count} questões · {batchPreview.estimated_calls} novas chamadas · {batchPreview.cached_count} em cache · modelo {batchPreview.model} · custo estimado {batchPreview.estimated_cost_band}.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{batchPreview.checks.map((check) => <li key={check}>{check}</li>)}</ul>
            {batchPreview.blocked_count ? <p className="mt-3 text-sm font-semibold text-danger">{batchPreview.blocked_count} questão(ões) já têm bloqueio determinístico; a IA não removerá o gate.</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setBatchPreview(null)} className={ADMIN_BUTTON}>Cancelar</button>
              <button type="button" onClick={() => void runBatch()} disabled={busy === "batch-run"} className={ADMIN_PRIMARY_BUTTON}>{busy === "batch-run" ? "Analisando…" : "Gerar rascunhos"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {active ? <div className="fixed inset-0 z-40 bg-paper/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null); }}><aside className="ml-auto h-full w-full overflow-y-auto bg-surface p-5 shadow-overlay sm:w-[min(760px,92vw)]"><div className="flex items-start justify-between gap-3"><div><p className="paper-eyebrow">Revisão versionada · v{active.question_version}</p><h2 className="mt-1 font-serif text-xl font-semibold">Decisão editorial</h2></div><button type="button" onClick={() => setActive(null)} className={ADMIN_BUTTON_SM}>Fechar</button></div>
        <div className="mt-5 rounded-surface border border-edge p-4"><p className="font-serif text-sm leading-relaxed">{detail?.stem ?? active.stem_preview}</p>{detail ? <div className="mt-4 space-y-2">{Object.entries(detail.alternatives).map(([letter, text]) => <div key={letter} className={`rounded-surface border p-2 text-sm ${letter === detail.answer ? "border-success bg-success/5" : "border-edge"}`}><strong>{letter}.</strong> {text}</div>)}</div> : <p className="mt-3 text-sm text-muted">Carregando conteúdo canônico…</p>}<div className="mt-3 text-xs text-muted">Fonte: {[active.institution, active.exam_name, active.year].filter(Boolean).join(" · ") || "não informada"} · Status: {active.question_status}</div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-surface bg-paper p-3"><div className="text-xs text-muted">Pretendida</div><strong>{active.difficulty_assessment?.intended_level ?? "não definida"}</strong><div className="mt-1 text-xs">{active.difficulty_assessment?.cognitive_demand ?? "demanda não definida"}</div></div><div className="rounded-surface bg-paper p-3"><div className="text-xs text-muted">Prevista pela IA</div><strong>{percent(active.difficulty_assessment?.predicted_score ?? active.difficulty_estimate)}</strong><div className="mt-1 text-xs">confiança {percent(active.difficulty_assessment?.confidence)}</div></div><div className="rounded-surface bg-paper p-3"><div className="text-xs text-muted">Observada</div><strong>{percent(quality[active.question_id]?.observed_difficulty)}</strong><div className="mt-1 text-xs">n={quality[active.question_id]?.unique_users ?? 0}; IC facilidade {percent(quality[active.question_id]?.facility_ci_low)}–{percent(quality[active.question_id]?.facility_ci_high)}</div></div></div>
        <div className="mt-5 space-y-2"><h3 className="font-semibold">Rubrica editorial</h3>{Object.entries(active.dimensions ?? {}).map(([key, dimension]) => <div key={key} className={`rounded-surface border p-3 ${stateTone(dimension.state)}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{DIMENSION_LABELS[key] ?? key}</strong><span className="text-xs uppercase">{dimension.state}</span></div><p className="mt-1 text-sm">{dimension.summary}</p>{dimension.evidence.length ? <ul className="mt-2 list-disc pl-5 text-xs">{dimension.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul> : null}</div>)}</div>
        <div className="mt-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Diff proposto pela IA</h3><span className="text-xs text-muted">edite antes de aprovar</span></div><textarea value={patchText} onChange={(event) => setPatchText(event.target.value)} rows={10} spellCheck={false} className="mt-2 w-full rounded-surface border border-edge bg-paper p-3 font-mono text-xs" /><p className="mt-2 text-xs text-muted">Evidências e incertezas permanecem no histórico mesmo quando o rascunho é rejeitado.</p></div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Justificativa da decisão" className="mt-5 w-full rounded-surface border border-edge bg-transparent p-3 text-sm" />
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("approve")} className={ADMIN_PRIMARY_BUTTON}>Editar e aprovar</button><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("reject")} className={ADMIN_DANGER_BUTTON}>Rejeitar</button><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("request_changes")} className={ADMIN_BUTTON}>Solicitar ajustes</button><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("specialist_review")} className={ADMIN_WARNING_BUTTON}>Revisão especializada</button><button type="button" disabled={Boolean(busy)} onClick={() => void analyzeOne(active.question_id)} className={ADMIN_BUTTON}>Nova análise</button>{active.question_status === "published" ? <button type="button" disabled={Boolean(busy)} onClick={() => void changeCanonicalStatus("unpublish")} className={ADMIN_BUTTON}>Despublicar</button> : null}<button type="button" disabled={Boolean(busy)} onClick={() => void changeCanonicalStatus("block")} className={ADMIN_DANGER_BUTTON}>Bloquear</button></div>
      </aside></div> : null}
    </section>
  );
}
