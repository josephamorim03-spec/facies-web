"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  decideQuestionBankEditorialReview,
  getQuestionBankAdminQuestion,
  getQuestionBankEditorialQueue,
  getQuestionBankObservedItemQuality,
  requestQuestionBankEditorialAnalysis,
  requestQuestionBankEditorialBatch,
  routeQuestionBankEditorialBatch,
  updateQuestionBankQuestionStatus,
  type QuestionBankAdminQuestionDetail,
  type QuestionBankEditorialBatchPreview,
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

function stateTone(state?: string | null): string {
  if (state === "blocked" || state === "fail" || state === "critical") return "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200";
  if (state === "needs_review" || state === "warning" || state === "high") return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
  if (state === "ready" || state === "pass" || state === "low") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";
  return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function percent(value: number | null | undefined): string {
  return value == null ? "sem amostra" : `${Math.round(value * 100)}%`;
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
      const [queue, evidence] = await Promise.all([
        getQuestionBankEditorialQueue({ q, lane, priority, status, limit: 100 }),
        getQuestionBankObservedItemQuality().catch(() => ({ min_attempts: 30, items_analyzed: 0, items: [] })),
      ]);
      setItems(queue.items);
      setTotal(queue.total);
      setQuality(Object.fromEntries(evidence.items.map((item) => [item.question_id, item])));
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
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Workbench editorial</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-gray-100">Curadoria e nível das questões</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">Uma fila para evidência médica, construção, valor pedagógico e dificuldade. A IA produz somente rascunhos versionados para decisão humana.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void refresh()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">Atualizar</button>
            <select aria-label="Lane do lote" value={routeLane} onChange={(event) => setRouteLane(event.target.value)} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700">{LANES.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" disabled={!selected.size || Boolean(busy)} onClick={() => void routeBatch()} className="rounded-lg border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50">Encaminhar ({selected.size})</button>
            <button type="button" disabled={!selected.size || Boolean(busy)} onClick={() => void previewBatch()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Analisar seleção ({selected.size})</button>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar no enunciado" className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
          <select value={lane} onChange={(event) => setLane(event.target.value)} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700">{LANES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"><option value="">Todas as prioridades</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"><option value="">Todos os estados de IA</option><option value="draft_ready">Rascunho pronto</option><option value="running">Rodando</option><option value="failed">Falhou</option><option value="stale">Obsoleto</option><option value="approved">Aprovado</option><option value="rejected">Rejeitado</option></select>
          <input value={board} onChange={(event) => setBoard(event.target.value)} placeholder="Banca" className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
          <input value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ano" className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
          <input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Especialidade" className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"><option value="">Toda dificuldade pretendida</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option><option value="very_hard">Muito difícil</option><option value="unverifiable">Não verificável</option></select>
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"><input type="checkbox" checked={onlyMismatch} onChange={(event) => setOnlyMismatch(event.target.checked)} /> Divergência ≥ 0,20</label>
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"><input type="checkbox" checked={onlyHumanPending} onChange={(event) => setOnlyHumanPending(event.target.checked)} /> Decisão humana pendente</label>
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"><input type="checkbox" checked={onlyAiPending} onChange={(event) => setOnlyAiPending(event.target.checked)} /> IA pendente ou falhou</label>
        </div>
      </header>

      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error} <button type="button" onClick={() => void refresh()} className="ml-2 font-semibold underline">Tentar novamente</button></div> : null}

      <div className="flex items-center justify-between text-sm text-gray-500"><span>{visibleItems.length} exibidas de {total}</span><span>Dificuldade observada aparece com ≥ 30 usuários únicos</span></div>
      {loading ? <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-busy="true" /> : visibleItems.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500 dark:border-gray-700">Nenhuma questão corresponde aos filtros.</div> : (
        <div className="grid gap-3">
          {visibleItems.map((item) => {
            const observed = quality[item.question_id];
            const predicted = item.difficulty_assessment?.predicted_score ?? item.difficulty_estimate;
            const mismatch = observed?.observed_difficulty != null && predicted != null && Math.abs(observed.observed_difficulty - predicted) >= 0.2;
            return <article key={item.question_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex gap-3">
                <input aria-label="Selecionar questão" type="checkbox" checked={selected.has(item.question_id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(item.question_id); else next.delete(item.question_id); return next; })} className="mt-1" />
                <button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stateTone(item.priority)}`}>{item.priority ?? "sem prioridade"}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] dark:bg-gray-800">{LANES.find(([value]) => value === item.lane)?.[1] ?? item.lane ?? "Triagem editorial"}</span>
                    {mismatch ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">difficulty_mismatch</span> : null}
                    {observed?.flags.includes("negative_discrimination") ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">discriminação negativa</span> : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Prioridade: {priorityReason(item, observed)}</p>
                  <p className="mt-2 line-clamp-2 font-serif text-sm leading-relaxed text-gray-900 dark:text-gray-100">{item.stem_preview}</p>
                  <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-3 lg:grid-cols-6">
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

      {batchPreview ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900"><h2 className="text-xl font-semibold">Confirmar análise em lote</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{batchPreview.count} questões · {batchPreview.estimated_calls} novas chamadas · {batchPreview.cached_count} em cache · modelo {batchPreview.model} · custo estimado {batchPreview.estimated_cost_band}.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{batchPreview.checks.map((check) => <li key={check}>{check}</li>)}</ul>{batchPreview.blocked_count ? <p className="mt-3 text-sm font-semibold text-red-700">{batchPreview.blocked_count} questão(ões) já têm bloqueio determinístico; a IA não removerá o gate.</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setBatchPreview(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button type="button" onClick={() => void runBatch()} disabled={busy === "batch-run"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "batch-run" ? "Analisando…" : "Gerar rascunhos"}</button></div></div></div> : null}

      {active ? <div className="fixed inset-0 z-40 bg-black/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null); }}><aside className="ml-auto h-full w-full overflow-y-auto bg-white p-5 shadow-2xl sm:w-[min(760px,92vw)] dark:bg-gray-950"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-violet-600">Revisão versionada · v{active.question_version}</p><h2 className="mt-1 text-xl font-semibold">Decisão editorial</h2></div><button type="button" onClick={() => setActive(null)} className="rounded-lg border px-3 py-1.5 text-sm">Fechar</button></div>
        <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-800"><p className="font-serif text-sm leading-relaxed">{detail?.stem ?? active.stem_preview}</p>{detail ? <div className="mt-4 space-y-2">{Object.entries(detail.alternatives).map(([letter, text]) => <div key={letter} className={`rounded-lg border p-2 text-sm ${letter === detail.answer ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-gray-800"}`}><strong>{letter}.</strong> {text}</div>)}</div> : <p className="mt-3 text-sm text-gray-500">Carregando conteúdo canônico…</p>}<div className="mt-3 text-xs text-gray-500">Fonte: {[active.institution, active.exam_name, active.year].filter(Boolean).join(" · ") || "não informada"} · Status: {active.question_status}</div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900"><div className="text-xs text-gray-500">Pretendida</div><strong>{active.difficulty_assessment?.intended_level ?? "não definida"}</strong><div className="mt-1 text-xs">{active.difficulty_assessment?.cognitive_demand ?? "demanda não definida"}</div></div><div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900"><div className="text-xs text-gray-500">Prevista pela IA</div><strong>{percent(active.difficulty_assessment?.predicted_score ?? active.difficulty_estimate)}</strong><div className="mt-1 text-xs">confiança {percent(active.difficulty_assessment?.confidence)}</div></div><div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900"><div className="text-xs text-gray-500">Observada</div><strong>{percent(quality[active.question_id]?.observed_difficulty)}</strong><div className="mt-1 text-xs">n={quality[active.question_id]?.unique_users ?? 0}; IC facilidade {percent(quality[active.question_id]?.facility_ci_low)}–{percent(quality[active.question_id]?.facility_ci_high)}</div></div></div>
        <div className="mt-5 space-y-2"><h3 className="font-semibold">Rubrica editorial</h3>{Object.entries(active.dimensions ?? {}).map(([key, dimension]) => <div key={key} className={`rounded-lg border p-3 ${stateTone(dimension.state)}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{DIMENSION_LABELS[key] ?? key}</strong><span className="text-xs uppercase">{dimension.state}</span></div><p className="mt-1 text-sm">{dimension.summary}</p>{dimension.evidence.length ? <ul className="mt-2 list-disc pl-5 text-xs">{dimension.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul> : null}</div>)}</div>
        <div className="mt-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Diff proposto pela IA</h3><span className="text-xs text-gray-500">edite antes de aprovar</span></div><textarea value={patchText} onChange={(event) => setPatchText(event.target.value)} rows={10} spellCheck={false} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-900" /><p className="mt-2 text-xs text-gray-500">Evidências e incertezas permanecem no histórico mesmo quando o rascunho é rejeitado.</p></div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Justificativa da decisão" className="mt-5 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm dark:border-gray-700" />
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("approve")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Editar e aprovar</button><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("reject")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Rejeitar</button><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("request_changes")} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Solicitar ajustes</button><button type="button" disabled={!active.review_id || Boolean(busy)} onClick={() => void decide("specialist_review")} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">Revisão especializada</button><button type="button" disabled={Boolean(busy)} onClick={() => void analyzeOne(active.question_id)} className="rounded-lg border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50">Nova análise</button>{active.question_status === "published" ? <button type="button" disabled={Boolean(busy)} onClick={() => void changeCanonicalStatus("unpublish")} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Despublicar</button> : null}<button type="button" disabled={Boolean(busy)} onClick={() => void changeCanonicalStatus("block")} className="rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Bloquear</button></div>
      </aside></div> : null}
    </section>
  );
}
