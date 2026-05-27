"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { OperationalSourceType } from "@/lib/api";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  AREA_COLORS,
  AREAS,
  MAX_FILE_MB,
  rangeStyle,
  weightBadgeColor,
} from "../_lib/cadernoShared";
import { CadernoRegistroSkeleton } from "./CadernoSkeletons";

const MOBILE_PRIMARY_CTA_CLASS =
  "sticky bottom-[calc(env(safe-area-inset-bottom,0px)+0.45rem)] w-full z-40 block text-sm border border-ink py-2 bg-paper text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 md:static md:w-full md:bg-transparent";

interface CadernoRegistroPanelProps {
  area: string;
  onAreaChange: Dispatch<SetStateAction<string>>;
  theme: string;
  onThemeChange: Dispatch<SetStateAction<string>>;
  showThemeSuggestions: boolean;
  onShowThemeSuggestionsChange: Dispatch<SetStateAction<boolean>>;
  themeSuggestions: string[];
  onThemeSuggestionSelect: (suggestion: string) => void;
  sourceType: OperationalSourceType;
  onSourceTypeChange: Dispatch<SetStateAction<OperationalSourceType>>;
  questionOutcome: string;
  onQuestionOutcomeChange: Dispatch<SetStateAction<string>>;
  insightQuestion: string;
  onInsightQuestionChange: Dispatch<SetStateAction<string>>;
  body: string;
  onBodyChange: Dispatch<SetStateAction<string>>;
  weight: number;
  onWeightChange: Dispatch<SetStateAction<number>>;
  showAdvanced: boolean;
  onShowAdvancedChange: Dispatch<SetStateAction<boolean>>;
  questionId: string;
  onQuestionIdChange: Dispatch<SetStateAction<string>>;
  externalLinksInput: string;
  onExternalLinksInputChange: Dispatch<SetStateAction<string>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pickedFiles: File[];
  fileError: string | null;
  onFilePick: () => void;
  onFileChange: (files: FileList | null) => void;
  saving: boolean;
  onCreateNote: () => void;
}

