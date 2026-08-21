"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteQuestionBankAdminQuestion,
  editQuestionBankAdminQuestion,
  enqueueQuestionBankQuestionAnalysis,
  getQuestionBankAdminQuestion,
  listQuestionBankReports,
  listQuestionBankAdminKnowledgeNodes,
  repairQuestionBankReport,
  resolveQuestionBankReports,
  requestQuestionBankEditorialAnalysis,
  searchQuestionBankAdminQuestions,
  triageQuestionBankReport,
  updateQuestionBankQuestionStatus,
  type QuestionBankAdminKnowledgeNode,
  type QuestionBankAdminQuestionDetail,
  type QuestionBankAdminQuestionListItem,
  type QuestionBankReport,
} from "@/lib/api/domains/question-bank-admin";
import { QuestionImageRefs } from "@/app/banco/_components/QuestionImageRefs";
import { QuestionFullContext } from "@/app/banco/_components/QuestionFullContext";

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
      return "bg-surfaceMuted text-success/40";
    case "blocked":
    case "deprecated":
      return "bg-surfaceMuted text-danger/40";
    case "human_review_pending":
    case "human_reviewed":
      return "bg-surfaceMuted text-warning/40";
    default:
      return "bg-surface text-ink";
  }
}

function reportSourceLabel(report: QuestionBankReport): string {
  const stem = report.question.stem?.trim();
  if (stem) return stem;
  return `Questao ${report.question_id}`;
}

function objectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>);
}

function reportDiagnosisSummary(report: QuestionBankReport): string | null {
  const summary = report.ai_diagnosis.summary;
  return typeof summary === "string" && summary.trim() ? summary.trim() : null;
}

function reportRecommendedAction(report: QuestionBankReport): string | null {
  const action = report.ai_diagnosis.recommended_action;
  return typeof action === "string" && action.trim() ? action.trim() : null;
}

function reportPatchFields(report: QuestionBankReport): string[] {
  const patch = report.suggested_patch ?? {};
  const questionKeys = objectKeys(patch["question_patch"]).map((key) => `questao.${key}`);
  const candidateKeys = objectKeys(patch["candidate_patch"]).map((key) => `candidato.${key}`);
  const topLevelKeys = objectKeys(patch).filter((key) => key !== "question_patch" && key !== "candidate_patch");
  return [...questionKeys, ...candidateKeys, ...topLevelKeys];
}

