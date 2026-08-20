import {
  type QuestionBankAdminCandidate,
  type QuestionBankAdminWarning,
} from "@/lib/api/domains/question-bank-admin";

import { truncateText } from "./adminQuestionBankUtils";

export function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "danger" | "accent";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-danger bg-surfaceMuted text-danger/40/40"
      : tone === "accent"
        ? "border-info bg-surfaceMuted text-info/40/40"
        : "border-edge bg-surface text-ink";
  return (
    <div className={`rounded-surface border p-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-[11px] leading-4 opacity-70">{helper}</p> : null}
    </div>
  );
}

export function MetadataPill({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  const rendered = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="rounded-surface border border-edge bg-surface px-3 py-1 text-xs font-medium text-ink">
      <span className="opacity-60">{label}: </span>
      <span>{rendered}</span>
    </div>
  );
}

export function WarningBox({ warning }: { warning: QuestionBankAdminWarning }) {
  const toneClasses =
    warning.severity === "critical"
      ? "border-danger bg-surfaceMuted text-danger/40/40"
      : "border-warning bg-surfaceMuted text-warning/40/40";
  const samples = warning.samples ?? warning.sample ?? [];
  return (
    <div className={`rounded-surface border p-3 ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase">{warning.code}</div>
      <div className="mt-1 text-sm">{warning.message}</div>
      {warning.reason || warning.provider ? (
        <div className="mt-2 text-xs">
          {[warning.provider ? `provider: ${warning.provider}` : "", warning.reason ? `motivo: ${warning.reason}` : ""].filter(Boolean).join(" / ")}
        </div>
      ) : null}
      {warning.years_detected?.length ? (
        <div className="mt-2 text-xs">Anos: {warning.years_detected.join(", ")}</div>
      ) : null}
      {samples.length ? (
        <div className="mt-2 space-y-2 text-xs">
          {samples.map((sample) => (
            <div key={`${sample.question_number}-${sample.sample}`} className="rounded-surface bg-paper/5 px-3 py-2/5">
              <span className="font-semibold">Q{sample.question_number ?? "?"}</span>: {sample.sample}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CandidateRow({ item }: { item: QuestionBankAdminCandidate }) {
  const gradeColor = item.content_grade === "usable" ? "text-success"
    : item.content_grade === "raw" ? "text-warning"
    : "text-muted";
  return (
    <tr className="border-t border-edge align-top text-sm">
      <td className="px-3 py-3 font-medium text-ink">{item.question_number ?? "-"}</td>
      <td className="px-3 py-3 text-muted">{item.original_page ?? "-"}</td>
      <td className="px-3 py-3">
        <div className="font-medium text-ink">{item.status || "-"}</div>
        <div className="text-xs text-muted">{item.question_status || "sem questão"}</div>
      </td>
      <td className="px-3 py-3 text-ink">{item.year ?? "-"}</td>
      <td className="px-3 py-3 text-ink">{item.institution || "-"}</td>
      <td className="px-3 py-3 text-ink">{truncateText(item.raw_stem, 120) || "-"}</td>
      <td className={`px-3 py-3 text-xs font-medium ${gradeColor}`}>
        {item.content_grade || "-"}
        {item.has_image && <span className="ml-1 text-info" title="Tem imagem">img</span>}
      </td>
      <td className="px-3 py-3 text-right">
        {(() => {
          const conf = item.classification_confidence ?? item.extraction_confidence;
          if (conf === null || conf === undefined) return <span className="text-muted">-</span>;
          const cls = conf >= 0.85 ? "text-success font-semibold"
            : conf >= 0.60 ? "text-warning"
            : "text-danger";
          return <span className={cls}>{conf.toFixed(2)}</span>;
        })()}
      </td>
    </tr>
  );
}

export function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-surface border border-edge bg-paper/95 p-4 text-ink">
      <div className="mb-2 text-xs font-semibold uppercase text-muted">{title}</div>
      <pre className="overflow-auto text-xs leading-6 text-muted">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
