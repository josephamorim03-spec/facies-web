import type { ReactNode } from "react";
import type { QuestionBankSession } from "@/lib/api";
import { formatDurationMs } from "@/lib/formatDuration";
import { isExamLike, sessionDurationMs } from "@/lib/sessionsPanel";
import { IconClock, IconExam, IconHistory, IconOpenSession } from "./icons";

function MetricCard({
  label,
  value,
  detail,
  icon,
  testId,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4 shadow-sm" data-sessions-metric={testId}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-9 shrink-0 items-center justify-center text-muted">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold leading-tight text-ink">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </div>
  );
}

export function SessionsMetrics({ sessions }: { sessions: QuestionBankSession[] }) {
  const activeCount = sessions.filter((session) => session.status === "active").length;
  const finalizedCount = sessions.filter((session) => session.status === "finalized").length;
  const scored = sessions.filter((session) => session.status !== "invalidated");
  const examCount = scored.filter((session) => isExamLike(session)).length;
  const totalTimeMs = scored.reduce((sum, session) => sum + (sessionDurationMs(session) ?? 0), 0);

  return (
    <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      <MetricCard
        label="Inacabadas"
        value={String(activeCount)}
        detail="Continue de onde parou"
        icon={<IconOpenSession className="h-6 w-6" />}
        testId="inacabadas"
      />
      <MetricCard
        label="Resultados"
        value={String(finalizedCount)}
        detail="Sessões finalizadas para revisar"
        icon={<IconHistory className="h-6 w-6" />}
        testId="resultados"
      />
      <MetricCard
        label="Provas e simulados"
        value={String(examCount)}
        detail="Simulados e provas completas"
        icon={<IconExam className="h-6 w-6" />}
        testId="provas"
      />
      <MetricCard
        label="Tempo total"
        value={formatDurationMs(totalTimeMs) ?? "—"}
        detail="Respondido nas últimas 30 sessões"
        icon={<IconClock className="h-6 w-6" />}
        testId="tempo"
      />
    </section>
  );
}
