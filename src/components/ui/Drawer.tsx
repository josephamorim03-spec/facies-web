"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
};

export function Drawer({ open, onOpenChange, title, children, side = "left" }: DrawerProps) {
  const sideClass = side === "left" ? "left-0 border-r" : "right-0 border-l";
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-ink/40" />
        <DialogPrimitive.Content className={`paper-overlay fixed inset-y-0 z-[71] w-[min(88vw,20rem)] overflow-y-auto border-edge bg-paper p-5 focus:outline-none ${sideClass}`}>
          <DialogPrimitive.Title className="text-lg font-semibold text-ink">{title}</DialogPrimitive.Title>
          <div className="mt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
