import { type ReactNode } from "react";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: Props) {
  return (
    <div className="space-y-1.5">
      <p className="paper-eyebrow">{label}</p>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
