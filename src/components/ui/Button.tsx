import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-primary bg-primary text-primaryInk shadow-sm hover:brightness-105",
  secondary: "border border-edge bg-surface text-muted hover:border-primary hover:text-ink hover:bg-surfaceMuted",
  outline: "border border-primary text-primary hover:bg-primary hover:text-primaryInk",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink",
  danger: "border border-danger text-danger hover:bg-surfaceMuted",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "text-xs px-2 py-1",
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-sans font-medium leading-none " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

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
        <span className="opacity-60">...</span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
