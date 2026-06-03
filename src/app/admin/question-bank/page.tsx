"use client";

import { useEffect, useState } from "react";

import {
  getQuestionBankAdminCandidates,
  getQuestionBankAdminImport,
  getQuestionBankAdminPipelineStatus,
  getQuestionBankAdminReadiness,
  getQuestionBankReviewQueue,
  importQuestionBankAdminFile,
  listQuestionBankAdminImports,
  previewQuestionBankAdminImport,
  processQuestionBankAdminBatch,
  resolveQuestionBankReviewCandidate,
  runQuestionBankAdminAll,
  updateQuestionBankQuestionStatus,
  type QuestionBankAdminCandidate,
  type QuestionBankAdminImportItem,
  type QuestionBankAdminPipelineStatus,
  type QuestionBankAdminPreview,
  type QuestionBankAdminReadiness,
  type QuestionBankAdminWarning,
  type QuestionBankReviewQueueItem,
} from "@/lib/api/domains/question-bank-admin";

const DEFAULT_METADATA = {
  years: [],
  grande_area: "",
  tema: "",
  subtema: "",
  microcompetencia: "",
};

const JOB_TYPES = [
  "dedup_question",
  "heuristic_classify_question",
  "cheap_ai_classify_question",
  "route_question_analysis",
  "strong_ai_classify_question",
  "publish_question",
];

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "danger" | "accent";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
      : tone === "accent"
        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
        : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function MetadataPill({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  const rendered = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <span className="opacity-60">{label}: </span>
      <span>{rendered}</span>
    </div>
  );
}

