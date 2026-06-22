import {
  type QuestionBankAdminCandidate,
  type QuestionBankAdminWarning,
} from "@/lib/api/domains/question-bank-admin";

import { truncateText } from "./adminQuestionBankUtils";

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "danger" | "accent";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
      : tone === "accent"
        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
        : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";
  return (
    <div className={`rounded-2xl border p-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function MetadataPill({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  const rendered = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <span className="opacity-60">{label}: </span>
      <span>{rendered}</span>
    </div>
  );
}

export function WarningBox({ warning }: { warning: QuestionBankAdminWarning }) {
  const toneClasses =
    warning.severity === "critical"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200";
  return (
    <div className={`rounded-2xl border p-3 ${toneClasses}`}>
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
      {warning.samples?.length ? (
        <div className="mt-2 space-y-2 text-xs">
          {warning.samples.map((sample) => (
            <div key={`${sample.question_number}-${sample.sample}`} className="rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
              <span className="font-semibold">Q{sample.question_number ?? "?"}</span>: {sample.sample}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CandidateRow({ item }: { item: QuestionBankAdminCandidate }) {
  const gradeColor = item.content_grade === "usable" ? "text-green-600 dark:text-green-400"
    : item.content_grade === "raw" ? "text-yellow-600 dark:text-yellow-400"
    : "text-gray-400";
  return (
    <tr className="border-t border-gray-100 align-top text-sm dark:border-gray-800">
      <td className="px-3 py-3 font-medium text-gray-700 dark:text-gray-200">{item.question_number ?? "-"}</td>
      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{item.original_page ?? "-"}</td>
      <td className="px-3 py-3">
        <div className="font-medium text-gray-900 dark:text-gray-100">{item.status || "-"}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{item.question_status || "sem questao"}</div>
      </td>
      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{item.year ?? "-"}</td>
      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{item.institution || "-"}</td>
      <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{truncateText(item.raw_stem, 120) || "-"}</td>
      <td className={`px-3 py-3 text-xs font-medium ${gradeColor}`}>
        {item.content_grade || "-"}
        {item.has_image && <span className="ml-1 text-blue-400" title="Tem imagem">img</span>}
      </td>
      <td className="px-3 py-3 text-right">
        {(() => {
          const conf = item.classification_confidence ?? item.extraction_confidence;
          if (conf === null || conf === undefined) return <span className="text-gray-400">-</span>;
          const cls = conf >= 0.85 ? "text-green-600 font-semibold dark:text-green-400"
            : conf >= 0.60 ? "text-yellow-600 dark:text-yellow-400"
            : "text-red-500 dark:text-red-400";
          return <span className={cls}>{conf.toFixed(2)}</span>;
        })()}
      </td>
    </tr>
  );
}

export function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-950/95 p-4 text-white dark:border-gray-800">
      <div className="mb-2 text-xs font-semibold uppercase text-gray-400">{title}</div>
      <pre className="overflow-auto text-xs leading-6 text-gray-100">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
