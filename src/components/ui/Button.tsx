import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-primary bg-primary text-primaryInk hover:brightness-[1.04]",
  secondary: "border border-edge bg-surface text-muted hover:border-primary hover:text-ink hover:bg-surfaceMuted",
  outline: "border border-primary text-primary hover:bg-primary hover:text-primaryInk",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink",
  danger: "border border-danger bg-danger text-primaryInk hover:brightness-[1.04]",
  success: "border border-success bg-success text-primaryInk hover:brightness-[1.04]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "min-h-8 text-xs px-2.5 py-1",
  sm: "min-h-10 text-xs px-3 py-2",
  md: "min-h-11 text-sm px-4 py-2.5",
};

const BASE =
  "paper-control inline-flex items-center justify-center gap-1.5 font-sans font-medium leading-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({
  variant = "secondary",
  size = "sm",
  loading = false,
  leftIcon,
  disabled,
  children,
  className = "",
  ...rest
}, ref) {
  return (
    <button
      ref={ref}
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
});
