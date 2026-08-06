import Link from "next/link";

export function ScheduleViewTabs({
  active,
  anchor,
}: {
  active: "week" | "month";
  anchor: string;
}) {
  return (
    <nav aria-label="Visão do cronograma" className="mx-auto grid w-full max-w-xs grid-cols-2 border border-edge bg-paper p-1">
      {(["week", "month"] as const).map((view) => (
        <Link
          key={view}
          href={`/cronograma?view=${view}&anchor=${anchor}`}
          aria-current={active === view ? "page" : undefined}
          className={`flex min-h-9 items-center justify-center px-4 text-sm font-semibold transition ${
            active === view ? "bg-ink text-paper" : "text-muted hover:text-ink"
          }`}
        >
          {view === "week" ? "Semana" : "Mês"}
        </Link>
      ))}
    </nav>
  );
}
