import Link from "next/link";

import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS } from "@/components/ui/Tabs";

export function ScheduleViewTabs({
  active,
  anchor,
}: {
  active: "week" | "month";
  anchor: string;
}) {
  return (
    <nav aria-label="Visão do cronograma" className={`${TAB_LIST_CLASS} mx-auto w-full max-w-xs`}>
      {(["week", "month"] as const).map((view) => (
        <Link
          key={view}
          href={`/cronograma?view=${view}&anchor=${anchor}`}
          aria-current={active === view ? "page" : undefined}
          className={`${TAB_TRIGGER_CLASS} flex-1 justify-center text-sm`}
        >
          {view === "week" ? "Semana" : "Mês"}
        </Link>
      ))}
    </nav>
  );
}
