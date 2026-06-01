"use client";

import { ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  zIndexClassName?: string;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  zIndexClassName = "z-[60]",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  function isDangerLabel(label: string): boolean {
    const normalized = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    return /(cancelar|sair|apagar|excluir|limpar|abandonar)/.test(normalized);
  }

  const confirmVariant = isDangerLabel(confirmLabel) ? "danger" : "outline";

  return (
    <div
      className={`fixed inset-0 bg-black/40 ${zIndexClassName} flex items-center justify-center p-4 modal-backdrop`}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Confirmação"}
        className="km-card w-full max-w-md space-y-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="font-serif text-lg leading-tight">{title}</h2>}
        <div className="text-sm text-ink">{message}</div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
