import { Fragment, type Dispatch, type SetStateAction } from "react";

import {
  type QuestionBankAdminImportItem,
  type QuestionBankAdminPreview,
  type QuestionBankAdminPreviewSummary,
  type QuestionBankQuestionDiagnostic,
} from "@/lib/api/domains/question-bank-admin";

import { JsonPanel, MetadataPill, WarningBox } from "./AdminShared";
import {
  CONTENT_METADATA_FIELDS,
  GRANDE_AREA_OPTIONS,
  QUESTION_OVERRIDE_FIELDS,
  SOURCE_METADATA_FIELDS,
  compactCodes,
  fieldText,
} from "./adminQuestionBankUtils";

type Props = {
  file: File | null;
  metadataDraft: Record<string, unknown>;
  metadataText: string;
  autoPipeline: boolean;
  preview: QuestionBankAdminPreview | null;
  previewSummary: QuestionBankAdminPreviewSummary | undefined;
  previewDiagnosticsByNumber: Map<string, QuestionBankQuestionDiagnostic>;
  previewOpen: Set<string>;
  questionOverrides: Record<string, Record<string, unknown>>;
  activeQuestionOverrides: Record<string, Record<string, unknown>>;
  imports: QuestionBankAdminImportItem[];
  selectedImportId: string;
  onFileChange: (file: File | null) => void;
  onMetadataTextChange: (value: string) => void;
  onMetadataFieldChange: (key: string, value: string) => void;
  onAutoPipelineChange: (value: boolean) => void;
  onPreviewOpenChange: Dispatch<SetStateAction<Set<string>>>;
  onQuestionOverrideChange: (questionNumber: unknown, key: string, value: string) => void;
  onQuestionOverrideRemove: (questionNumber: unknown, key: string) => void;
  onPreview: () => void;
  onImport: () => void;
  onSelectImport: (importId: string) => void;
  formatRelativeTime: (date: Date | string) => string;
};

