"use client";

import { useState } from "react";
import {
  OperationalNoteItem,
  OperationalSourceType,
  updateOperationalNote,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Area, AREAS, rangeStyle, weightBadgeColor } from "../_lib/cadernoShared";

export function NoteEditForm({
  note,
  saving,
  onSave,
  onCancel,
}: {
  note: OperationalNoteItem;
  saving: boolean;
  onSave: (p: Parameters<typeof updateOperationalNote>[2]) => void;
  onCancel: () => void;
}) {
  const [area, setArea] = useState(note.area as Area | "");
  const [theme, setTheme] = useState(note.theme);
  const [sourceType, setSourceType] = useState<OperationalSourceType>(note.source_type as OperationalSourceType);
  const [questionOutcome, setQuestionOutcome] = useState<"" | "correct" | "incorrect">(
    (note.question_outcome as "" | "correct" | "incorrect") ?? ""
  );
  const [insightQuestion, setInsightQuestion] = useState(note.insight_question);
  const [body, setBody] = useState(note.body);
  const [weight, setWeight] = useState(note.weight);
  const [questionId, setQuestionId] = useState(note.question_id ?? "");
  const INTERNAL_LINK_PREFIXES = ["concept://", "concept-key://", "flashcard-key://"];
  const isInternalLink = (l: string) => INTERNAL_LINK_PREFIXES.some((p) => l.startsWith(p));
  const internalLinks = note.external_links.filter(isInternalLink);
  const [externalLinksInput, setExternalLinksInput] = useState(
    note.external_links.filter((l) => !isInternalLink(l)).join("\n")
  );

  const handleSubmit = () => {
    const payload: Parameters<typeof updateOperationalNote>[2] = {
      area: area || undefined,
      theme: theme.trim() || undefined,
      source_type: sourceType,
      question_outcome: sourceType === "question" ? (questionOutcome || null) : null,
      insight_question: insightQuestion.trim() || undefined,
      body: body.trim() || undefined,
      weight,
      question_id: questionId.trim() || null,
      external_links: [
        ...internalLinks,
        ...externalLinksInput.split(/\n|,/g).map((s) => s.trim()).filter(Boolean),
      ],
      attachment_refs: note.attachment_refs,
    };
    onSave(payload);
  };

  return (
    <div className="space-y-3 pt-1 max-w-xl mx-auto text-center">
      <div className="flex gap-1 flex-wrap justify-center">
        {AREAS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setArea(a)}
            className={`text-xs px-2 py-0.5 border ${area === a ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted"}`}
          >
            {a}
          </button>
        ))}
      </div>
      <input
        className="w-full block border border-edge px-2 py-1 text-xs bg-paper text-left"
        placeholder="Tema"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      />
      <div className="flex gap-1 flex-wrap justify-center">
        {(["reading", "question"] as OperationalSourceType[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSourceType(s)}
            className={`text-xs px-2 py-0.5 border ${sourceType === s ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted"}`}
          >
            {s === "reading" ? "Leitura" : "Questão"}
          </button>
        ))}
        {sourceType === "question" && (
          <div className="flex gap-1 ml-2">
            {(["correct", "incorrect"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setQuestionOutcome(o)}
                className={`text-xs px-2 py-0.5 border ${
                  questionOutcome === o
                    ? "border-primary bg-primary text-primaryInk"
                    : "border-edge text-muted"
                }`}
              >
                {o === "correct" ? "Acertei" : "Errei"}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        className="w-full block border border-edge px-2 py-1 text-xs bg-paper text-left"
        placeholder="O que não sabia?"
        value={insightQuestion}
        onChange={(e) => setInsightQuestion(e.target.value)}
      />
      <textarea
        rows={3}
        className="w-full block border border-edge px-2 py-1 text-xs bg-paper text-left"
        placeholder="Anotação"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="space-y-1 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted uppercase tracking-wide">Peso</p>
          <span
            className="border bg-surface px-1 py-0.5 text-xs font-semibold tabular-nums"
            style={{ borderColor: weightBadgeColor(weight), color: weightBadgeColor(weight) }}
          >
            {weight}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-full"
          style={rangeStyle(weight, 1, 10)}
        />
      </div>
      <input
        className="w-full block border border-edge px-2 py-1 text-xs bg-paper text-left"
        placeholder="ID da questão (opcional)"
        value={questionId}
        onChange={(e) => setQuestionId(e.target.value)}
      />
      <Field label="Links externos">
        <textarea
          rows={2}
          className="w-full block border border-edge px-2 py-1 text-xs bg-paper text-left"
          placeholder="1 por linha"
          value={externalLinksInput}
          onChange={(e) => setExternalLinksInput(e.target.value)}
        />
      </Field>
      <div className="flex items-center gap-2 justify-center">
        <Button variant="outline" size="xs" loading={saving} onClick={handleSubmit}>
          Salvar
        </Button>
        <Button variant="secondary" size="xs" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
