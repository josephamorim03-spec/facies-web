"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteQuestionBankAdminQuestion,
  editQuestionBankAdminQuestion,
  enqueueQuestionBankQuestionAnalysis,
  getQuestionBankAdminQuestion,
  listQuestionBankReports,
  listQuestionBankAdminKnowledgeNodes,
  resolveQuestionBankReports,
  searchQuestionBankAdminQuestions,
  updateQuestionBankQuestionStatus,
  type QuestionBankAdminKnowledgeNode,
  type QuestionBankAdminQuestionDetail,
  type QuestionBankAdminQuestionListItem,
  type QuestionBankReport,
} from "@/lib/api/domains/question-bank-admin";

const STATUS_OPTIONS = [
  ["published", "Publicadas"],
  ["human_review_pending", "Em revisão"],
  ["blocked", "Bloqueadas"],
  ["deprecated", "Depreciadas"],
  ["all", "Todas"],
] as const;

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

// Rótulos PT-BR das tags do Question DNA (kbank/question_bank/fingerprint.py).
// `requires_image` é omitido — já há o selo "imagem".
const DNA_CHIP_LABELS: Record<string, string> = {
  incorreta: "negativa",
  exceto: "exceto",
  vf: "V/F",
  direta: "direta",
  long_vignette: "contextualizada",
  clinical_reasoning: "raciocínio clínico",
  diagnostic_differentials: "diferenciais",
  atomic_fact: "atômica",
  distractor_similar: "distratores similares",
};

function dnaChips(tags: string[] | undefined): string[] {
  return (tags ?? []).map((tag) => DNA_CHIP_LABELS[tag]).filter((label): label is string => Boolean(label));
}

