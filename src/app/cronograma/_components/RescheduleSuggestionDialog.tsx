"use client";

import AreaDot from "@/components/AreaDot";
import { Button } from "@/components/ui/Button";
import { ScheduleSuggestion } from "@/lib/api";

import { Area, displayDate } from "../_lib/cronogramaShared";

type RescheduleSuggestionDialogProps = {
  open: boolean;
  suggestions: ScheduleSuggestion[];
  actionKey?: string | null;
  title?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  acceptItemLabel?: string;
  acceptAllLabel?: string;
  rejectLabel?: string;
  onClose: () => void;
  onAcceptItem?: (suggestionId: string, taskId: string) => void;
  onAcceptAll: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
};

export function RescheduleSuggestionDialog({
  open,
  suggestions,
  actionKey = null,
  title = "Reagendamento sugerido",
  loading = false,
  error = null,
  emptyMessage = "Nenhuma sugestão pendente.",
  acceptItemLabel = "Aceitar",
  acceptAllLabel = "Aceitar todas",
  rejectLabel = "Ignorar",
  onClose,
  onAcceptItem,
  onAcceptAll,
  onReject,
}: RescheduleSuggestionDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/40 p-4 modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="m-auto w-full max-w-xl space-y-3 border border-edge bg-paper p-4 shadow-overlay"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base">{title}</h3>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Buscando sugestões de reagendamento…</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.suggestion_id} className="space-y-2">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="primary"
                    size="xs"
                    loading={actionKey === `all:${suggestion.suggestion_id}`}
                    disabled={actionKey !== null}
                    onClick={() => onAcceptAll(suggestion.suggestion_id)}
                  >
                    {acceptAllLabel}
                  </Button>
                  {onReject ? (
                    <Button
                      variant="secondary"
                      size="xs"
                      loading={actionKey === `reject:${suggestion.suggestion_id}`}
                      disabled={actionKey !== null}
                      onClick={() => onReject(suggestion.suggestion_id)}
                    >
                      {rejectLabel}
                    </Button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {suggestion.items.map((item) => (
                    <li key={`${suggestion.suggestion_id}:${item.task_id}`} className="border border-edge px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AreaDot area={item.area as Area} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm leading-tight">{item.theme}</p>
                          <p className="text-xs text-muted">
                            {displayDate(item.current_due_date)} {"->"} {displayDate(item.suggested_due_date)}
                          </p>
                        </div>
                        {onAcceptItem ? (
                          <Button
                            variant="secondary"
                            size="xs"
                            loading={actionKey === `item:${suggestion.suggestion_id}:${item.task_id}`}
                            disabled={actionKey !== null || item.applied}
                            onClick={() => onAcceptItem(suggestion.suggestion_id, item.task_id)}
                            className="shrink-0"
                          >
                            {item.applied ? "Aceito" : acceptItemLabel}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
