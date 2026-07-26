import type { ReactNode } from "react";
import { TONE_ALERT, type Tone } from "@/lib/toneClasses";

export type AlertVariant = "danger" | "warning" | "success" | "info";

// Nomes legados do Alert → tom canônico (fonte única em lib/toneClasses).
const VARIANT_TONE: Record<AlertVariant, Tone> = {
  danger: "critical",
  warning: "attention",
  success: "positive",
  info: "info",
};

type AlertProps = {
  variant?: AlertVariant;
  /** Optional leading icon (already sized/colored to currentColor). */
  icon?: ReactNode;
  /** Optional trailing action (e.g. a "Tentar novamente" button). */
  action?: ReactNode;
  /** When provided, renders a dismiss (×) button that calls this. */
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Theme-safe inline message box. Uses semantic border/text tokens over `bg-surface`
 * so it works in light and dark — replacing scattered `border-red-200 bg-red-50` patterns.
 */
export function Alert({ variant = "info", icon, action, onDismiss, children, className = "" }: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-surface border bg-surface px-4 py-3 text-sm ${TONE_ALERT[VARIANT_TONE[variant]]} ${className}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 text-ink">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