function statusTone(status: string | null): string {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300";
    case "blocked":
    case "deprecated":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "human_review_pending":
    case "human_reviewed":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

function reportSourceLabel(report: QuestionBankReport): string {
  const file = report.imported_file_name || report.imported_file_path || report.source_file_path || "PDF nao informado";
  const page = report.source_page ?? report.question_page;
  return page == null ? file : `${file} - pag. ${page}`;
}

type EditState = {
  stem: string;
  alternatives: Record<string, string>;
  answer: string;
  difficulty: string;
  primaryNodeId: string;
  primaryNodeLabel: string;
  anchorNodeId: string;
  anchorNodeLabel: string;
  distractorDiagnosis: Record<string, string>;
};

export default function QuestionsManager() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("published");
  const [boardCode, setBoardCode] = useState("");
  const [year, setYear] = useState("");
  const [topicFilter, setTopicFilter] = useState<"" | "with" | "missing">("");
  const [hasImage, setHasImage] = useState<"" | "true" | "false">("");
  const [dnaFilter, setDnaFilter] = useState<"" | "with" | "missing">("");
  const [lowConfidence, setLowConfidence] = useState(false);
  const [missingSimilar, setMissingSimilar] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [items, setItems] = useState<QuestionBankAdminQuestionListItem[]>([]);
  const [reports, setReports] = useState<QuestionBankReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const LIMIT = 25;

  const [detail, setDetail] = useState<QuestionBankAdminQuestionDetail | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [nodeQuery, setNodeQuery] = useState("");
  const [nodeResults, setNodeResults] = useState<QuestionBankAdminKnowledgeNode[]>([]);
  const [objectiveQuery, setObjectiveQuery] = useState("");
  const [objectiveResults, setObjectiveResults] = useState<QuestionBankAdminKnowledgeNode[]>([]);

  const search = useCallback(
    async (nextOffset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchQuestionBankAdminQuestions({
          q: q || undefined,
          status,
          board_code: boardCode || undefined,
          year: year ? Number(year) : undefined,
          missing_topic: topicFilter === "missing" ? true : topicFilter === "with" ? false : undefined,
          needs_topic_review: needsReview || undefined,
          has_image: hasImage === "" ? undefined : hasImage === "true",
          missing_fingerprint: dnaFilter === "missing" ? true : dnaFilter === "with" ? false : undefined,
          fingerprint_low_confidence: lowConfidence || undefined,
          missing_similar: missingSimilar || undefined,
          limit: LIMIT,
          offset: nextOffset,
        });
        setItems(res.items);
        setTotal(res.total);
        setOffset(nextOffset);
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao buscar questões.");
      } finally {
        setLoading(false);
      }
    },
    [q, status, boardCode, year, topicFilter, needsReview, hasImage, dnaFilter, lowConfidence, missingSimilar],
  );

  // Debounced auto-search on filter changes.
  const firstRender = useRef(true);
  useEffect(() => {
    const handle = setTimeout(() => void search(0), firstRender.current ? 0 : 350);
    firstRender.current = false;
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    void refreshReports();
  }, []);

  async function refreshReports() {
    setReportsLoading(true);
    try {
      const res = await listQuestionBankReports({ status: "open", limit: 20 });
      setReports(res.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar reports.");
    } finally {
      setReportsLoading(false);
    }
  }

  async function resolveReport(questionId: string) {
    setError(null);
    try {
      await resolveQuestionBankReports(questionId);
      setNotice("Report resolvido.");
      await refreshReports();
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resolver report.");
    }
  }

  useEffect(() => {
    if (!nodeQuery.trim()) {
      setNodeResults([]);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      listQuestionBankAdminKnowledgeNodes({ q: nodeQuery, limit: 12 })
        .then((res) => {
          if (active) setNodeResults(res.items);
        })
        .catch(() => {
          if (active) setNodeResults([]);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [nodeQuery]);

  useEffect(() => {
    if (!objectiveQuery.trim()) {
      setObjectiveResults([]);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      listQuestionBankAdminKnowledgeNodes({ q: objectiveQuery, type: "learning_objective", limit: 12 })
        .then((res) => {
          if (active) setObjectiveResults(res.items);
        })
        .catch(() => {
          if (active) setObjectiveResults([]);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [objectiveQuery]);

  async function openEditor(questionId: string) {
    setError(null);
    setBlockers([]);
    try {
      const d = await getQuestionBankAdminQuestion(questionId);
      setDetail(d);
      const primary = d.nodes.find((n) => n.is_primary);
      const anchor = d.nodes.find((n) => (n.role ?? "").toLowerCase() === "anchor_objective");
      setEdit({
        stem: d.stem ?? "",
        alternatives: { A: "", B: "", C: "", D: "", E: "", ...d.alternatives },
        answer: d.answer ?? "",
        difficulty: d.difficulty_estimate != null ? String(d.difficulty_estimate) : "",
        primaryNodeId: primary?.knowledge_node_id ?? "",
        primaryNodeLabel: primary?.node_name ?? "",
        anchorNodeId: anchor?.knowledge_node_id ?? "",
        anchorNodeLabel: anchor?.node_name ?? "",
        distractorDiagnosis: { ...(d.distractor_diagnosis ?? {}) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar a questão.");
    }
  }

  function closeEditor() {
    setDetail(null);
    setEdit(null);
    setBlockers([]);
    setNodeQuery("");
    setNodeResults([]);
    setObjectiveQuery("");
    setObjectiveResults([]);
  }

  async function saveEdit() {
    if (!detail || !edit) return;
    setSaving(true);
    setBlockers([]);
    setError(null);
    try {
      const alternatives = Object.fromEntries(
        OPTION_LETTERS.map((l) => [l, edit.alternatives[l] ?? ""]).filter(([, v]) => String(v).trim()),
      );
      const distractorDiagnosis = Object.fromEntries(
        OPTION_LETTERS.filter((l) => l !== edit.answer)
          .map((l) => [l, (edit.distractorDiagnosis[l] ?? "").trim()])
          .filter(([, v]) => v),
      );
      const currentAnchorId =
        detail.nodes.find((n) => (n.role ?? "").toLowerCase() === "anchor_objective")
          ?.knowledge_node_id ?? "";
      const result = await editQuestionBankAdminQuestion(detail.id, {
        canonical_stem_md: edit.stem,
        canonical_alternatives: alternatives,
        canonical_answer: edit.answer,
        difficulty_estimate: edit.difficulty ? Number(edit.difficulty) : undefined,
        primary_node_id: edit.primaryNodeId || undefined,
        // Only send when changed: empty string clears, an id sets it.
        ...(edit.anchorNodeId !== currentAnchorId
          ? { anchor_objective_id: edit.anchorNodeId }
          : {}),
        distractor_diagnosis: distractorDiagnosis,
      });
      if (result.result === "updated") {
        setNotice("Questão atualizada.");
        closeEditor();
        void search(offset);
      } else if (result.result === "blocked") {
        setBlockers(result.blockers ?? []);
      } else if (result.result === "duplicate_of") {
        setBlockers([`duplicate_of:${result.duplicate_of}`]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Resolve a cross-area "reavaliar tópico" flag: promote the proposed area to primary,
  // or dismiss the flag while keeping the current primary.
  async function resolveTopicReview(opts: { primaryNodeId?: string; dismiss?: boolean }) {
    if (!detail) return;
    setSaving(true);
    setError(null);
    setBlockers([]);
    try {
      const result = await editQuestionBankAdminQuestion(
        detail.id,
        opts.primaryNodeId ? { primary_node_id: opts.primaryNodeId } : { dismiss_topic_review: true },
      );
      if (result.result === "updated") {
        setNotice(opts.primaryNodeId ? "Tópico primário atualizado." : "Sinalização dispensada.");
        closeEditor();
        void search(offset);
      } else if (result.result === "blocked") {
        setBlockers(result.blockers ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resolver a sinalização.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    item: QuestionBankAdminQuestionListItem,
    action: "publish" | "unpublish" | "deprecate",
  ) {
    setError(null);
    try {
      const res = await updateQuestionBankQuestionStatus(item.id, action);
      if ((res as { result?: string }).result === "blocked") {
        setError("Não foi possível publicar: a questão falha no gate de qualidade.");
        return;
      }
      setNotice(`Questão ${action === "publish" ? "publicada" : action === "unpublish" ? "despublicada" : "removida"}.`);
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar status.");
    }
  }

  async function enqueueAnalysis(item: QuestionBankAdminQuestionListItem) {
    setError(null);
    try {
      await enqueueQuestionBankQuestionAnalysis(item.id);
      setNotice("Reanálise por IA enfileirada.");
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enfileirar análise.");
    }
  }

  const missingTopicPageItems = items.filter((item) => !item.has_primary_node);
  const missingDnaPageItems = items.filter((item) => !item.has_fingerprint);

  async function enqueueMissingDnaPageAnalysis() {
    setError(null);
    if (missingDnaPageItems.length === 0) {
      setNotice("Nenhuma questao sem DNA nesta pagina.");
      return;
    }
    setBulkAnalyzing(true);
    let queued = 0;
    try {
      // Reanálise recomputa o charge_profile e, por consequência, o Question DNA.
      for (const item of missingDnaPageItems) {
        await enqueueQuestionBankQuestionAnalysis(item.id);
        queued += 1;
      }
      setNotice(`${queued} analise(s) de DNA enfileirada(s) nesta pagina.`);
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enfileirar analises de DNA.");
    } finally {
      setBulkAnalyzing(false);
    }
  }

  async function enqueueMissingTopicPageAnalysis() {
    setError(null);
    if (missingTopicPageItems.length === 0) {
      setNotice("Nenhuma questao sem topico nesta pagina.");
      return;
    }
    setBulkAnalyzing(true);
    let queued = 0;
    try {
      for (const item of missingTopicPageItems) {
        await enqueueQuestionBankQuestionAnalysis(item.id);
        queued += 1;
      }
      setNotice(`${queued} reanalise(s) por IA enfileirada(s) nesta pagina.`);
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enfileirar analises.");
    } finally {
      setBulkAnalyzing(false);
    }
  }

  async function softDelete(item: QuestionBankAdminQuestionListItem) {
    if (!window.confirm("Apagar esta questão? Ela sai do banco do aluno (reversível, pode republicar).")) {
      return;
    }
    setError(null);
    try {
      await deleteQuestionBankAdminQuestion(item.id);
      setNotice("Questão removida do banco do aluno.");
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar.");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allVisibleSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  function toggleSelectAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  async function bulkChangeStatus(action: "publish" | "unpublish" | "deprecate") {
    const ids = items.filter((item) => selected.has(item.id)).map((item) => item.id);
    if (ids.length === 0) return;
    setError(null);
    setBulkBusy(true);
    let ok = 0;
    let blocked = 0;
    try {
      for (const id of ids) {
        const res = await updateQuestionBankQuestionStatus(id, action);
        if ((res as { result?: string }).result === "blocked") blocked += 1;
        else ok += 1;
      }
      const verb = action === "publish" ? "publicada(s)" : action === "unpublish" ? "despublicada(s)" : "depreciada(s)";
      setNotice(`${ok} questão(ões) ${verb}${blocked ? ` · ${blocked} bloqueada(s) pelo gate de qualidade` : ""}.`);
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na ação em lote.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = items.filter((item) => selected.has(item.id)).map((item) => item.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Apagar ${ids.length} questão(ões) do banco do aluno? (reversível, pode republicar)`)) {
      return;
    }
    setError(null);
    setBulkBusy(true);
    let ok = 0;
    try {
      for (const id of ids) {
        await deleteQuestionBankAdminQuestion(id);
        ok += 1;
      }
      setNotice(`${ok} questão(ões) removida(s) do banco do aluno.`);
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar em lote.");
    } finally {
      setBulkBusy(false);
    }
  }

  const inputCls =
    "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

  return (
    <section className="space-y-5 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Questões</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Busque, edite e remova questões. Editar revalida o gate de qualidade; apagar é soft-delete
          (sai do banco do aluno, reversível).
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Denuncias abertas</h3>
            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
              {reportsLoading ? "Carregando..." : `${reports.length} questao(oes) reportada(s)`}
            </p>
          </div>
          <button
            onClick={() => void refreshReports()}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/40"
          >
            Atualizar reports
          </button>
        </div>
        {reports.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {reports.map((report) => (
              <div key={report.question_id} className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-900/40 dark:bg-gray-900">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                      <span>{report.open_reports} report(s)</span>
                      {report.report_types ? <span>{report.report_types}</span> : null}
                      <span>{report.status || "sem status"}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {reportSourceLabel(report)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {[report.board_code, report.exam_name, report.year].filter(Boolean).join(" - ") || "fonte sem metadados"}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => void openEditor(report.question_id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => void resolveReport(report.question_id)}
                      className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/30"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar no enunciado…"
          className={`${inputCls} min-w-[16rem] flex-1`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {STATUS_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <input
          value={boardCode}
          onChange={(e) => setBoardCode(e.target.value)}
          placeholder="Banca"
          className={`${inputCls} w-28`}
        />
        <input
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
          placeholder="Ano"
          className={`${inputCls} w-24`}
        />
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value as "" | "with" | "missing")} className={inputCls}>
          <option value="">Tópico: todos</option>
          <option value="with">Com tópico</option>
          <option value="missing">Sem tópico</option>
        </select>
        <select value={hasImage} onChange={(e) => setHasImage(e.target.value as "" | "true" | "false")} className={inputCls}>
          <option value="">Imagem: todas</option>
          <option value="true">Com imagem</option>
          <option value="false">Sem imagem</option>
        </select>
        <select value={dnaFilter} onChange={(e) => setDnaFilter(e.target.value as "" | "with" | "missing")} className={inputCls}>
          <option value="">DNA: todos</option>
          <option value="with">Com DNA</option>
          <option value="missing">Sem DNA</option>
        </select>
        <select value={needsReview ? "yes" : ""} onChange={(e) => setNeedsReview(e.target.value === "yes")} className={inputCls}>
          <option value="">Revisão: todas</option>
          <option value="yes">Reavaliar tópico</option>
        </select>
      </div>

      {/* Filas pré-definidas (atalhos de filtro) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Filas:</span>
        {([
          ["Sem tópico", () => { setTopicFilter("missing"); setDnaFilter(""); setLowConfidence(false); setMissingSimilar(false); setNeedsReview(false); }],
          ["Reavaliar tópico", () => { setNeedsReview(true); setTopicFilter(""); setDnaFilter(""); setLowConfidence(false); setMissingSimilar(false); }],
          ["Sem DNA", () => { setDnaFilter("missing"); setTopicFilter(""); setLowConfidence(false); setMissingSimilar(false); setNeedsReview(false); }],
          ["DNA baixa confiança", () => { setLowConfidence(true); setDnaFilter("with"); setTopicFilter(""); setMissingSimilar(false); setNeedsReview(false); }],
          ["Sem similares", () => { setMissingSimilar(true); setDnaFilter("with"); setTopicFilter(""); setLowConfidence(false); setNeedsReview(false); }],
        ] as const).map(([label, apply]) => (
          <button
            key={label}
            onClick={apply}
            className="rounded-full border border-gray-300 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {label}
          </button>
        ))}
        {(topicFilter || dnaFilter || lowConfidence || missingSimilar || needsReview) && (
          <button
            onClick={() => { setTopicFilter(""); setDnaFilter(""); setLowConfidence(false); setMissingSimilar(false); setNeedsReview(false); }}
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            limpar
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        <span>
          {missingTopicPageItems.length} sem topico · {missingDnaPageItems.length} sem DNA nesta pagina
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void enqueueMissingDnaPageAnalysis()}
            disabled={loading || bulkAnalyzing || missingDnaPageItems.length === 0}
            className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
          >
            {bulkAnalyzing ? "Enfileirando..." : "Analisar DNA desta pagina"}
          </button>
          <button
            onClick={() => void enqueueMissingTopicPageAnalysis()}
            disabled={loading || bulkAnalyzing || missingTopicPageItems.length === 0}
            className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            {bulkAnalyzing ? "Enfileirando..." : "Analisar IA das sem topico desta pagina"}
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
          <span className="font-semibold">{selected.size} selecionada(s)</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void bulkChangeStatus("publish")}
              disabled={bulkBusy}
              className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/30"
            >
              {bulkBusy ? "Processando..." : "Publicar selecionadas"}
            </button>
            <button
              onClick={() => void bulkChangeStatus("unpublish")}
              disabled={bulkBusy}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Enviar p/ revisão
            </button>
            <button
              onClick={() => void bulkDelete()}
              disabled={bulkBusy}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Apagar selecionadas
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer accent-violet-600"
                />
              </th>
              <th className="px-4 py-3">Enunciado</th>
              <th className="px-4 py-3">Tópico</th>
              <th className="px-4 py-3">Banca · Ano</th>
              <th className="px-4 py-3">Gab.</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar questão"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 cursor-pointer accent-violet-600"
                  />
                </td>
                <td className="max-w-md px-4 py-3 text-gray-900 dark:text-gray-100">
                  <p className="line-clamp-2">{item.stem}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.needs_topic_review && (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        reavaliar tópico
                      </span>
                    )}
                    {item.has_image && (
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        imagem
                      </span>
                    )}
                    {dnaChips(item.question_fingerprint?.tags).map((label) => (
                      <span
                        key={label}
                        className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {item.has_primary_node ? (
                    <div>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{item.primary_node_code ?? ""}</span>
                      {item.primary_node_name ? <span className="ml-1">{item.primary_node_name}</span> : null}
                    </div>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Sem tópico
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {[item.board_code, item.year].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{item.answer ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(item.status)}`}>
                    {item.status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => void openEditor(item.id)} className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      Editar
                    </button>
                    {!item.has_primary_node ? (
                      <button onClick={() => void enqueueAnalysis(item)} className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30">
                        Analisar IA
                      </button>
                    ) : null}
                    {item.status === "published" ? (
                      <button onClick={() => void changeStatus(item, "unpublish")} className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                        Despublicar
                      </button>
                    ) : (
                      <button onClick={() => void changeStatus(item, "publish")} className="rounded-lg border border-green-300 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/30">
                        Publicar
                      </button>
                    )}
                    <button onClick={() => void softDelete(item)} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30">
                      Apagar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma questão encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{loading ? "Carregando…" : `${total} questão(ões)`}</span>
        <div className="flex gap-2">
          <button
            disabled={offset === 0 || loading}
            onClick={() => void search(Math.max(0, offset - LIMIT))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
          >
            Anterior
          </button>
          <button
            disabled={offset + LIMIT >= total || loading}
            onClick={() => void search(offset + LIMIT)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Modal de edição */}
      {detail && edit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={closeEditor}>
          <div
            className="my-8 w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editar questão</h3>
              <button onClick={closeEditor} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label="Fechar">×</button>
            </div>

            {detail.topic_review?.status === "pending" && (() => {
              const proposedId = detail.topic_review.proposed_primary_node_id ?? "";
              const proposed = detail.nodes.find((n) => n.knowledge_node_id === proposedId);
              const proposedLabel = proposed
                ? [proposed.node_code, proposed.node_name].filter(Boolean).join(" · ")
                : proposedId;
              return (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">Reavaliar tópico primário</p>
                  <p className="mt-1">
                    Uma reimportação trouxe esta questão com uma área diferente do tópico primário atual
                    {proposedLabel ? <> — sugerido: <span className="font-medium">{proposedLabel}</span></> : null}.
                    Confirme o primário ou dispense.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proposedId && (
                      <button
                        onClick={() => void resolveTopicReview({ primaryNodeId: proposedId })}
                        disabled={saving}
                        className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        Tornar primário
                      </button>
                    )}
                    <button
                      onClick={() => void resolveTopicReview({ dismiss: true })}
                      disabled={saving}
                      className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              );
            })()}

            {detail.ai_read_summary && (() => {
              const summary = detail.ai_read_summary;
              const classification = summary.classification || {};
              const chips = [
                classification.grande_area,
                classification.tema,
                classification.subtema,
                classification.microcompetencia,
              ].filter(Boolean);
              return (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Leitura editorial da IA</p>
                      <p className="mt-1 font-semibold">{summary.route_label} · confiança {summary.confidence_label}</p>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold dark:bg-black/20">
                      {summary.review_lane}
                    </span>
                  </div>
                  {chips.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <span key={String(chip)} className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium dark:bg-black/20">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                    <span><span className="font-semibold">Acao:</span> {summary.suggested_action}</span>
                    <span><span className="font-semibold">Impacto:</span> {summary.adaptive_impact}</span>
                    {classification.charge_pattern ? <span><span className="font-semibold">Cobranca:</span> {classification.charge_pattern}</span> : null}
                    {summary.open_reports ? <span><span className="font-semibold">Reports:</span> {summary.open_reports}</span> : null}
                  </div>
                </div>
              );
            })()}

            {detail.question_fingerprint && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">DNA</span>
                {dnaChips(detail.question_fingerprint.tags).map((label) => (
                  <span key={label} className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{label}</span>
                ))}
                {(detail.question_fingerprint.quality_flags ?? []).map((flag) => (
                  <span key={flag} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{flag}</span>
                ))}
              </div>
            )}

            {detail.similar_questions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Questões similares (DNA)</p>
                <ul className="mt-1 space-y-1">
                  {detail.similar_questions.map((s) => (
                    <li key={s.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 flex-1">{s.stem || s.id}</span>
                        <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                          {s.match_scope ?? "—"} · {s.confidence != null ? `${Math.round(s.confidence * 100)}%` : "—"}
                        </span>
                      </div>
                      {(s.primary_node_code || s.primary_node_name) && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {[s.primary_node_code, s.primary_node_name].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockers.length > 0 && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                <p className="font-semibold">Não salvo — a edição falha no gate:</p>
                <ul className="mt-1 list-disc pl-5">
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Enunciado</label>
            <textarea
              value={edit.stem}
              onChange={(e) => setEdit({ ...edit, stem: e.target.value })}
              className={`${inputCls} mt-1 min-h-32 w-full resize-y`}
            />

            <div className="mt-4 grid gap-2">
              {OPTION_LETTERS.map((letter) => (
                <div key={letter} className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">{letter}</span>
                  <input
                    value={edit.alternatives[letter] ?? ""}
                    onChange={(e) => setEdit({ ...edit, alternatives: { ...edit.alternatives, [letter]: e.target.value } })}
                    className={`${inputCls} flex-1`}
                  />
                </div>
              ))}
            </div>

            {/* Diagnóstico de erro por distrator — só para alternativas erradas (≠ gabarito). */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Diagnóstico de erro por alternativa
              </p>
              <div className="mt-1 grid gap-2">
                {OPTION_LETTERS.filter((letter) => letter !== edit.answer && (edit.alternatives[letter] ?? "").trim()).map(
                  (letter) => (
                    <div key={letter} className="flex items-start gap-2">
                      <span className="mt-2 w-6 text-center text-sm font-semibold text-violet-600 dark:text-violet-300">{letter}</span>
                      <input
                        value={edit.distractorDiagnosis[letter] ?? ""}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            distractorDiagnosis: { ...edit.distractorDiagnosis, [letter]: e.target.value },
                          })
                        }
                        placeholder="hipótese do erro de quem marca esta alternativa…"
                        className={`${inputCls} flex-1`}
                      />
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Gabarito</label>
                <select value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} className={`${inputCls} mt-1`}>
                  <option value="">—</option>
                  {OPTION_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dificuldade (0–1)</label>
                <input
                  value={edit.difficulty}
                  onChange={(e) => setEdit({ ...edit, difficulty: e.target.value })}
                  placeholder="0.5"
                  className={`${inputCls} mt-1 w-28`}
                />
              </div>
              <div className="relative min-w-[14rem] flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tópico primário</label>
                <input
                  value={nodeQuery || edit.primaryNodeLabel}
                  onChange={(e) => { setNodeQuery(e.target.value); }}
                  placeholder="Buscar tópico…"
                  className={`${inputCls} mt-1 w-full`}
                />
                {nodeResults.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {nodeResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setEdit({ ...edit, primaryNodeId: node.id, primaryNodeLabel: node.name });
                          setNodeQuery("");
                          setNodeResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <span className="font-medium">{node.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{node.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Objetivo âncora
              </label>
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                O objetivo fino que a questão realmente testa (o que diferencia a correta das erradas).
              </p>
              <div className="relative mt-1">
                <input
                  value={objectiveQuery || edit.anchorNodeLabel}
                  onChange={(e) => setObjectiveQuery(e.target.value)}
                  placeholder="Buscar objetivo…"
                  className={`${inputCls} w-full ${edit.anchorNodeId ? "pr-16" : ""}`}
                />
                {edit.anchorNodeId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEdit({ ...edit, anchorNodeId: "", anchorNodeLabel: "" });
                      setObjectiveQuery("");
                      setObjectiveResults([]);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    limpar
                  </button>
                ) : null}
                {objectiveResults.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {objectiveResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setEdit({ ...edit, anchorNodeId: node.id, anchorNodeLabel: node.name });
                          setObjectiveQuery("");
                          setObjectiveResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <span className="font-medium">{node.name}</span>
                        {node.code ? <span className="ml-2 text-xs text-gray-400">{node.code}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {detail.nodes.some((n) => !n.is_primary) && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tópicos secundários</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {detail.nodes.filter((n) => !n.is_primary).map((n) => (
                    <span
                      key={`${n.knowledge_node_id}-${n.role ?? ""}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {[n.node_code, n.node_name].filter(Boolean).join(" · ") || n.knowledge_node_id}
                      {n.source === "dedup_enrichment" ? (
                        <span className="text-gray-400 dark:text-gray-500">· reimporte</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.image_refs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Imagens</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {detail.image_refs.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="Imagem da questão" className="rounded-lg border border-gray-200 dark:border-gray-700" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeEditor} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                Cancelar
              </button>
              <button onClick={() => void saveEdit()} disabled={saving} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
