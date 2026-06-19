import type { ReactNode } from "react";

export type AlertVariant = "danger" | "warning" | "success" | "info";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  danger: "border-danger text-danger",
  warning: "border-warning text-warning",
  success: "border-success text-success",
  info: "border-info text-info",
};

type AlertProps = {
  variant?: AlertVariant;
  /** Optional leading icon (already sized/colored to currentColor). */
  icon?: ReactNode;
  /** Optional trailing action (e.g. a "Tentar novamente" button). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Theme-safe inline message box. Uses semantic border/text tokens over `bg-surface`
 * so it works in light and dark — replacing scattered `border-red-200 bg-red-50` patterns.
 */
export function Alert({ variant = "info", icon, action, children, className = "" }: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 text-ink">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
