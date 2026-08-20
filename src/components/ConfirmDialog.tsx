"use client";

import type { ReactNode } from "react";
import { AlertDialog } from "radix-ui";
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
  function isDangerLabel(label: string): boolean {
    const normalized = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /(cancelar|sair|apagar|excluir|limpar|abandonar)/.test(normalized);
  }

  const confirmVariant = isDangerLabel(confirmLabel) ? "danger" : "outline";

  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={`fixed inset-0 bg-ink/45 ${zIndexClassName}`} />
        <AlertDialog.Content
          className={`paper-overlay fixed left-1/2 top-1/2 ${zIndexClassName} w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-surface border border-edge bg-surface p-5 focus:outline-none`}
        >
          {title ? (
            <AlertDialog.Title className="font-serif text-xl font-semibold leading-tight text-ink">{title}</AlertDialog.Title>
          ) : (
            <AlertDialog.Title className="sr-only">Confirmação</AlertDialog.Title>
          )}
          <AlertDialog.Description asChild>
            <div className={`${title ? "mt-2" : ""} text-sm leading-relaxed text-muted`}>{message}</div>
          </AlertDialog.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="sm">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={confirmVariant} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
