"use client";

import { Suspense, useEffect, useState } from "react";

import AdminOverview, { AdminViewSwitcher, type AdminQuestionBankView } from "./_components/AdminOverview";
import AiReviewPanel from "./_components/AiReviewPanel";
import AiResolutionPanel from "./_components/AiResolutionPanel";
import CandidatesPanel from "./_components/CandidatesPanel";
import ImportWorkspace from "./_components/ImportWorkspace";
import PipelineDiagnosticsPanel from "./_components/PipelineDiagnosticsPanel";
import QuestionsManager from "./_components/QuestionsManager";
import {
  DEFAULT_METADATA,
  DEFAULT_DEDUP_BATCH_SIZE,
  DEFAULT_DEDUP_WORKERS,
  JOB_TYPES,
  compactQuestionOverrides,
  formatRelativeTime,
  normalizeGrandeArea,
  parseYearsText,
  safeMetadataObject,
} from "./_components/adminQuestionBankUtils";
import {
  getQuestionBankAdminCandidates,
  getQuestionBankAdminImport,
  getQuestionBankAdminPipelineStatus,
  getQuestionBankAdminReadiness,
  dryRunStemIncompleteReclassification,
  importQuestionBankAdminFile,
  listQuestionBankAdminImports,
  previewQuestionBankAdminImport,
  processQuestionBankAdminBatch,
  runQuestionBankAdminAll,
  type QuestionBankAdminCandidate,
  type QuestionBankAdminImportItem,
  type QuestionBankAdminPipelineStatus,
  type QuestionBankAdminPreview,
  type QuestionBankAdminReadiness,
  type QuestionBankStemIncompleteReclassification,
} from "@/lib/api/domains/question-bank-admin";

const ACTIVE_PIPELINE_POLL_MS = 30_000;

