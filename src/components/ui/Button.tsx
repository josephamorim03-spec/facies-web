import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   "bg-ink text-paper border border-ink hover:opacity-90",
  secondary: "border border-edge text-muted hover:text-ink hover:border-ink",
  outline:   "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost:     "text-muted hover:text-ink",
  danger:    "border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "text-xs px-2 py-1",
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-sm font-serif leading-none " +
  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/40";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "sm",
  loading = false,
  leftIcon,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {loading ? (
        <span className="opacity-60">…</span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
