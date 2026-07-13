import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  size?: "sm" | "md";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", className = "", children, type = "button", ...props },
  ref,
) {
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      aria-label={label}
      title={props.title ?? label}
      className={`paper-control inline-flex shrink-0 items-center justify-center border border-edge text-muted hover:border-primary hover:bg-surfaceMuted hover:text-ink disabled:opacity-50 ${sizeClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
});
