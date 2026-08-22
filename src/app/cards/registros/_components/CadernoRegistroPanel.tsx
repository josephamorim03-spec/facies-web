"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { OperationalSourceType } from "@/lib/api";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import {
  AREA_COLORS,
  AREAS,
  MAX_FILE_MB,
  rangeStyle,
  weightBadgeColor,
} from "../_lib/cadernoShared";
import { CadernoRegistroSkeleton } from "./CadernoSkeletons";

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
  const canSave = Boolean(area && theme.trim() && insightQuestion.trim() && body.trim());

  return (
    <div data-caderno-registro-layout="true" className="w-full">
      <section
        data-caderno-registro-panel="true"
        className="w-full space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] md:pb-0"
      >
        {/* Area */}
        <div data-caderno-registro-area-picker="true" className="flex flex-wrap justify-center gap-1.5">
          {AREAS.map((a) => {
            const selected = area === a;
            const hasSelection = !!area;
            const areaColor = AREA_COLORS[a];
            return (
              <button
                key={a}
                onClick={() => onAreaChange(a)}
                aria-pressed={selected}
                style={{
                  borderColor: areaColor,
                  backgroundColor: selected
                    ? `color-mix(in srgb, ${areaColor} 12%, var(--color-surface))`
                    : undefined,
                }}
                className={`min-h-[2.25rem] min-w-14 rounded-control border bg-surface px-2 py-1.5 text-center text-xs leading-none transition-[background-color,color] duration-150 hover:text-ink active:translate-y-px ${
                  selected
                    ? "font-semibold text-ink"
                    : hasSelection
                      ? "font-medium text-muted"
                      : "font-medium text-ink"
                }`}
              >
                {a}
              </button>
            );
          })}
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
            <div className="absolute left-0 right-0 mt-0.5 rounded-control border border-edge bg-paper z-10 max-h-36 overflow-y-auto ">
              {themeSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onThemeSuggestionSelect(s); onShowThemeSuggestionsChange(false); }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--wash-selecao)]"
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
              className={`text-xs px-3 py-1 border ${sourceType === s ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:border-primary"}`}
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
                      ? "border-primary bg-primary text-primaryInk"
                      : "border-edge text-muted hover:border-primary"
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
            <label className="paper-eyebrow">Peso</label>
            <span
              className="border bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums"
              style={{ borderColor: weightBadgeColor(weight), color: weightBadgeColor(weight) }}
            >
              {weight}
            </span>
          </div>
          <input
            type="range" min={1} max={10} step={1} value={weight}
            onChange={(e) => onWeightChange(Number(e.target.value))}
            aria-label="Peso do registro"
            aria-valuetext={`${weight} de 10`}
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
              <label className="paper-eyebrow">ID da questão</label>
              <input
                type="text"
                className="w-full border border-edge px-2 py-1 text-sm bg-paper"
                placeholder="Opcional"
                value={questionId}
                onChange={(e) => onQuestionIdChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="paper-eyebrow">Links externos</label>
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
              <p className="paper-eyebrow">
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
              {fileError && <p className="text-xs text-danger">{fileError}</p>}
            </div>
          </div>
        )}

        <BottomActionBar className="md:mt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onCreateNote}
            disabled={!canSave}
            loading={saving}
            className="w-full sm:w-auto"
          >
            Salvar
          </Button>
        </BottomActionBar>
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