export function CadernoRegistroPanel({
  area,
  onAreaChange,
  theme,
  onThemeChange,
  showThemeSuggestions,
  onShowThemeSuggestionsChange,
  themeSuggestions,
  onThemeSuggestionSelect,
  sourceType,
  onSourceTypeChange,
  questionOutcome,
  onQuestionOutcomeChange,
  insightQuestion,
  onInsightQuestionChange,
  body,
  onBodyChange,
  weight,
  onWeightChange,
  showAdvanced,
  onShowAdvancedChange,
  questionId,
  onQuestionIdChange,
  externalLinksInput,
  onExternalLinksInputChange,
  fileInputRef,
  pickedFiles,
  fileError,
  onFilePick,
  onFileChange,
  saving,
  onCreateNote,
}: CadernoRegistroPanelProps) {
  return (
    <div data-caderno-registro-layout="true" className="w-full">
      <section
        data-caderno-registro-panel="true"
        className="w-full space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] md:pb-0"
      >
        {/* Area */}
        <div data-caderno-registro-area-picker="true" className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-center">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => onAreaChange(a)}
              style={{
                backgroundColor: AREA_COLORS[a],
                borderColor: "transparent",
                borderWidth: 1,
                filter: area === a ? "saturate(1.4)" : (area ? "brightness(0.55)" : undefined),
                opacity: (area && area !== a) ? 0.7 : 1,
              }}
              className="w-full sm:w-auto text-center text-xs px-2 py-1.5 border font-semibold text-white transition-[filter,opacity] duration-150"
            >
              {a}
            </button>
          ))}
        </div>

        {/* Theme */}
        <div className="relative">
          <input
            type="text"
            className="w-full border border-edge px-2 py-1 text-sm bg-paper"
            placeholder="Tema"
            value={theme}
            onChange={(e) => { onThemeChange(e.target.value); onShowThemeSuggestionsChange(true); }}
            onBlur={() => setTimeout(() => onShowThemeSuggestionsChange(false), 120)}
            onFocus={() => onShowThemeSuggestionsChange(true)}
          />
          {themeSuggestions.length > 0 && showThemeSuggestions && (
            <div className="absolute left-0 right-0 mt-0.5 border border-edge bg-paper z-10 max-h-36 overflow-y-auto shadow-sm rounded-b-md">
              {themeSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onThemeSuggestionSelect(s); onShowThemeSuggestionsChange(false); }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-amber-tint"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Source type + outcome */}
        <div className="flex flex-wrap gap-1 justify-center">
          {(["reading", "question"] as OperationalSourceType[]).map((s) => (
            <button
              key={s}
              onClick={() => { onSourceTypeChange(s); if (s !== "question") onQuestionOutcomeChange(""); }}
              className={`text-xs px-3 py-1 border ${sourceType === s ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
            >
              {s === "reading" ? "Leitura" : "Questão"}
            </button>
          ))}
          {sourceType === "question" && (
            <div className="flex gap-1 ml-2 border-l border-edge pl-2">
              {(["correct", "incorrect"] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => onQuestionOutcomeChange(questionOutcome === o ? "" : o)}
                  className={`text-xs px-3 py-1 border ${
                    questionOutcome === o
                      ? "border-ink bg-ink text-paper"
                      : "border-edge text-muted"
                  }`}
                >
                  {o === "correct" ? "Acertei" : "Errei"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Insight question */}
        <Field label="O que eu não sabia" hint="Escreva em forma de pergunta — vira a frente do Card.">
          <input
            type="text"
            className="w-full border border-edge px-2 py-1 text-sm bg-paper"
            placeholder="Ex.: Qual mecanismo explica dor na DPP?"
            value={insightQuestion}
            onChange={(e) => onInsightQuestionChange(e.target.value)}
          />
        </Field>

        {/* Body */}
        <Field label="Anotação">
          <textarea
            rows={4}
            className="w-full border border-edge px-2 py-1 text-sm bg-paper"
            placeholder="Explique o conceito com suas palavras."
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
          />
        </Field>

        {/* Weight */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted uppercase tracking-wide">Peso</label>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-sm text-white"
              style={{ backgroundColor: weightBadgeColor(weight) }}
            >
              {weight}
            </span>
          </div>
          <input
            type="range" min={1} max={10} step={1} value={weight}
            onChange={(e) => onWeightChange(Number(e.target.value))}
            className="w-full"
            style={rangeStyle(weight, 1, 10)}
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Baixo</span><span>Alto</span>
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => onShowAdvancedChange(!showAdvanced)}
          className="text-xs text-muted underline underline-offset-2"
        >
          {showAdvanced ? "- ocultar opções" : "+ opções avançadas"}
        </button>

        {showAdvanced && (
          <div className="space-y-3 border-t border-edge pt-3">
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase tracking-wide">ID da questão</label>
              <input
                type="text"
                className="w-full border border-edge px-2 py-1 text-sm bg-paper"
                placeholder="Opcional"
                value={questionId}
                onChange={(e) => onQuestionIdChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase tracking-wide">Links externos</label>
              <textarea
                rows={2}
                className="w-full border border-edge px-2 py-1 text-sm bg-paper"
                placeholder="Um por linha ou separado por vírgula"
                value={externalLinksInput}
                onChange={(e) => onExternalLinksInputChange(e.target.value)}
              />
            </div>
            {/* Custom file input - hides browser "nenhum selecionado" */}
            <div className="space-y-1">
              <p className="text-xs text-muted uppercase tracking-wide">
                Anexo <span className="normal-case font-normal">(PDF ou imagem · max {MAX_FILE_MB} MB por arquivo)</span>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="xs" onClick={onFilePick} className="shrink-0">
                  Escolher arquivo
                </Button>
                <span className="text-xs text-muted truncate">
                  {pickedFiles.length > 0
                    ? pickedFiles.map((f) => f.name).join(", ")
                    : "Nenhum arquivo"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files)}
              />
              {fileError && <p className="text-xs text-red-500">{fileError}</p>}
            </div>
          </div>
        )}

        <button
          onClick={onCreateNote}
          disabled={saving}
          className={MOBILE_PRIMARY_CTA_CLASS}
        >
          {saving ? "Salvando..." : "SALVAR"}
        </button>
      </section>
    </div>
  );
}

export function CadernoRegistroSkeletonPanel() {
  return (
    <div data-caderno-registro-layout="true" className="w-full">
      <CadernoRegistroSkeleton />
    </div>
  );
}