export default function QuestionBankAdminPage() {
  const [imports, setImports] = useState<QuestionBankAdminImportItem[]>([]);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [selectedImport, setSelectedImport] = useState<QuestionBankAdminImportItem | null>(null);
  const [candidates, setCandidates] = useState<QuestionBankAdminCandidate[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<QuestionBankAdminPipelineStatus | null>(null);
  const [readiness, setReadiness] = useState<QuestionBankAdminReadiness | null>(null);
  const [preview, setPreview] = useState<QuestionBankAdminPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState<Set<string>>(new Set());
  const [metadataText, setMetadataText] = useState(JSON.stringify(DEFAULT_METADATA, null, 2));
  const [questionOverrides, setQuestionOverrides] = useState<Record<string, Record<string, unknown>>>({});
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [candidateStatus, setCandidateStatus] = useState("");
  const [jobType, setJobType] = useState<string>(JOB_TYPES[0]!);
  const [batchSize, setBatchSize] = useState(DEFAULT_DEDUP_BATCH_SIZE);
  const [workers, setWorkers] = useState(DEFAULT_DEDUP_WORKERS);
  const [autoPipeline, setAutoPipeline] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [stemReclassResult, setStemReclassResult] = useState<QuestionBankStemIncompleteReclassification | null>(null);
  const [view, setView] = useState<AdminQuestionBankView>("ingestao");
  const [viewReady, setViewReady] = useState(false);

  const previewSummary = preview?.preview_summary;
  const previewDiagnostics = previewSummary?.question_diagnostics
    ?? previewSummary?.quality_summary?.question_diagnostics
    ?? [];
  const previewDiagnosticsByNumber = new Map(
    previewDiagnostics.map((item) => [String(item.question_number ?? "").trim(), item]),
  );
  const metadataDraft = { ...DEFAULT_METADATA, ...safeMetadataObject(metadataText) };
  const activeQuestionOverrides = compactQuestionOverrides(questionOverrides);

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "ingestao" || requestedView === "curadoria" || requestedView === "resolucao-ia" || requestedView === "questoes") {
      setView(requestedView);
    }
    setViewReady(true);
  }, []);

  function parseMetadata(): Record<string, unknown> {
    const parsed = JSON.parse(metadataText || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("O override precisa ser um JSON objeto.");
    }
    const metadata = parsed as Record<string, unknown>;
    return { ...metadata, grande_area: normalizeGrandeArea(metadata.grande_area) };
  }

  function updateMetadataField(key: string, rawValue: string) {
    const current = { ...DEFAULT_METADATA, ...safeMetadataObject(metadataText) };
    const value = key === "years"
      ? parseYearsText(rawValue)
      : key === "grande_area"
        ? normalizeGrandeArea(rawValue)
        : rawValue;
    setMetadataText(JSON.stringify({
      ...current,
      [key]: value,
      classification_preset_policy: "lock_filled_fields",
    }, null, 2));
  }

  function updateQuestionOverride(questionNumber: unknown, key: string, rawValue: string) {
    const number = String(questionNumber ?? "").trim();
    if (!number) return;
    setQuestionOverrides((prev) => {
      const current = { ...(prev[number] || {}) };
      current[key] = key === "year" && rawValue.trim()
        ? Number.parseInt(rawValue.trim(), 10)
        : key === "grande_area"
          ? normalizeGrandeArea(rawValue)
          : rawValue;
      return { ...prev, [number]: current };
    });
  }

  function removeQuestionOverrideField(questionNumber: unknown, key: string) {
    const number = String(questionNumber ?? "").trim();
    if (!number) return;
    setQuestionOverrides((prev) => {
      const current = { ...(prev[number] || {}) };
      delete current[key];
      const next = { ...prev };
      if (Object.keys(current).length > 0) next[number] = current;
      else delete next[number];
      return next;
    });
  }

  async function loadImports(nextSelectedImportId?: string) {
    const response = await listQuestionBankAdminImports({ limit: 12, show_artifacts: showArtifacts });
    setImports(response.imports);
    const visibleSelectedImportId = response.imports.find((item) => item.id === selectedImportId)?.id || "";
    const importId = nextSelectedImportId || visibleSelectedImportId || response.imports[0]?.id || "";
    if (!importId) {
      setSelectedImport(null);
      setCandidates([]);
      return;
    }

    setSelectedImportId(importId);
    const [importDetail, candidateResponse] = await Promise.all([
      getQuestionBankAdminImport(importId),
      getQuestionBankAdminCandidates(importId, { status: candidateStatus || undefined, limit: 30 }),
    ]);
    setSelectedImport(importDetail);
    setCandidates(candidateResponse.items);
  }

  async function loadDashboard(nextSelectedImportId?: string) {
    const [status, readinessValue] = await Promise.all([
      getQuestionBankAdminPipelineStatus(),
      getQuestionBankAdminReadiness(),
    ]);
    setPipelineStatus(status);
    setReadiness(readinessValue);
    await loadImports(nextSelectedImportId);
    setLastRefreshed(new Date());
  }

  async function runSafely(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setBusy("Carregando painel");
      setError("");
      try {
        const [status, readinessValue] = await Promise.all([
          getQuestionBankAdminPipelineStatus(),
          getQuestionBankAdminReadiness(),
        ]);
        if (!active) return;
        setPipelineStatus(status);
        setReadiness(readinessValue);

        const response = await listQuestionBankAdminImports({ limit: 12, show_artifacts: showArtifacts });
        if (!active) return;
        setImports(response.imports);

        const initialImportId = response.imports[0]?.id || "";
        if (!initialImportId) {
          setSelectedImport(null);
          setCandidates([]);
          return;
        }

        setSelectedImportId(initialImportId);
        const [importDetail, candidateResponse] = await Promise.all([
          getQuestionBankAdminImport(initialImportId),
          getQuestionBankAdminCandidates(initialImportId, { limit: 30 }),
        ]);
        if (!active) return;
        setSelectedImport(importDetail);
        setCandidates(candidateResponse.items);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setBusy("");
      }
    })();
    return () => {
      active = false;
    };
  }, [showArtifacts]);

  useEffect(() => {
    if (!selectedImportId) return;
    let active = true;
    void (async () => {
      setBusy("Atualizando candidatos");
      setError("");
      try {
        const [importDetail, candidateResponse] = await Promise.all([
          getQuestionBankAdminImport(selectedImportId),
          getQuestionBankAdminCandidates(selectedImportId, { status: candidateStatus || undefined, limit: 30 }),
        ]);
        if (!active) return;
        setSelectedImport(importDetail);
        setCandidates(candidateResponse.items);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setBusy("");
      }
    })();
    return () => {
      active = false;
    };
  }, [candidateStatus, selectedImportId]);

  useEffect(() => {
    const hasActiveJobs =
      (pipelineStatus?.summary.pending_jobs ?? 0) > 0 ||
      (pipelineStatus?.summary.processing_jobs ?? 0) > 0;
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!busy) void loadDashboard(selectedImportId || undefined);
    }, ACTIVE_PIPELINE_POLL_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineStatus?.summary.pending_jobs, pipelineStatus?.summary.processing_jobs, busy, selectedImportId]);

  function selectImport(importId: string) {
    void runSafely("Abrindo import", async () => {
      setSelectedImportId(importId);
      const [detail, candidateResponse] = await Promise.all([
        getQuestionBankAdminImport(importId),
        getQuestionBankAdminCandidates(importId, { status: candidateStatus || undefined, limit: 30 }),
      ]);
      setSelectedImport(detail);
      setCandidates(candidateResponse.items);
    });
  }

  function handleJobTypeChange(value: string) {
    setJobType(value);
    if (value === "dedup_question") {
      setBatchSize(DEFAULT_DEDUP_BATCH_SIZE);
      setWorkers(DEFAULT_DEDUP_WORKERS);
    }
  }

  function handleRetryStage(stageJobType: string) {
    void runSafely(`Retry ${stageJobType}`, async () => {
      await processQuestionBankAdminBatch(stageJobType, batchSize, workers, selectedImportId || undefined);
      await loadDashboard(selectedImportId || undefined);
    });
  }

  function changeView(nextView: AdminQuestionBankView) {
    setView(nextView);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.replaceState({}, "", url);
  }

  function previewStemReclassification() {
    void runSafely("Auditando stem_incomplete", async () => {
      const result = await dryRunStemIncompleteReclassification({ limit: 1000, sampleSize: 8 });
      setStemReclassResult(result);
    });
  }

  const viewSwitcher = <AdminViewSwitcher view={view} onViewChange={changeView} />;

  if (!viewReady) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-busy="true" />;
  }

  if (view === "curadoria") {
    return (
      <div className="space-y-6">
        {viewSwitcher}
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />}>
          <AiReviewPanel />
        </Suspense>
      </div>
    );
  }

  if (view === "questoes") {
    return (
      <div className="space-y-6">
        {viewSwitcher}
        <QuestionsManager />
      </div>
    );
  }

  if (view === "resolucao-ia") {
    return (
      <div className="space-y-6">
        {viewSwitcher}
        <AiResolutionPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewSwitcher}
      <AdminOverview
        pipelineStatus={pipelineStatus}
        lastRefreshedLabel={lastRefreshed ? formatRelativeTime(lastRefreshed) : ""}
        error={error}
        busy={busy}
        onRefresh={() => void runSafely("Atualizando paineis", async () => loadDashboard())}
        onRunAll={() => {
          if (!selectedImportId) {
            setError("Selecione um import para rodar o pipeline completo de forma escopada.");
            return;
          }
          if (!window.confirm("Rodar pipeline completo em background apenas para o import selecionado?")) return;
          void runSafely("Rodando pipeline completo", async () => {
            await runQuestionBankAdminAll(true, selectedImportId);
            await loadDashboard(selectedImportId);
          });
        }}
        stemReclassResult={stemReclassResult}
        onPreviewStemReclassification={previewStemReclassification}
      />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ImportWorkspace
          file={file}
          metadataDraft={metadataDraft}
          metadataText={metadataText}
          autoPipeline={autoPipeline}
          preview={preview}
          previewSummary={previewSummary}
          previewDiagnosticsByNumber={previewDiagnosticsByNumber}
          previewOpen={previewOpen}
          questionOverrides={questionOverrides}
          activeQuestionOverrides={activeQuestionOverrides}
          imports={imports}
          selectedImportId={selectedImportId}
          showArtifacts={showArtifacts}
          onFileChange={setFile}
          onMetadataTextChange={setMetadataText}
          onMetadataFieldChange={updateMetadataField}
          onAutoPipelineChange={setAutoPipeline}
          onPreviewOpenChange={setPreviewOpen}
          onQuestionOverrideChange={updateQuestionOverride}
          onQuestionOverrideRemove={removeQuestionOverrideField}
          onPreview={() => void runSafely("Gerando preview", async () => {
            if (!file) throw new Error("Escolha um PDF antes do preview.");
            setPreview(await previewQuestionBankAdminImport(file, parseMetadata(), activeQuestionOverrides));
          })}
          onImport={() => void runSafely("Importando PDF", async () => {
            if (!file) throw new Error("Escolha um PDF antes de importar.");
            const result = await importQuestionBankAdminFile(file, parseMetadata(), {
              auto_pipeline: autoPipeline,
              question_overrides: activeQuestionOverrides,
            });
            if (result.preview_summary && preview) {
              setPreview({ ...preview, preview_summary: result.preview_summary });
            }
            await loadDashboard(result.imported_file_id);
          })}
          onSelectImport={selectImport}
          onShowArtifactsChange={setShowArtifacts}
          formatRelativeTime={formatRelativeTime}
        />

        <PipelineDiagnosticsPanel
          pipelineStatus={pipelineStatus}
          readiness={readiness}
          selectedPipeline={selectedImport?.pipeline ?? null}
          selectedImportId={selectedImportId}
          jobType={jobType}
          batchSize={batchSize}
          workers={workers}
          expandedError={expandedError}
          onJobTypeChange={handleJobTypeChange}
          onBatchSizeChange={setBatchSize}
          onWorkersChange={setWorkers}
          onExpandedErrorChange={setExpandedError}
          onRunBatch={() => void runSafely(`Rodando ${jobType}`, async () => {
            await processQuestionBankAdminBatch(jobType, batchSize, workers, selectedImportId || undefined);
            await loadDashboard(selectedImportId || undefined);
          })}
          onRetryStage={handleRetryStage}
          onRefresh={() => void runSafely("Recarregando pipeline", async () => loadDashboard(selectedImportId))}
          formatRelativeTime={formatRelativeTime}
        />
      </section>

      <CandidatesPanel
        candidates={candidates}
        candidateStatus={candidateStatus}
        onCandidateStatusChange={setCandidateStatus}
        onOpenCuradoria={() => changeView("curadoria")}
      />
    </div>
  );
}
