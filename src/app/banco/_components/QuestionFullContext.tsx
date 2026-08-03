"use client";

import type { ReactNode } from "react";

import { QuestionImageRefs } from "./QuestionImageRefs";

const OPTION_ORDER = ["A", "B", "C", "D", "E"] as const;

type KnowledgeNodeLike = {
  knowledge_node_id?: string | null;
  node_code?: string | null;
  node_name?: string | null;
  path_label?: string | null;
  is_primary?: boolean | null;
};

type QuestionFullContextProps = {
  stem: string | null | undefined;
  alternatives: Record<string, string> | null;
  imageRefs?: string[] | null;
  tableRefs?: unknown[] | null;
  source?: Record<string, unknown> | null;
  knowledgeNodes?: KnowledgeNodeLike[] | null;
  eyebrow?: string;
  selectedOption?: string | null;
  correctAnswer?: string | null;
  isCorrect?: boolean | null;
  showCorrectAnswer?: boolean;
  resultLabel?: string | null;
  className?: string;
  children?: ReactNode;
};

function normalizedOption(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function sortedAlternatives(alternatives: Record<string, string> | null | undefined): Array<[string, string]> {
  const entries = Object.entries(alternatives ?? {}).filter(([, text]) => String(text ?? "").trim());
  return entries.sort(([a], [b]) => {
    const ai = OPTION_ORDER.indexOf(normalizedOption(a) as (typeof OPTION_ORDER)[number]);
    const bi = OPTION_ORDER.indexOf(normalizedOption(b) as (typeof OPTION_ORDER)[number]);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });
}

function sourceLabel(source: Record<string, unknown> | null | undefined): string | null {
  if (!source) return null;
  const parts = [
    source.institution,
    source.board_code ?? source.board,
    source.exam_name,
    source.year,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : null;
}

function nodeLabel(node: KnowledgeNodeLike): string {
  return [node.node_code, node.node_name ?? node.path_label].filter(Boolean).join(" - ") || "Microcompetencia";
}

export function QuestionFullContext({
  stem,
  alternatives,
  imageRefs,
  tableRefs,
  source,
  knowledgeNodes,
  eyebrow = "Questão completa",
  selectedOption,
  correctAnswer,
  isCorrect,
  showCorrectAnswer = true,
  resultLabel,
  className = "rounded-lg border border-edge bg-paper p-3",
  children,
}: QuestionFullContextProps) {
  const selected = normalizedOption(selectedOption);
  const correct = normalizedOption(correctAnswer);
  const alternativesList = sortedAlternatives(alternatives);
  const sourceText = sourceLabel(source);
  const visibleNodes = (knowledgeNodes ?? []).filter((node) => node.node_name || node.node_code || node.path_label).slice(0, 5);
  const tableCount = Array.isArray(tableRefs) ? tableRefs.length : 0;
  const selectedTone =
    isCorrect === false
      ? "border-danger/40 text-danger"
      : isCorrect === true
        ? "border-success/40 text-success"
        : "border-primary/40 text-primary";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</p>
          {sourceText ? <p className="mt-1 text-xs text-muted">{sourceText}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {resultLabel ? (
            <span className="rounded-full border border-edge bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
              {resultLabel}
            </span>
          ) : null}
          {showCorrectAnswer && correct ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isCorrect === false ? "bg-danger text-white" : "bg-success text-white"}`}>
              Gabarito {correct}
            </span>
          ) : null}
          {selected ? (
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedTone}`}>
              Sua resposta: {selected}
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{stem?.trim() || "Sem enunciado"}</p>

      {imageRefs && imageRefs.length > 0 ? (
        <QuestionImageRefs imageRefs={imageRefs} className="mt-4 grid gap-3 md:grid-cols-2" />
      ) : null}

      {tableCount > 0 ? (
        <div className="mt-3 rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-semibold text-muted">
          {tableCount === 1 ? "1 tabela vinculada" : `${tableCount} tabelas vinculadas`}
        </div>
      ) : null}

      {alternativesList.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {alternativesList.map(([letterRaw, text]) => {
            const letter = normalizedOption(letterRaw);
            const optionIsCorrect = Boolean(showCorrectAnswer && correct && letter === correct);
            const optionIsSelected = Boolean(selected && letter === selected);
            const optionIsWrong = Boolean(showCorrectAnswer && optionIsSelected && correct && letter !== correct);
            return (
              <div
                key={`${letterRaw}-${text}`}
                className={`flex gap-3 rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                  optionIsCorrect
                    ? "border-success/40 bg-success/10 text-ink"
                    : optionIsWrong
                      ? "border-danger/40 bg-danger/10 text-ink"
                      : optionIsSelected
                        ? "border-primary/40 bg-primary/10 text-ink"
                        : "border-edge bg-surface text-ink"
                }`}
              >
                <span className="mt-0.5 w-6 shrink-0 font-semibold">{letterRaw}</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap">{text}</span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
                  {optionIsCorrect ? <span className="text-success">gabarito</span> : null}
                  {optionIsSelected ? (
                    <span className={optionIsCorrect ? "text-success" : optionIsWrong ? "text-danger" : "text-primary"}>marcada</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="paper-dashed mt-4 bg-surface px-3 py-2 text-sm font-semibold text-muted">
          Alternativas não disponíveis neste contexto.
        </div>
      )}

      {visibleNodes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleNodes.map((node, index) => (
            <span
              key={node.knowledge_node_id ?? `${nodeLabel(node)}-${index}`}
              className="rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[10px] font-semibold text-primary"
            >
              {nodeLabel(node)}
            </span>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