function WarningBox({ warning }: { warning: QuestionBankAdminWarning }) {
  const toneClasses =
    warning.severity === "critical"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200";
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em]">{warning.code}</div>
      <div className="mt-1 text-sm">{warning.message}</div>
      {warning.years_detected?.length ? (
        <div className="mt-2 text-xs">Anos detectados: {warning.years_detected.join(", ")}</div>
      ) : null}
      {warning.samples?.length ? (
        <div className="mt-2 space-y-2 text-xs">
          {warning.samples.map((sample) => (
            <div key={`${sample.question_number}-${sample.sample}`} className="rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
              <span className="font-semibold">Q{sample.question_number ?? "?"}</span>: {sample.sample}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CandidateRow({ item }: { item: QuestionBankAdminCandidate }) {
  const gradeColor = item.content_grade === "usable" ? "text-green-600 dark:text-green-400"
    : item.content_grade === "raw" ? "text-yellow-600 dark:text-yellow-400"
    : "text-gray-400";
  return (
    <tr className="border-t border-gray-100 align-top text-sm dark:border-gray-800">
      <td className="px-3 py-3 font-medium text-gray-700 dark:text-gray-200">{item.question_number ?? "-"}</td>
      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{item.original_page ?? "-"}</td>
      <td className="px-3 py-3">
        <div className="font-medium text-gray-900 dark:text-gray-100">{item.status || "-"}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{item.question_status || "sem questao"}</div>
      </td>
      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{item.year ?? "-"}</td>
      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{item.institution || "-"}</td>
      <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
        {item.raw_stem ? item.raw_stem.slice(0, 120) + (item.raw_stem.length > 120 ? "…" : "") : "-"}
      </td>
      <td className={`px-3 py-3 text-xs font-medium ${gradeColor}`}>
        {item.content_grade || "—"}
        {item.has_image && <span className="ml-1 text-blue-400" title="Tem imagem">🖼</span>}
      </td>
      <td className="px-3 py-3 text-right">
        {(() => {
          const conf = item.classification_confidence ?? item.extraction_confidence;
          if (conf === null || conf === undefined) return <span className="text-gray-400">—</span>;
          const cls = conf >= 0.85 ? "text-green-600 font-semibold dark:text-green-400"
            : conf >= 0.60 ? "text-yellow-600 dark:text-yellow-400"
            : "text-red-500 dark:text-red-400";
          return <span className={cls}>{conf.toFixed(2)}</span>;
        })()}
      </td>
    </tr>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-950/95 p-4 text-white dark:border-gray-800">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</div>
      <pre className="overflow-auto text-xs leading-6 text-gray-100">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export default function QuestionBankAdminPage() {
  const [imports, setImports] = useState<QuestionBankAdminImportItem[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string>("");
  const [selectedImport, setSelectedImport] = useState<QuestionBankAdminImportItem | null>(null);
  const [candidates, setCandidates] = useState<QuestionBankAdminCandidate[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<QuestionBankAdminPipelineStatus | null>(null);
  const [readiness, setReadiness] = useState<QuestionBankAdminReadiness | null>(null);
  const [preview, setPreview] = useState<QuestionBankAdminPreview | null>(null);
  const [metadataText, setMetadataText] = useState(JSON.stringify(DEFAULT_METADATA, null, 2));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<string>("");
  const [candidateStatus, setCandidateStatus] = useState<string>("");
  const [jobType, setJobType] = useState<string>(JOB_TYPES[0]!);
  const [batchSize, setBatchSize] = useState<number>(3);
  const [workers, setWorkers] = useState<number>(1);
  const [autoPipeline, setAutoPipeline] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<QuestionBankReviewQueueItem[]>([]);
  const [showReviewQueue, setShowReviewQueue] = useState<boolean>(false);
  const [reviewTotal, setReviewTotal] = useState<number>(0);

  function formatRelativeTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `há ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} min`;
    return `às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function parseMetadata(): Record<string, unknown> {
    const parsed = JSON.parse(metadataText || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("O override precisa ser um JSON objeto.");
    }
    return parsed as Record<string, unknown>;
  }

  async function loadImports(nextSelectedImportId?: string) {
    const response = await listQuestionBankAdminImports({ limit: 12 });
    setImports(response.imports);
    const importId = nextSelectedImportId || selectedImportId || response.imports[0]?.id || "";
    if (importId) {
      setSelectedImportId(importId);
      const [importDetail, candidateResponse] = await Promise.all([
        getQuestionBankAdminImport(importId),
        getQuestionBankAdminCandidates(importId, { status: candidateStatus || undefined, limit: 30 }),
      ]);
      setSelectedImport(importDetail);
      setCandidates(candidateResponse.items);
    } else {
      setSelectedImport(null);
      setCandidates([]);
    }
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
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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

        const response = await listQuestionBankAdminImports({ limit: 12 });
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
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setBusy("");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
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
      if (!busy) void loadDashboard(selectedImportId || undefined);
    }, 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineStatus?.summary.pending_jobs, pipelineStatus?.summary.processing_jobs, busy, selectedImportId]);

  function handleRetryStage(stageJobType: string) {
    void runSafely(`Retry ${stageJobType}`, async () => {
      await processQuestionBankAdminBatch(stageJobType, batchSize, workers, selectedImportId || undefined);
      await loadDashboard(selectedImportId || undefined);
    });
  }

  async function loadReviewQueue() {
    void runSafely("Carregando fila de review", async () => {
      const res = await getQuestionBankReviewQueue({ limit: 20, imported_file_id: selectedImportId || undefined });
      setReviewItems(res.items);
      setReviewTotal(res.total);
      setShowReviewQueue(true);
    });
  }

  function handleReviewResolve(
    candidateId: string,
    action: "accept_as_canonical" | "accept_as_duplicate" | "discard",
    questionId?: string,
  ) {
    void runSafely(`Resolvendo candidate (${action})`, async () => {
      await resolveQuestionBankReviewCandidate(candidateId, action, { question_id: questionId });
      const res = await getQuestionBankReviewQueue({ limit: 20, imported_file_id: selectedImportId || undefined });
      setReviewItems(res.items);
      setReviewTotal(res.total);
    });
  }

  const previewSummary = preview?.preview_summary;
  const selectedPipeline = selectedImport?.pipeline;

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              Banco de Questoes
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">
              Curadoria operacional do KrosBank
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
              Este painel vira a superficie canonica para importar, diagnosticar ruido do preview,
              observar o pipeline e validar o que realmente ficou pronto para publicar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatRelativeTime(lastRefreshed)}
              </span>
            )}
            <button
              onClick={() => void runSafely("Atualizando paineis", async () => loadDashboard())}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Atualizar tudo
            </button>
            <button
              onClick={() => {
                if (!window.confirm("Isso vai rodar o pipeline completo em background para todos os imports. Continuar?")) return;
                void runSafely("Rodando pipeline completo", async () => {
                  await runQuestionBankAdminAll(true);
                  await loadDashboard(selectedImportId);
                });
              }}
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              Rodar loop completo
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {busy ? (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            {busy}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pendentes" value={pipelineStatus?.summary.pending_jobs ?? 0} />
        <StatCard label="Processando" value={pipelineStatus?.summary.processing_jobs ?? 0} tone="accent" />
        <StatCard label="Falhos" value={pipelineStatus?.summary.failed_jobs ?? 0} tone="danger" />
        <StatCard label="Publicadas" value={pipelineStatus?.summary.published_questions ?? 0} />
        <StatCard label="Review humano" value={pipelineStatus?.summary.human_review_questions ?? 0} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Imports</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Preview primeiro, import depois. Override apenas no nivel de tema que voce quer controlar.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Override editorial JSON
                <textarea
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                  className="min-h-[220px] rounded-3xl border border-gray-300 bg-gray-50 px-4 py-4 font-mono text-xs leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={autoPipeline}
                  onChange={(e) => setAutoPipeline(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Processar pipeline automaticamente após importar
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void runSafely("Gerando preview", async () => {
                    if (!file) throw new Error("Escolha um PDF antes de pedir preview.");
                    const previewResponse = await previewQuestionBankAdminImport(file, parseMetadata());
                    setPreview(previewResponse);
                  })}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Preview e diagnostico
                </button>
                <button
                  onClick={() => void runSafely("Importando PDF", async () => {
                    if (!file) throw new Error("Escolha um PDF antes de importar.");
                    const result = await importQuestionBankAdminFile(file, parseMetadata(), { auto_pipeline: autoPipeline });
                    if (result.preview_summary && preview) {
                      setPreview({ ...preview, preview_summary: result.preview_summary });
                    }
                    await loadDashboard(result.imported_file_id);
                  })}
                  className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                >
                  Importar no banco
                </button>
              </div>
            </div>

            {previewSummary ? (
              <div className="mt-6 space-y-4 rounded-[24px] border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/70">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview diagnostico</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    O preview mostra o que o extrator detectou; a importacao nao deve fingir certeza quando houver conflito.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MetadataPill label="anos detectados" value={previewSummary.years_detected} />
                  <MetadataPill label="anos aplicados" value={previewSummary.years_applied} />
                  <MetadataPill label="fonte mista" value={previewSummary.is_mixed_source ? "sim" : "nao"} />
                  <MetadataPill label="instituicao" value={previewSummary.detected_metadata.institution} />
                  <MetadataPill label="acesso" value={previewSummary.detected_metadata.access_type} />
                </div>
                {previewSummary.warnings.length ? (
                  <div className="grid gap-3">
                    {previewSummary.warnings.map((warning) => (
                      <WarningBox key={warning.code} warning={warning} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                    Nenhum alerta estrutural critico apareceu nesse preview.
                  </div>
                )}
                <div className="grid gap-4 xl:grid-cols-2">
                  <JsonPanel title="Detectado" value={previewSummary.detected_metadata} />
                  <JsonPanel title="Import usado" value={previewSummary.import_metadata_used} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Historico de imports</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Escolha um import para inspecionar candidatos, pipeline e bloqueios de publicacao.
                </p>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-950">
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-semibold">Arquivo</th>
                    <th className="px-4 py-3 font-semibold">Anos</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Fila</th>
                    <th className="px-4 py-3 font-semibold">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((item) => {
                    const active = item.id === selectedImportId;
                    return (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-950 ${active ? "bg-blue-50/80 dark:bg-blue-950/20" : ""}`}
                        onClick={() => void runSafely("Abrindo import", async () => {
                          setSelectedImportId(item.id);
                          const [detail, candidateResponse] = await Promise.all([
                            getQuestionBankAdminImport(item.id),
                            getQuestionBankAdminCandidates(item.id, { status: candidateStatus || undefined, limit: 30 }),
                          ]);
                          setSelectedImport(detail);
                          setCandidates(candidateResponse.items);
                        })}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {item.file_name || item.id}
                            {item.is_mixed_source && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                misto
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.source.exam_name || item.source.institution || "sem fonte resumida"}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {item.years_detected.length ? item.years_detected.join(", ") : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.status || "-"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          P {item.pipeline_counts?.pending ?? 0} / F {item.pipeline_counts?.failed ?? 0}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                          {item.created_at ? formatRelativeTime(item.created_at) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pipeline</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Rodar lotes pequenos, observar erros por etapa e evitar publicar coisa ruim sem perceber.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Etapa
                <select
                  value={jobType}
                  onChange={(event) => setJobType(event.target.value)}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Batch size
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={batchSize}
                  onChange={(event) => setBatchSize(Number(event.target.value))}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Workers
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={workers}
                  onChange={(event) => setWorkers(Number(event.target.value))}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void runSafely(`Rodando ${jobType}`, async () => {
                  await processQuestionBankAdminBatch(jobType, batchSize, workers, selectedImportId || undefined);
                  await loadDashboard(selectedImportId || undefined);
                })}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Rodar proximo lote
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {selectedImportId ? "Escopo: import selecionado" : "Escopo: global"}
              </span>
              <button
                onClick={() => void runSafely("Recarregando pipeline", async () => {
                  await loadDashboard(selectedImportId);
                })}
                className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Recalcular
              </button>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-950">
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-semibold">Etapa</th>
                    <th className="px-4 py-3 font-semibold">Fila</th>
                    <th className="px-4 py-3 font-semibold">Media</th>
                    <th className="px-4 py-3 font-semibold">Ultimo erro</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPipeline?.stage_stats || pipelineStatus?.stage_stats || []).map((stage) => (
                    <tr key={stage.job_type} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{stage.job_type}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        <span>{stage.pending} p / {stage.processing} proc / {stage.done} done</span>
                        {stage.failed > 0 && (
                          <button
                            onClick={() => handleRetryStage(stage.job_type)}
                            title={`Retry ${stage.failed} jobs falhos nesta etapa`}
                            className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
                          >
                            ↺ {stage.failed}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {stage.avg_duration_ms ? `${stage.avg_duration_ms} ms` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {stage.last_error ? (
                          <div>
                            <button
                              onClick={() => setExpandedError(expandedError === stage.job_type ? null : stage.job_type)}
                              className="text-left text-red-500 underline decoration-dotted hover:text-red-700 dark:text-red-400"
                            >
                              {stage.last_error.length > 60 ? stage.last_error.slice(0, 60) + "…" : stage.last_error}
                            </button>
                            {expandedError === stage.job_type && (
                              <pre className="mt-1 max-w-xs overflow-auto rounded-xl bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                {stage.last_error}
                              </pre>
                            )}
                            {stage.last_error_at && (
                              <span className="mt-0.5 block text-gray-400 dark:text-gray-500">
                                {formatRelativeTime(stage.last_error_at)}
                              </span>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Diagnostics</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Readiness</div>
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                  <div>Status: <span className="font-semibold">{readiness?.status || "-"}</span></div>
                  <div>Banco: <span className="font-semibold">{readiness?.database || "-"}</span></div>
                  <div>LLM: <span className="font-semibold">{readiness?.llm_enabled ? "ligado" : "desligado"}</span></div>
                  <div>Auto pipeline: <span className="font-semibold">{readiness?.auto_pipeline_enabled ? "ligado" : "desligado"}</span></div>
                  <div>Workers: <span className="font-semibold">{readiness?.pipeline_workers ?? "-"}</span></div>
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Providers</div>
                <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <div>
                    Cheap: <span className="font-semibold">{readiness?.providers.cheap.model || "-"}</span>
                    <span className="ml-2 text-xs text-gray-500">({readiness?.providers.cheap.provider || "-"})</span>
                  </div>
                  <div>
                    Strong: <span className="font-semibold">{readiness?.providers.strong.model || "-"}</span>
                    <span className="ml-2 text-xs text-gray-500">({readiness?.providers.strong.provider || "-"})</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <JsonPanel title="Readiness raw" value={readiness} />
              <JsonPanel title="Pipeline raw" value={pipelineStatus} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Candidates</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Inspecione o que foi extraido antes de confiar na publicacao. O texto contaminado costuma aparecer aqui primeiro.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button
              onClick={() => void loadReviewQueue()}
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
            >
              Fila de review {reviewTotal > 0 && <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-xs dark:bg-amber-800">{reviewTotal}</span>}
            </button>
          <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Filtrar status
            <select
              value={candidateStatus}
              onChange={(event) => setCandidateStatus(event.target.value)}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="">Todos</option>
              <option value="dedup_pending">dedup_pending</option>
              <option value="canonical_created">canonical_created</option>
              <option value="linked">linked</option>
              <option value="duplicate_found">duplicate_found</option>
              <option value="needs_review">needs_review</option>
              <option value="discarded">discarded</option>
              <option value="quarantine_technical">quarantine_technical</option>
            </select>
          </label>
          </div>
        </div>

        {showReviewQueue && reviewItems.length > 0 && (
          <div className="mt-5 space-y-3 rounded-[24px] border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-800/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-amber-800 dark:text-amber-200">
                Fila de review ({reviewTotal} total)
              </h3>
              <button onClick={() => setShowReviewQueue(false)} className="text-xs text-gray-400 hover:text-gray-600">✕ Fechar</button>
            </div>
            {reviewItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-800/30 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Q{item.question_number ?? "?"} • Dedup: <span className="font-bold">{item.dedup.decision ?? "—"}</span>
                      {item.dedup.confidence != null && (
                        <span className="ml-1 text-gray-400">({(item.dedup.confidence * 100).toFixed(0)}%)</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 line-clamp-3">
                      {item.raw_stem ? item.raw_stem.slice(0, 200) + (item.raw_stem.length > 200 ? "…" : "") : "Sem enunciado"}
                    </p>
                    {item.dedup.matched_question_id && (
                      <p className="mt-1 text-xs text-gray-400">
                        Match: <code className="font-mono">{item.dedup.matched_question_id.slice(0, 12)}…</code>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => handleReviewResolve(item.id, "accept_as_canonical")}
                      className="rounded-xl bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                    >
                      ✓ Canônico
                    </button>
                    {item.dedup.matched_question_id && (
                      <button
                        onClick={() => handleReviewResolve(item.id, "accept_as_duplicate", item.dedup.matched_question_id ?? undefined)}
                        className="rounded-xl bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        = Duplicata
                      </button>
                    )}
                    <button
                      onClick={() => handleReviewResolve(item.id, "discard")}
                      className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                    >
                      ✕ Descartar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {showReviewQueue && reviewItems.length === 0 && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            Nenhum candidate aguardando review.
          </div>
        )}
        <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3 font-semibold">N</th>
                <th className="px-3 py-3 font-semibold">Pág.</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Ano</th>
                <th className="px-3 py-3 font-semibold">Instituicao</th>
                <th className="px-3 py-3 font-semibold">Enunciado</th>
                <th className="px-3 py-3 font-semibold">Grade</th>
                <th className="px-3 py-3 text-right font-semibold">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((item) => (
                <CandidateRow key={item.id} item={item} />
              ))}
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhum candidato carregado para este import.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
