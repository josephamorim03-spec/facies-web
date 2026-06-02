"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { NoteEditForm } from "./NoteEditForm";
import { AttachmentLinks } from "./AttachmentLinks";
import { CadernoSearchResultsSkeleton } from "./CadernoSkeletons";
import {
  AREA_COLORS,
  Area,
  displayDateTime,
  weightBadgeColor,
} from "../_lib/cadernoShared";
import type { OperationalNoteItem, updateOperationalNote } from "@/lib/api";

interface CadernoNoteListProps {
  notes: OperationalNoteItem[];
  hasSearched: boolean;
  searchLoading: boolean;
  searchResultsRef: React.RefObject<HTMLDivElement | null>;
  flashcardReviewCount: number;
  flashcardReviewNoteIds: string[];
  onOpenReviewMode: (noteIds: string[]) => void;
  editingNote: OperationalNoteItem | null;
  editSaving: boolean;
  onSaveEdit: (noteId: string, payload: Parameters<typeof updateOperationalNote>[2]) => void;
  onCancelEdit: () => void;
  onEditNote: (note: OperationalNoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  deletingNoteId: string | null;
  token: string;
}

export function CadernoNoteList({
  notes,
  hasSearched,
  searchLoading,
  searchResultsRef,
  flashcardReviewCount,
  flashcardReviewNoteIds,
  onOpenReviewMode,
  editingNote,
  editSaving,
  onSaveEdit,
  onCancelEdit,
  onEditNote,
  onDeleteNote,
  deletingNoteId,
  token,
}: CadernoNoteListProps) {
  if (!hasSearched) {
    return searchLoading ? <CadernoSearchResultsSkeleton /> : null;
  }

  return (
    <div ref={searchResultsRef} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{notes.length} nota{notes.length !== 1 ? "s" : ""}</p>
        {flashcardReviewCount >= 15 && (
          <Button variant="secondary" size="xs" onClick={() => onOpenReviewMode(flashcardReviewNoteIds)} className="shrink-0">
            Revisar {flashcardReviewCount} cards
          </Button>
        )}
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma anotação para os filtros atuais.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.note_id}
              className="rounded-xl border border-edge p-3 space-y-1"
              style={{ borderLeftWidth: "3px", borderLeftColor: AREA_COLORS[note.area as Area] ?? "#ccc" }}
            >
              {editingNote?.note_id === note.note_id ? (
                <NoteEditForm
                  note={note}
                  saving={editSaving}
                  onSave={(p) => onSaveEdit(note.note_id, p)}
                  onCancel={onCancelEdit}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{note.insight_question}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="text-xs font-semibold px-1 py-0.5 rounded-sm text-white"
                        style={{ backgroundColor: weightBadgeColor(note.weight) }}
                      >
                        {note.weight}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditNote(note)}
                        className="text-xs text-muted underline hover:text-ink px-1"
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.note_id)}
                        disabled={deletingNoteId === note.note_id}
                        className="text-xs text-red-600 underline hover:text-red-700 px-1"
                        title="Apagar"
                      >
                        {deletingNoteId === note.note_id ? "..." : "Apagar"}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {note.area} · {note.theme}
                    {note.source_type === "question" ? " · Questão" : " · Leitura"}
                    {note.question_outcome === "incorrect" ? " · Erro" : note.question_outcome === "correct" ? " · Acerto" : ""}
                    {note.question_id ? ` · ID: ${note.question_id}` : ""}
                    {" · "}{displayDateTime(note.created_at)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/banco-de-questoes?area=${encodeURIComponent(note.area)}&theme=${encodeURIComponent(note.theme)}&answer_status=unanswered_or_wrong`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Estudar no banco →
                    </Link>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted">{note.body}</p>
                  {(note.external_links.length > 0 || note.attachment_refs.length > 0) && (
                    <div className="text-xs text-muted space-y-0.5 pt-1 border-t border-edge">
                      {note.external_links.length > 0 && (
                        <p>
                          Links:{" "}
                          {note.external_links.map((url, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && " · "}
                              <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink break-all">{url}</a>
                            </React.Fragment>
                          ))}
                        </p>
                      )}
                      {note.attachment_refs.length > 0 && (
                        <AttachmentLinks refs={note.attachment_refs} token={token} />
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
