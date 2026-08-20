"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, footer, className = "" }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-ink/45" />
        <DialogPrimitive.Content className={`paper-overlay fixed left-1/2 top-1/2 z-[71] max-h-[min(85dvh,48rem)] w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-surface border border-edge bg-surface p-5 focus:outline-none ${className}`.trim()}>
          <DialogPrimitive.Title className="font-serif text-xl font-semibold leading-tight text-ink">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted">{description}</DialogPrimitive.Description> : null}
          <div className="mt-4">{children}</div>
          {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
