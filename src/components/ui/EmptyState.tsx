import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className = "" }: EmptyStateProps) {
  return (
    <section className={`paper-surface flex flex-col items-center px-5 py-8 text-center ${className}`.trim()}>
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <h2 className="font-serif text-2xl font-semibold leading-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
