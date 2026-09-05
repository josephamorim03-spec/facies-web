/**
 * O grifo do aluno sobre o enunciado — resolucao e renderizacao.
 *
 * `questionTextHighlights.ts`, ao lado, resolve a ANCORA (prefixo, sufixo,
 * ocorrencia) contra o texto. Este arquivo faz o passo seguinte: transforma os
 * intervalos resolvidos em `<mark>` clicavel, e ajuda a capturar a selecao.
 *
 * Sairam de `FocusedQuestion.tsx` pela catraca de tamanho. Nao dependem de
 * estado da sessao: recebem o item e devolvem no.
 */
import type { ReactNode } from "react";

import type {
  QuestionBankOption,
  QuestionBankSessionItem,
  QuestionTextHighlight,
  QuestionTextHighlightKind,
  QuestionTextHighlightTarget,
} from "@/lib/api";
import { resolveHighlightRanges } from "./questionTextHighlights";

export function highlightsForTarget(
  item: QuestionBankSessionItem,
  target: QuestionTextHighlightTarget,
  option: QuestionBankOption | null = null,
): QuestionTextHighlight[] {
  return (item.text_highlights ?? []).filter((highlight) =>
    highlight.target === target && (target === "stem" || highlight.option === option)
  );
}

export function highlightClass(kind: QuestionTextHighlightKind) {
  return kind === "pegadinha"
    ? "border-b border-warning/60 bg-[var(--wash-atencao)] px-0.5"
    : "border-b border-ink/40 bg-surfaceMuted px-0.5";
}

export function renderHighlightedText(
  text: string,
  highlights: QuestionTextHighlight[],
  onHighlightClick?: (highlight: QuestionTextHighlight, element: HTMLElement) => void,
) {
  const ranges = resolveHighlightRanges(text, highlights);
  if (ranges.length === 0) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark
        key={range.highlight.highlight_id}
        // Sem o `cx` do resolvedor: aqui ha UMA composicao de classe, e
        // arrastar o utilitario junto so para ela criaria a dependencia que a
        // extracao existe para cortar.
        className={`cursor-pointer text-inherit ${highlightClass(range.highlight.kind)}`}
        title={range.highlight.kind === "pegadinha" ? "Pegadinha" : "Ponto-chave"}
        role="button"
        tabIndex={0}
        onClick={(event) => onHighlightClick?.(range.highlight, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onHighlightClick?.(range.highlight, event.currentTarget);
          }
        }}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function closestHighlightTarget(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.closest<HTMLElement>("[data-highlight-target]") ?? null;
}

export function getSelectionStartInTarget(range: Range, targetEl: HTMLElement, selectedText: string): number | undefined {
  if (!targetEl.contains(range.startContainer) || !targetEl.contains(range.endContainer)) return undefined;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(targetEl);
  preRange.setEnd(range.startContainer, range.startOffset);
  const rawSelectedText = range.toString();
  const trimOffset = Math.max(0, rawSelectedText.indexOf(selectedText));
  return preRange.toString().length + trimOffset;
}
