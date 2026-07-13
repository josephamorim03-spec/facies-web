import type { HTMLAttributes, ReactNode } from "react";

export type SurfaceVariant = "default" | "quiet" | "outlined" | "elevated";

const VARIANTS: Record<SurfaceVariant, string> = {
  default: "border-edge bg-surface",
  quiet: "border-transparent bg-surfaceMuted",
  outlined: "border-edge bg-paper",
  elevated: "border-edge bg-surface paper-overlay",
};

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div" | "aside";
  variant?: SurfaceVariant;
  children: ReactNode;
};

export function Surface({ as: Tag = "div", variant = "default", className = "", children, ...props }: SurfaceProps) {
  return (
    <Tag {...props} className={`paper-surface ${VARIANTS[variant]} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
