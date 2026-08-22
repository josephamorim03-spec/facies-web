import type { ElementType, ReactNode } from "react";

type Props = {
  as?: ElementType;
  header?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * Card canônico — raio de superfície + borda + sombra soft, com cabeçalho/rodapé
 * opcionais. Substitui os `rounded-* border border-edge bg-surface` avulsos.
 */
export function Card({
  as: Tag = "section",
  header,
  footer,
  padded = true,
  className = "",
  bodyClassName = "",
  children,
}: Props) {
  return (
    <Tag className={`overflow-hidden rounded-control border border-edge bg-surface ${className}`}>
      {header != null && (
        <div className="flex items-center justify-between gap-2 border-b border-edge px-4 py-3">{header}</div>
      )}
      <div className={`${padded ? "p-4" : ""} ${bodyClassName}`.trim()}>{children}</div>
      {footer != null && (
        <div className="flex justify-end gap-2 border-t border-edge bg-surfaceMuted/60 px-4 py-3">{footer}</div>
      )}
    </Tag>
  );
}