type EditState = {
  stem: string;
  alternatives: Record<string, string>;
  answer: string;
  intendedLevel: "" | "easy" | "medium" | "hard" | "very_hard";
  cognitiveDemand: "" | "recall" | "application" | "analysis";
  difficultyRationale: string;
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
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportActionBusy, setReportActionBusy] = useState<string | null>(null);
  const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(() => new Set());
  const [reportDetailsByQuestionId, setReportDetailsByQuestionId] = useState<Record<string, QuestionBankAdminQuestionDetail>>({});
  const [reportDetailBusyId, setReportDetailBusyId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [anomalyCheckingId, setAnomalyCheckingId] = useState<string | null>(null);
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
    setReportsError(null);
    try {
      const res = await listQuestionBankReports({ status: "pending", limit: 20 });
      setReports(res.items);
    } catch (err) {
      setReports([]);
      const status = typeof err === "object" && err !== null ? Number((err as { status: unknown }).status) : NaN;
      if (status === 404) {
        setReportsError("Painel de reports indisponivel neste ambiente.");
      } else {
        setReportsError(err instanceof Error ? err.message : "Falha ao carregar reports.");
      }
    } finally {
      setReportsLoading(false);
    }
  }

  async function toggleReportQuestion(report: QuestionBankReport) {
    const willOpen = !expandedReportIds.has(report.id);
    setExpandedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(report.id)) next.delete(report.id);
      else next.add(report.id);
      return next;
    });
    if (!willOpen || reportDetailsByQuestionId[report.question_id]) return;

    setReportDetailBusyId(report.id);
    setError(null);
    try {
      const detail = await getQuestionBankAdminQuestion(report.question_id);
      setReportDetailsByQuestionId((prev) => ({ ...prev, [report.question_id]: detail }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar a questão completa.");
      setExpandedReportIds((prev) => {
        const next = new Set(prev);
        next.delete(report.id);
        return next;
      });
    } finally {
      setReportDetailBusyId(null);
    }
  }

  async function resolveReport(reportId: string) {
    setError(null);
    try {
      await resolveQuestionBankReports(reportId);
      setNotice("Report resolvido.");
      await refreshReports();
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resolver report.");
    }
  }

  async function triageReport(reportId: string) {
    setError(null);
    setReportActionBusy(reportId);
    try {
      await triageQuestionBankReport(reportId);
      setNotice("Diagnostico de IA enfileirado.");
      await refreshReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao diagnosticar report.");
    } finally {
      setReportActionBusy(null);
    }
  }

  async function repairReport(
    reportId: string,
    action: "apply_patch" | "reanalyze_question" | "block_question",
  ) {
    setError(null);
    setReportActionBusy(reportId);
    try {
      await repairQuestionBankReport(reportId, { action });
      setNotice(
        action === "apply_patch"
          ? "Patch aplicado pelo admin."
          : action === "reanalyze_question"
            ? "Reanalise enfileirada."
            : "Questão bloqueada.",
      );
      await refreshReports();
      void search(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao executar reparo do report.");
    } finally {
      setReportActionBusy(null);
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
        intendedLevel: d.difficulty_profile?.intended_level ?? "",
        cognitiveDemand: d.difficulty_profile?.cognitive_demand ?? "",
        difficultyRationale: d.difficulty_profile?.rationale ?? "",
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
        difficulty_profile: {
          intended_level: edit.intendedLevel || null,
          cognitive_demand: edit.cognitiveDemand || null,
          rationale: edit.difficultyRationale.trim(),
          origin: "human",
        },
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

  async function sendToEditorialCuration(item: QuestionBankAdminQuestionListItem) {
    setError(null);
    setAnomalyCheckingId(item.id);
    try {
      await requestQuestionBankEditorialAnalysis(item.id);
      setNotice("Rascunho editorial criado. A decisão continua na aba Curadoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na verificação do enunciado.");
    } finally {
      setAnomalyCheckingId(null);
    }
  }

  const missingTopicPageItems = items.filter((item) => !item.has_primary_node);
  const missingDnaPageItems = items.filter((item) => !item.has_fingerprint);

  async function enqueueMissingDnaPageAnalysis() {
    setError(null);
    if (missingDnaPageItems.length === 0) {
      setNotice("Nenhuma questão sem DNA nesta página.");
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
      setNotice(`${queued} análise(s) de DNA enfileirada(s) nesta página.`);
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
      setNotice("Nenhuma questão sem tópico nesta página.");
      return;
    }
    setBulkAnalyzing(true);
    let queued = 0;
    try {
      for (const item of missingTopicPageItems) {
        await enqueueQuestionBankQuestionAnalysis(item.id);
        queued += 1;
      }
      setNotice(`${queued} reanálise(s) por IA enfileirada(s) nesta página.`);
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
    "border border-edge bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-edge";

  return (
    <section className="space-y-5 border border-edge bg-surface p-6 ">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Questões</h2>
        <p className="mt-1 text-sm text-ink">
          Busque, edite e remova questões. Editar revalida o gate de qualidade; apagar é soft-delete
          (sai do banco do aluno, reversível).
        </p>
      </div>

      <div className="border border-warning bg-surfaceMuted/70 p-4/40/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-warning">Denuncias abertas</h3>
            <p className="mt-1 text-xs text-warning/80/80">
              {reportsLoading ? "Carregando..." : `${reports.length} report(s) pendente(s)`}
            </p>
          </div>
          <button
            onClick={() => void refreshReports()}
            className="border border-warning px-3 py-1.5 text-xs font-semibold text-warning hover:bg-surfaceMuted"
          >
            Atualizar reports
          </button>
        </div>
        {reports.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {reports.map((report) => {
              const patchFields = reportPatchFields(report);
              const diagnosis = reportDiagnosisSummary(report);
              const recommendedAction = reportRecommendedAction(report);
              const isReportBusy = reportActionBusy === report.id;
              const isQuestionExpanded = expandedReportIds.has(report.id);
              const reportDetail = reportDetailsByQuestionId[report.question_id];
              const isQuestionLoading = reportDetailBusyId === report.id;
              return (
                <div key={report.id} className="border border-warning bg-surface p-3/40">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-warning">
                        {report.source_issue_kind || report.report_type ? <span>{report.source_issue_kind || report.report_type}</span> : null}
                        {report.severity ? <span>{report.severity}</span> : null}
                        <span>IA: {report.ai_triage_status || "não solicitada"}</span>
                        <span>reparo: {report.repair_status || "não solicitado"}</span>
                        <span>{report.question.status || "questão sem status"}</span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-ink">
                        {reportSourceLabel(report)}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {[
                          report.question.source.institution,
                          report.question.source.exam_name,
                          report.question.source.year,
                        ].filter(Boolean).join(" - ") || "fonte sem metadados"}
                      </div>
                      {report.report_reason ? (
                        <p className="mt-2 text-xs text-ink">{report.report_reason}</p>
                      ) : null}
                      {diagnosis ? (
                        <div className="mt-2 border border-warning bg-surfaceMuted/60 p-2 text-xs text-warning/40/20">
                          <p>{diagnosis}</p>
                          {recommendedAction ? <p className="mt-1 font-semibold">Ação sugerida: {recommendedAction}</p> : null}
                          {patchFields.length > 0 ? (
                            <p className="mt-1">Patch: {patchFields.slice(0, 5).join(", ")}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void toggleReportQuestion(report)}
                        disabled={isQuestionLoading}
                        className="mt-2 border border-warning px-3 py-1.5 text-xs font-semibold text-warning hover:bg-surfaceMuted disabled:opacity-50"
                      >
                        {isQuestionLoading ? "Carregando questão..." : isQuestionExpanded ? "Ocultar questão completa" : "Ver questão completa"}
                      </button>
                      {isQuestionExpanded ? (
                        reportDetail ? (
                          <QuestionFullContext
                            eyebrow="Questão denunciada"
                            stem={reportDetail.stem}
                            alternatives={reportDetail.alternatives}
                            imageRefs={reportDetail.image_refs}
                            source={reportDetail.source}
                            knowledgeNodes={reportDetail.nodes}
                            correctAnswer={reportDetail.answer}
                            showCorrectAnswer
                            className="mt-3 border border-warning bg-surfaceMuted/30 p-3/40/10"
                          />
                        ) : (
                          <div className="mt-3 border border-dashed border-warning px-3 py-2 text-xs text-warning">
                            Carregando questão completa...
                          </div>
                        )
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2 text-micro text-muted">
                        {report.candidate_id ? <span>candidate {report.candidate_id.slice(0, 8)}</span> : null}
                        {report.imported_file_id ? <span>import {report.imported_file_id.slice(0, 8)}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        onClick={() => void triageReport(report.id)}
                        disabled={isReportBusy}
                        className="border border-warning px-3 py-1.5 text-xs font-semibold text-warning hover:bg-surfaceMuted disabled:opacity-50"
                      >
                        Diagnosticar com IA
                      </button>
                      <button
                        onClick={() => void repairReport(report.id, "apply_patch")}
                        disabled={isReportBusy || patchFields.length === 0}
                        className="border border-info px-3 py-1.5 text-xs font-semibold text-info hover:bg-surfaceMuted disabled:opacity-50"
                      >
                        Aplicar patch
                      </button>
                      <button
                        onClick={() => void repairReport(report.id, "reanalyze_question")}
                        disabled={isReportBusy}
                        className="border border-accent px-3 py-1.5 text-xs font-semibold text-accent hover:bg-surfaceMuted disabled:opacity-50"
                      >
                        Reanalisar
                      </button>
                      <button
                        onClick={() => void repairReport(report.id, "block_question")}
                        disabled={isReportBusy}
                        className="border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-surfaceMuted disabled:opacity-50"
                      >
                        Bloquear
                      </button>
                      <button
                        onClick={() => void openEditor(report.question_id)}
                        className="border border-edge px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => void resolveReport(report.id)}
                        disabled={isReportBusy}
                        className="border border-success px-3 py-1.5 text-xs font-semibold text-success hover:bg-surfaceMuted disabled:opacity-50"
                      >
                        Resolver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {reportsError ? (
          <p className="mt-3 text-xs text-warning/80/80">{reportsError}</p>
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
        <span className="text-muted">Filas:</span>
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
            className="border border-edge px-3 py-1 font-medium text-ink hover:bg-surface"
          >
            {label}
          </button>
        ))}
        {(topicFilter || dnaFilter || lowConfidence || missingSimilar || needsReview) && (
          <button
            onClick={() => { setTopicFilter(""); setDnaFilter(""); setLowConfidence(false); setMissingSimilar(false); setNeedsReview(false); }}
            className="border border-edge px-3 py-1 text-muted hover:bg-surface"
          >
            limpar
          </button>
        )}
      </div>

      {error && (
        <div className="border border-danger bg-surfaceMuted px-4 py-3 text-sm text-danger/40/30">
          {error}
        </div>
      )}
      {notice && (
        <div className="border border-success bg-surfaceMuted px-4 py-3 text-sm text-success/40/30">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border border-edge bg-surface px-4 py-3 text-sm text-ink">
        <span>
          {missingTopicPageItems.length} sem tópico · {missingDnaPageItems.length} sem DNA nesta página
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void enqueueMissingDnaPageAnalysis()}
            disabled={loading || bulkAnalyzing || missingDnaPageItems.length === 0}
            className="border border-accent px-3 py-1.5 text-xs font-semibold text-accent hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bulkAnalyzing ? "Enfileirando..." : "Analisar DNA desta página"}
          </button>
          <button
            onClick={() => void enqueueMissingTopicPageAnalysis()}
            disabled={loading || bulkAnalyzing || missingTopicPageItems.length === 0}
            className="border border-info px-3 py-1.5 text-xs font-semibold text-info hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bulkAnalyzing ? "Enfileirando..." : "Analisar IA das sem tópico desta página"}
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-accent bg-surfaceMuted px-4 py-3 text-sm text-accent/40/30">
          <span className="font-semibold">{selected.size} selecionada(s)</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void bulkChangeStatus("publish")}
              disabled={bulkBusy}
              className="border border-success px-3 py-1.5 text-xs font-semibold text-success hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bulkBusy ? "Processando..." : "Publicar selecionadas"}
            </button>
            <button
              onClick={() => void bulkChangeStatus("unpublish")}
              disabled={bulkBusy}
              className="border border-edge px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar p/ revisão
            </button>
            <button
              onClick={() => void bulkDelete()}
              disabled={bulkBusy}
              className="border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apagar selecionadas
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto border border-edge">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
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
          <tbody className="divide-y divide-edge">
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
                <td className="max-w-md px-4 py-3 text-ink">
                  <p className="line-clamp-2">{item.stem}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.needs_topic_review && (
                      <span className="inline-block bg-surfaceMuted px-2 py-0.5 text-micro font-medium text-warning/40">
                        reavaliar tópico
                      </span>
                    )}
                    {item.has_image && (
                      <span className="inline-block bg-surface px-2 py-0.5 text-micro text-muted">
                        imagem
                      </span>
                    )}
                    {dnaChips(item.question_fingerprint?.tags).map((label) => (
                      <span
                        key={label}
                        className="inline-block bg-surfaceMuted px-2 py-0.5 text-micro font-medium text-accent/40"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink">
                  {item.has_primary_node ? (
                    <div>
                      <span className="font-semibold text-ink">{item.primary_node_code ?? ""}</span>
                      {item.primary_node_name ? <span className="ml-1">{item.primary_node_name}</span> : null}
                    </div>
                  ) : (
                    <span className="bg-surfaceMuted px-2 py-0.5 text-micro font-semibold text-warning/40">
                      Sem tópico
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink">
                  {[item.board_code, item.year].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-ink">{item.answer ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-micro font-semibold ${statusTone(item.status)}`}>
                    {item.status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => void openEditor(item.id)} className="border border-edge px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface">
                      Editar
                    </button>
                    {!item.has_primary_node ? (
                      <button onClick={() => void enqueueAnalysis(item)} className="border border-info px-2.5 py-1 text-xs font-semibold text-info hover:bg-surfaceMuted">
                        Analisar IA
                      </button>
                    ) : null}
                    <button
                      onClick={() => void sendToEditorialCuration(item)}
                      disabled={anomalyCheckingId === item.id}
                      title="Cria um rascunho editorial para decisão humana na aba Curadoria"
                      className="border border-warning px-2.5 py-1 text-xs font-semibold text-warning hover:bg-surfaceMuted disabled:opacity-50"
                    >
                      {anomalyCheckingId === item.id ? "Analisando…" : "Enviar à curadoria"}
                    </button>
                    {item.status === "published" ? (
                      <button onClick={() => void changeStatus(item, "unpublish")} className="border border-edge px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface">
                        Despublicar
                      </button>
                    ) : (
                      <button onClick={() => void changeStatus(item, "publish")} className="border border-success px-2.5 py-1 text-xs font-semibold text-success hover:bg-surfaceMuted">
                        Publicar
                      </button>
                    )}
                    <button onClick={() => void softDelete(item)} className="border border-danger px-2.5 py-1 text-xs font-semibold text-danger hover:bg-surfaceMuted">
                      Apagar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  Nenhuma questão encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-ink">
        <span>{loading ? "Carregando…" : `${total} questão(ões)`}</span>
        <div className="flex gap-2">
          <button
            disabled={offset === 0 || loading}
            onClick={() => void search(Math.max(0, offset - LIMIT))}
            className="border border-edge px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            disabled={offset + LIMIT >= total || loading}
            onClick={() => void search(offset + LIMIT)}
            className="border border-edge px-3 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Modal de edição */}
      {detail && edit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-paper p-4" onClick={closeEditor}>
          <div
            className="my-8 w-full max-w-3xl border border-edge bg-surface p-6 shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-ink">Editar questão</h3>
              <button onClick={closeEditor} className="text-muted hover:text-ink" aria-label="Fechar">×</button>
            </div>

            {detail.topic_review?.status === "pending" && (() => {
              const proposedId = detail.topic_review.proposed_primary_node_id ?? "";
              const proposed = detail.nodes.find((n) => n.knowledge_node_id === proposedId);
              const proposedLabel = proposed
                ? [proposed.node_code, proposed.node_name].filter(Boolean).join(" · ")
                : proposedId;
              return (
                <div className="mt-4 border border-warning bg-surfaceMuted px-4 py-3 text-sm text-warning/40/30">
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
                        className="bg-warning px-3 py-1 text-xs font-semibold text-ink hover:bg-warning disabled:opacity-50"
                      >
                        Tornar primário
                      </button>
                    )}
                    <button
                      onClick={() => void resolveTopicReview({ dismiss: true })}
                      disabled={saving}
                      className="border border-warning px-3 py-1 text-xs font-semibold text-warning hover:bg-surfaceMuted disabled:opacity-50"
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
                <div className="mt-4 border border-info bg-surfaceMuted px-4 py-3 text-sm text-info/40/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Leitura editorial da IA</p>
                      <p className="mt-1 font-semibold">{summary.route_label} · confiança {summary.confidence_label}</p>
                    </div>
                    <span className="bg-surface px-2 py-1 text-xs font-semibold">
                      {summary.review_lane}
                    </span>
                  </div>
                  {chips.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <span key={String(chip)} className="bg-surface px-2 py-0.5 text-xs font-medium">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                    <span><span className="font-semibold">Ação:</span> {summary.suggested_action}</span>
                    <span><span className="font-semibold">Impacto:</span> {summary.adaptive_impact}</span>
                    {classification.charge_pattern ? <span><span className="font-semibold">Cobranca:</span> {classification.charge_pattern}</span> : null}
                    {summary.open_reports ? <span><span className="font-semibold">Reports:</span> {summary.open_reports}</span> : null}
                  </div>
                </div>
              );
            })()}

            {detail.question_fingerprint && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border border-edge bg-surface px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">DNA</span>
                {dnaChips(detail.question_fingerprint.tags).map((label) => (
                  <span key={label} className="bg-surfaceMuted px-2 py-0.5 text-micro font-medium text-accent/40">{label}</span>
                ))}
                {(detail.question_fingerprint.quality_flags ?? []).map((flag) => (
                  <span key={flag} className="bg-surfaceMuted px-2 py-0.5 text-micro font-medium text-warning/40">{flag}</span>
                ))}
              </div>
            )}

            {detail.question_quality_inspection && (
              <div className="mt-4 border border-info bg-surfaceMuted px-4 py-3 text-sm text-info/40/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Inspeção editorial</span>
                  <span className="bg-surface px-2 py-0.5 text-xs font-semibold">
                    {detail.question_quality_inspection.inspection_status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(detail.question_quality_inspection.blocking_flags ?? []).map((flag) => (
                    <span key={flag.code} className="bg-surfaceMuted px-2 py-0.5 text-micro font-medium text-danger/40">
                      {flag.message}
                    </span>
                  ))}
                  {(detail.question_quality_inspection.warning_flags ?? []).slice(0, 3).map((flag) => (
                    <span key={flag.code} className="bg-surfaceMuted px-2 py-0.5 text-micro font-medium text-warning/40">
                      {flag.message}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.repair_draft?.summary && (
              <div className="mt-4 border border-edge bg-surface px-4 py-3 text-sm text-ink">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Repair draft</p>
                <p className="mt-1">{detail.repair_draft.summary}</p>
              </div>
            )}

            {detail.similar_questions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Questões similares (DNA)</p>
                <ul className="mt-1 space-y-1">
                  {detail.similar_questions.map((s) => (
                    <li key={s.id} className="border border-edge px-3 py-2 text-sm text-ink">
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 flex-1">{s.stem || s.id}</span>
                        <span className="shrink-0 text-micro text-muted">
                          {s.match_scope ?? "—"} · {s.confidence != null ? `${Math.round(s.confidence * 100)}%` : "—"}
                        </span>
                      </div>
                      {(s.primary_node_code || s.primary_node_name) && (
                        <span className="text-micro text-muted">
                          {[s.primary_node_code, s.primary_node_name].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockers.length > 0 && (
              <div className="mt-4 border border-danger bg-surfaceMuted px-4 py-3 text-sm text-danger/40/30">
                <p className="font-semibold">Não salvo — a edição falha no gate:</p>
                <ul className="mt-1 list-disc pl-5">
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Enunciado</label>
            <textarea
              value={edit.stem}
              onChange={(e) => setEdit({ ...edit, stem: e.target.value })}
              className={`${inputCls} mt-1 min-h-32 w-full resize-y`}
            />

            <div className="mt-4 grid gap-2">
              {OPTION_LETTERS.map((letter) => (
                <div key={letter} className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm font-semibold text-ink">{letter}</span>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Diagnóstico de erro por alternativa
              </p>
              <div className="mt-1 grid gap-2">
                {OPTION_LETTERS.filter((letter) => letter !== edit.answer && (edit.alternatives[letter] ?? "").trim()).map(
                  (letter) => (
                    <div key={letter} className="flex items-start gap-2">
                      <span className="mt-2 w-6 text-center text-sm font-semibold text-accent">{letter}</span>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Gabarito</label>
                <select value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} className={`${inputCls} mt-1`}>
                  <option value="">—</option>
                  {OPTION_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Nível pretendido</label>
                <select value={edit.intendedLevel} onChange={(e) => setEdit({ ...edit, intendedLevel: e.target.value as EditState["intendedLevel"] })} className={`${inputCls} mt-1`}>
                  <option value="">Não definido</option><option value="easy">Fácil</option><option value="medium">Médio</option><option value="hard">Difícil</option><option value="very_hard">Muito difícil</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Demanda cognitiva</label>
                <select value={edit.cognitiveDemand} onChange={(e) => setEdit({ ...edit, cognitiveDemand: e.target.value as EditState["cognitiveDemand"] })} className={`${inputCls} mt-1`}>
                  <option value="">Não definida</option><option value="recall">Recordação</option><option value="application">Aplicação</option><option value="analysis">Análise</option>
                </select>
              </div>
              <div className="relative min-w-[14rem] flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Tópico primário</label>
                <input
                  value={nodeQuery || edit.primaryNodeLabel}
                  onChange={(e) => { setNodeQuery(e.target.value); }}
                  placeholder="Buscar tópico…"
                  className={`${inputCls} mt-1 w-full`}
                />
                {nodeResults.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto border border-edge bg-surface shadow-overlay">
                    {nodeResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setEdit({ ...edit, primaryNodeId: node.id, primaryNodeLabel: node.name });
                          setNodeQuery("");
                          setNodeResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                      >
                        <span className="font-medium">{node.name}</span>
                        <span className="ml-2 text-xs text-muted">{node.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Justificativa do nível · origem humana</label>
              <textarea value={edit.difficultyRationale} onChange={(e) => setEdit({ ...edit, difficultyRationale: e.target.value })} rows={2} placeholder="Que evidência do item sustenta este nível?" className={`${inputCls} mt-1 w-full`} />
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Objetivo âncora
              </label>
              <p className="mt-0.5 text-micro text-muted">
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 border border-edge px-1.5 py-0.5 text-nano font-semibold text-muted hover:bg-surface"
                  >
                    limpar
                  </button>
                ) : null}
                {objectiveResults.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto border border-edge bg-surface shadow-overlay">
                    {objectiveResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setEdit({ ...edit, anchorNodeId: node.id, anchorNodeLabel: node.name });
                          setObjectiveQuery("");
                          setObjectiveResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                      >
                        <span className="font-medium">{node.name}</span>
                        {node.code ? <span className="ml-2 text-xs text-muted">{node.code}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {detail.nodes.some((n) => !n.is_primary) && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tópicos secundários</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {detail.nodes.filter((n) => !n.is_primary).map((n) => (
                    <span
                      key={`${n.knowledge_node_id}-${n.role ?? ""}`}
                      className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 text-micro text-ink"
                    >
                      {[n.node_code, n.node_name].filter(Boolean).join(" · ") || n.knowledge_node_id}
                      {n.source === "dedup_enrichment" ? (
                        <span className="text-muted">· reimporte</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.image_refs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Imagens</p>
                <QuestionImageRefs
                  imageRefs={detail.image_refs}
                  className="mt-2 grid gap-2 md:grid-cols-3"
                  imageClassName="border border-edge"
                  placeholderClassName="flex min-h-24 items-center justify-center border border-dashed border-edge bg-surface px-3 py-5 text-center text-xs font-semibold text-muted"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeEditor} className="border border-edge px-4 py-2 text-sm font-semibold text-ink hover:bg-surface">
                Cancelar
              </button>
              <button onClick={() => void saveEdit()} disabled={saving} className="bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50">
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
