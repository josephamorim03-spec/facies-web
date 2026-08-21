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
  compactCodes,
  SOURCE_METADATA_FIELDS,
  fieldText,
  formatArtifactReason,
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
  showArtifacts: boolean;
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
  onShowArtifactsChange: (value: boolean) => void;
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
  showArtifacts,
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
  onShowArtifactsChange,
  formatRelativeTime,
}: Props) {
  const questions = preview?.questions ?? [];
  const readiness = previewSummary?.editorial_readiness;
  const readinessTone =
    readiness?.state === "blocked"
      ? "border-danger bg-surfaceMuted text-danger/40/30"
      : readiness?.state === "needs_review"
        ? "border-warning bg-surfaceMuted text-warning/40/30"
        : "border-success bg-surfaceMuted text-success/40/30";

  return (
    <div className="space-y-5">
      <section className="border border-edge bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Ingestao</h2>
            <p className="mt-1 text-sm text-ink">PDF, metadados e preview editorial.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-ink">
            PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="border border-edge bg-surface px-3 py-2 text-sm"
            />
          </label>
          {file ? <div className="text-xs text-muted">{file.name}</div> : null}

          <div className="grid gap-4 border border-edge bg-surface p-4/60">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Prova</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {SOURCE_METADATA_FIELDS.map(([key, label]) => (
                    <label key={key} className="grid gap-1 text-sm font-medium text-ink">
                      {label}
                      <input
                        value={fieldText(metadataDraft[key])}
                        onChange={(event) => onMetadataFieldChange(key, event.target.value)}
                        className="border border-edge bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Conteudo</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {CONTENT_METADATA_FIELDS.map(([key, label]) => (
                    <label key={key} className="grid gap-1 text-sm font-medium text-ink">
                      {label}
                      {key === "grande_area" ? (
                        <select
                          value={fieldText(metadataDraft[key])}
                          onChange={(event) => onMetadataFieldChange(key, event.target.value)}
                          className="border border-edge bg-surface px-3 py-2 text-sm"
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
                          className="border border-edge bg-surface px-3 py-2 text-sm"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <details className="border border-edge bg-surface p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">JSON</summary>
              <textarea
                value={metadataText}
                onChange={(event) => onMetadataTextChange(event.target.value)}
                className="mt-3 min-h-[160px] w-full border border-edge bg-surface px-3 py-3 text-xs leading-6 text-ink"
              />
            </details>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={autoPipeline}
              onChange={(event) => onAutoPipelineChange(event.target.checked)}
              className="h-4 w-4 border-edge"
            />
            Auto pipeline
          </label>
          <div className="flex flex-wrap gap-3">
            <button onClick={onPreview} className="bg-info px-5 py-2 text-sm font-semibold text-ink transition hover:bg-info">
              Preview
            </button>
            <button onClick={onImport} className="bg-paper px-5 py-2 text-sm font-semibold text-ink transition hover:bg-paper">
              Importar
            </button>
          </div>
        </div>

        {previewSummary ? (
          <div className="mt-5 space-y-4 border border-edge bg-surface p-4/70">
            <div>
              <h3 className="text-lg font-semibold text-ink">Preview</h3>
              <p className="mt-1 text-sm text-ink">Diagnostico antes de importar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetadataPill label="anos" value={previewSummary.years_detected} />
              <MetadataPill label="aplicados" value={previewSummary.years_applied} />
              <MetadataPill label="misto" value={previewSummary.is_mixed_source ? "sim" : "nao"} />
              <MetadataPill label="instituicao" value={previewSummary.detected_metadata.institution} />
              <MetadataPill label="acesso" value={previewSummary.detected_metadata.access_type} />
              <MetadataPill label="OCR" value={previewSummary.quality_summary?.ocr_summary?.used ? "usado" : previewSummary.quality_summary?.ocr_summary?.attempted ? "tentado" : null} />
              <MetadataPill label="páginas OCR" value={previewSummary.quality_summary?.ocr_summary?.pages_used} />
            </div>
            {readiness ? (
              <div className={`border p-4 text-sm ${readinessTone}`}>
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
                      <span key={blocker} className="bg-surface px-2 py-0.5 text-micro font-semibold">
                        {blocker}
                      </span>
                    ))}
                  </div>
                ) : null}
                {readiness.pipeline_warnings.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {readiness.pipeline_warnings.map((warning) => (
                      <span key={warning} className="bg-surface px-2 py-0.5 text-micro font-semibold">
                        {warning}
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
                <div className="border border-success bg-surfaceMuted px-4 py-3 text-sm text-success/40/30">
                  Sem alertas criticos.
                </div>
            )}

            {questions.length ? (
              <div className="overflow-hidden border border-edge bg-surface">
                <div className="border-b border-edge px-4 py-3">
                  <h4 className="text-sm font-semibold text-ink">Overrides por questão</h4>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-[1180px] w-full text-left text-xs">
                    <thead className="bg-surface text-muted">
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
                            <tr className="border-t border-edge align-top">
                              <td className="px-3 py-3 font-semibold text-ink">
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
                                  className="mt-1 border border-edge px-1.5 py-0.5 text-nano font-semibold text-muted hover:bg-surface"
                                >
                                  {isOpen ? "ocultar" : "ver"}
                                </button>
                              </td>
                              <td className="max-w-[260px] px-3 py-3 text-ink">
                                {question.stem ? question.stem.slice(0, 150) + (question.stem.length > 150 ? "..." : "") : "-"}
                              </td>
                              <td className="px-3 py-3 text-muted">
                                <div>{extractionSource}</div>
                                {ocrUsed ? <div className="mt-1 border border-info bg-surfaceMuted px-2 py-0.5 text-nano font-semibold text-info/40/30">OCR</div> : null}
                                {diagnostic?.requires_image ? <div className="mt-1 text-nano text-warning">imagem</div> : null}
                              </td>
                              <td className="max-w-[220px] px-3 py-3 text-muted">
                                {blockers ? <div className="font-semibold text-danger">{blockers}</div> : null}
                                {warnings ? <div className="mt-1 text-warning">{warnings}</div> : null}
                                {!blockers && !warnings ? "-" : null}
                              </td>
                              <td className="px-3 py-3 text-muted">
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
                                          className="w-full border border-edge bg-surface px-2 py-1.5 text-xs"
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
                                          className="w-full border border-edge bg-surface px-2 py-1.5 text-xs"
                                        />
                                      )}
                                      {hasOverride ? (
                                        <button
                                          type="button"
                                          onClick={() => onQuestionOverrideRemove(number, key)}
                                          className="border border-edge px-1.5 py-1 text-nano font-semibold text-muted hover:bg-surface"
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
                              <tr className="bg-surface/40">
                                <td colSpan={5 + QUESTION_OVERRIDE_FIELDS.length} className="px-4 py-4">
                                  <p className="whitespace-pre-wrap text-sm text-ink">{question.stem || "-"}</p>
                                  <div className="mt-3 grid gap-1.5">
                                    {Object.entries(question.options ?? {}).map(([letter, text]) => {
                                      const isCorrect = String(question.correct_answer || "").toUpperCase() === letter.toUpperCase();
                                      return (
                                        <div
                                          key={letter}
                                          className={`flex gap-2 px-2 py-1 text-sm ${
                                            isCorrect
                                              ? "bg-surfaceMuted text-success/40"
                                              : "text-ink"
                                          }`}
                                        >
                                          <span className="w-5 font-semibold">{letter}</span>
                                          <span className="flex-1">{String(text)}</span>
                                          {isCorrect ? <span className="text-xs font-semibold">gabarito</span> : null}
                                        </div>
                                      );
                                    })}
                                    {Object.keys(question.options ?? {}).length === 0 ? (
                                      <p className="text-xs text-muted">Sem alternativas.</p>
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

      <section className="border border-edge bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Historico</h2>
            <p className="mt-1 text-sm text-ink">Imports operacionais, com rendimento e backlog por arquivo.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={showArtifacts}
              onChange={(event) => onShowArtifactsChange(event.target.checked)}
              className="h-4 w-4 border-edge"
            />
            Mostrar artefatos
          </label>
        </div>
        <div className="mt-4 overflow-auto border border-edge">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-muted">
                <th className="px-4 py-3 font-semibold">Arquivo</th>
                <th className="px-4 py-3 font-semibold">Anos</th>
                <th className="px-4 py-3 font-semibold">Saida</th>
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
                    className={`cursor-pointer border-t border-edge transition hover:bg-surface ${active ? "bg-surfaceMuted/80/20" : ""}`}
                    onClick={() => onSelectImport(item.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">
                        {item.file_name || item.id}
                        {item.is_mixed_source ? (
                          <span className="ml-2 bg-surfaceMuted px-2 py-0.5 text-xs font-semibold text-warning/30">
                            misto
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.is_zero_ai_locked ? (
                          <span className="bg-surfaceMuted px-2 py-0.5 text-micro font-semibold text-info/30">
                            zero-IA
                          </span>
                        ) : null}
                        {item.is_artifact ? (
                          <span className="bg-surfaceMuted px-2 py-0.5 text-micro font-semibold text-danger/30">
                            {formatArtifactReason(item.artifact_reason)}
                          </span>
                        ) : null}
                        {(item.candidate_count ?? 0) > 0 && (item.candidate_count ?? 0) <= 2 ? (
                          <span className="bg-surfaceMuted px-2 py-0.5 text-micro font-semibold text-warning/30">
                            baixo rendimento
                          </span>
                        ) : null}
                        {(item.published_question_count ?? 0) === 0 ? (
                          <span className="bg-surface px-2 py-0.5 text-micro font-semibold text-ink">
                            sem publicacao
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted">{item.source.exam_name || item.source.institution || "sem fonte"}</div>
                    </td>
                    <td className="px-4 py-3 text-ink">{item.years_detected.length ? item.years_detected.join(", ") : "-"}</td>
                    <td className="px-4 py-3 text-ink">
                      <div>{item.published_question_count ?? 0} publicadas</div>
                      <div className="text-xs text-muted">
                        {item.candidate_count ?? 0} candidatas / yield {Math.round((item.yield_ratio ?? 0) * 100)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <div>P {item.pipeline_counts.pending ?? 0} / R {item.pipeline_counts.processing ?? 0}</div>
                      <div className="text-xs text-muted">F {item.pipeline_counts.failed ?? 0} / D {item.pipeline_counts.done ?? 0}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{item.created_at ? formatRelativeTime(item.created_at) : "-"}</td>
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