export default function ImportWorkspace({
  file,
  metadataDraft,
  metadataText,
  autoPipeline,
  preview,
  previewSummary,
  previewDiagnosticsByNumber,
  previewOpen,
  questionOverrides,
  activeQuestionOverrides,
  imports,
  selectedImportId,
  onFileChange,
  onMetadataTextChange,
  onMetadataFieldChange,
  onAutoPipelineChange,
  onPreviewOpenChange,
  onQuestionOverrideChange,
  onQuestionOverrideRemove,
  onPreview,
  onImport,
  onSelectImport,
  formatRelativeTime,
}: Props) {
  const questions = preview?.questions ?? [];
  const readiness = previewSummary?.editorial_readiness;
  const readinessTone =
    readiness?.state === "blocked"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
      : readiness?.state === "needs_review"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Imports</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Preview, override e envio.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          {file ? <div className="text-xs text-gray-500 dark:text-gray-400">{file.name}</div> : null}

          <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Prova</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {SOURCE_METADATA_FIELDS.map(([key, label]) => (
                    <label key={key} className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {label}
                      <input
                        value={fieldText(metadataDraft[key])}
                        onChange={(event) => onMetadataFieldChange(key, event.target.value)}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Conteudo</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {CONTENT_METADATA_FIELDS.map(([key, label]) => (
                    <label key={key} className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {label}
                      {key === "grande_area" ? (
                        <select
                          value={fieldText(metadataDraft[key])}
                          onChange={(event) => onMetadataFieldChange(key, event.target.value)}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                        >
                          <option value="">IA</option>
                          {GRANDE_AREA_OPTIONS.map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={fieldText(metadataDraft[key])}
                          onChange={(event) => onMetadataFieldChange(key, event.target.value)}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <details className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">JSON</summary>
              <textarea
                value={metadataText}
                onChange={(event) => onMetadataTextChange(event.target.value)}
                className="mt-3 min-h-[160px] w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 font-mono text-xs leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </details>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={autoPipeline}
              onChange={(event) => onAutoPipelineChange(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Auto pipeline
          </label>
          <div className="flex flex-wrap gap-3">
            <button onClick={onPreview} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
              Preview
            </button>
            <button onClick={onImport} className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
              Importar
            </button>
          </div>
        </div>

        {previewSummary ? (
          <div className="mt-5 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/70">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Diagnostico antes de importar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetadataPill label="anos" value={previewSummary.years_detected} />
              <MetadataPill label="aplicados" value={previewSummary.years_applied} />
              <MetadataPill label="misto" value={previewSummary.is_mixed_source ? "sim" : "nao"} />
              <MetadataPill label="instituicao" value={previewSummary.detected_metadata.institution} />
              <MetadataPill label="acesso" value={previewSummary.detected_metadata.access_type} />
              <MetadataPill label="OCR" value={previewSummary.quality_summary?.ocr_summary?.used ? "usado" : previewSummary.quality_summary?.ocr_summary?.attempted ? "tentado" : null} />
              <MetadataPill label="paginas OCR" value={previewSummary.quality_summary?.ocr_summary?.pages_used} />
            </div>
            {readiness ? (
              <div className={`rounded-2xl border p-4 text-sm ${readinessTone}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase opacity-70">Prontidao editorial</div>
                    <div className="mt-1 text-lg font-semibold">{readiness.label}</div>
                  </div>
                  <div className="text-xs font-semibold uppercase opacity-70">risco {readiness.risk}</div>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <span>{readiness.publishable_questions}/{readiness.total_questions} publicaveis</span>
                  <span>{readiness.blocked_questions} bloqueadas</span>
                  <span>{readiness.warning_questions} com alertas</span>
                </div>
                {readiness.blockers.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {readiness.blockers.map((blocker) => (
                      <span key={blocker} className="rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-semibold dark:bg-black/20">
                        {blocker}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {previewSummary.warnings.length ? (
              <div className="grid gap-3">
                {previewSummary.warnings.map((warning) => (
                  <WarningBox key={warning.code} warning={warning} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                Sem alertas criticos.
              </div>
            )}

            {questions.length ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Overrides por questao</h4>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-[1180px] w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Q</th>
                        <th className="px-3 py-2 font-semibold">Enunciado</th>
                        <th className="px-3 py-2 font-semibold">Extracao</th>
                        <th className="px-3 py-2 font-semibold">Diagnostico</th>
                        <th className="px-3 py-2 font-semibold">Resolvido</th>
                        {QUESTION_OVERRIDE_FIELDS.map(([, label]) => (
                          <th key={label} className="px-3 py-2 font-semibold">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((question) => {
                        const number = String(question.number ?? "").trim();
                        const override = questionOverrides[number] || {};
                        const resolved = question.editorial_metadata?.resolved_metadata || {};
                        const diagnostic = previewDiagnosticsByNumber.get(number);
                        const extractionSource = fieldText(question.extraction_source || diagnostic?.extraction_source || "text");
                        const ocrUsed = Boolean(question.ocr_used || diagnostic?.ocr_used);
                        const blockers = compactCodes(diagnostic?.blockers);
                        const warnings = compactCodes(diagnostic?.warnings);
                        const rowKey = number || question.stem || "";
                        const isOpen = previewOpen.has(rowKey);
                        return (
                          <Fragment key={rowKey}>
                            <tr className="border-t border-gray-100 align-top dark:border-gray-800">
                              <td className="px-3 py-3 font-semibold text-gray-700 dark:text-gray-200">
                                <div>{number || "-"}</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewOpenChange((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(rowKey)) next.delete(rowKey);
                                      else next.add(rowKey);
                                      return next;
                                    })
                                  }
                                  className="mt-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                  {isOpen ? "ocultar" : "ver"}
                                </button>
                              </td>
                              <td className="max-w-[260px] px-3 py-3 text-gray-600 dark:text-gray-300">
                                {question.stem ? question.stem.slice(0, 150) + (question.stem.length > 150 ? "..." : "") : "-"}
                              </td>
                              <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                <div>{extractionSource}</div>
                                {ocrUsed ? <div className="mt-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">OCR</div> : null}
                                {diagnostic?.requires_image ? <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-300">imagem</div> : null}
                              </td>
                              <td className="max-w-[220px] px-3 py-3 text-gray-500 dark:text-gray-400">
                                {blockers ? <div className="font-semibold text-red-600 dark:text-red-300">{blockers}</div> : null}
                                {warnings ? <div className="mt-1 text-amber-600 dark:text-amber-300">{warnings}</div> : null}
                                {!blockers && !warnings ? "-" : null}
                              </td>
                              <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                <div>{fieldText(resolved.year) || "-"}</div>
                                <div>{fieldText(resolved.grande_area) || "-"}</div>
                                <div>{fieldText(resolved.tema) || "-"}</div>
                                <div>{fieldText(resolved.microcompetencia) || "-"}</div>
                              </td>
                              {QUESTION_OVERRIDE_FIELDS.map(([key]) => {
                                const hasOverride = Object.prototype.hasOwnProperty.call(override, key);
                                return (
                                  <td key={key} className="px-2 py-3">
                                    <div className="flex min-w-[130px] items-center gap-1.5">
                                      {key === "grande_area" ? (
                                        <select
                                          value={hasOverride ? fieldText(override[key]) : ""}
                                          onChange={(event) => {
                                            if (event.target.value) onQuestionOverrideChange(number, key, event.target.value);
                                            else onQuestionOverrideRemove(number, key);
                                          }}
                                          className="w-full rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950"
                                        >
                                          <option value="">{fieldText(resolved[key]) || "herda"}</option>
                                          {GRANDE_AREA_OPTIONS.map((area) => (
                                            <option key={area} value={area}>{area}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          value={hasOverride ? fieldText(override[key]) : ""}
                                          placeholder={fieldText(resolved[key]) || "herda"}
                                          onChange={(event) => onQuestionOverrideChange(number, key, event.target.value)}
                                          className="w-full rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950"
                                        />
                                      )}
                                      {hasOverride ? (
                                        <button
                                          type="button"
                                          onClick={() => onQuestionOverrideRemove(number, key)}
                                          className="rounded-lg border border-gray-200 px-1.5 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                          herdar
                                        </button>
                                      ) : null}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            {isOpen ? (
                              <tr className="bg-gray-50/70 dark:bg-gray-950/40">
                                <td colSpan={5 + QUESTION_OVERRIDE_FIELDS.length} className="px-4 py-4">
                                  <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{question.stem || "-"}</p>
                                  <div className="mt-3 grid gap-1.5">
                                    {Object.entries(question.options ?? {}).map(([letter, text]) => {
                                      const isCorrect = String(question.correct_answer || "").toUpperCase() === letter.toUpperCase();
                                      return (
                                        <div
                                          key={letter}
                                          className={`flex gap-2 rounded-lg px-2 py-1 text-sm ${
                                            isCorrect
                                              ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200"
                                              : "text-gray-700 dark:text-gray-200"
                                          }`}
                                        >
                                          <span className="w-5 font-semibold">{letter}</span>
                                          <span className="flex-1">{String(text)}</span>
                                          {isCorrect ? <span className="text-xs font-semibold">gabarito</span> : null}
                                        </div>
                                      );
                                    })}
                                    {!question.options || Object.keys(question.options).length === 0 ? (
                                      <p className="text-xs text-gray-400">Sem alternativas.</p>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <JsonPanel title="Detectado" value={previewSummary.detected_metadata} />
              <JsonPanel title="Import usado" value={{
                metadata: previewSummary.import_metadata_used,
                question_overrides: activeQuestionOverrides,
                editorial_controls: previewSummary.editorial_controls,
              }} />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Historico</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
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
                    onClick={() => onSelectImport(item.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.file_name || item.id}
                        {item.is_mixed_source ? (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            misto
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.source.exam_name || item.source.institution || "sem fonte"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.years_detected.length ? item.years_detected.join(", ") : "-"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.status || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">P {item.pipeline_counts?.pending ?? 0} / F {item.pipeline_counts?.failed ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">{item.created_at ? formatRelativeTime(item.created_at) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
