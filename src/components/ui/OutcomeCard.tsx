import type { ReactNode } from "react";
import { Surface } from "./Surface";

export type OutcomeEvidence = {
  key: string;
  label: string;
  value: string | number;
  unit?: string | null;
  kind: "observed" | "estimated";
};

type OutcomeCardProps = {
  narrative: string;
  evidence: OutcomeEvidence[];
  action?: ReactNode;
  className?: string;
};

function EvidenceGroup({ title, items }: { title: string; items: OutcomeEvidence[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="paper-eyebrow">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.key} className="border border-edge bg-paper px-3 py-2 text-xs text-muted">
            <strong className="font-semibold text-ink">{item.value}{item.unit ?? ""}</strong> · {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function OutcomeCard({ narrative, evidence, action, className = "" }: OutcomeCardProps) {
  const observed = evidence.filter((item) => item.kind === "observed");
  const estimated = evidence.filter((item) => item.kind === "estimated");

  return (
    <Surface as="section" className={`p-5 ${className}`.trim()} aria-label="O que mudou com a última ação">
      <p className="paper-eyebrow text-success">Ciclo concluído</p>
      <h2 className="mt-1 font-serif text-xl font-semibold text-ink">O que mudou com sua última ação</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{narrative}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <EvidenceGroup title="Observado" items={observed} />
        <EvidenceGroup title="Estimativa" items={estimated} />
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </Surface>
  );
}
