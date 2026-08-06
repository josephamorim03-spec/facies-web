import CronogramaClientPage from "./CronogramaClientPage";

type PageProps = {
  searchParams: Promise<{
    day?: string | string[];
    anchor?: string | string[];
    view?: string | string[];
  }>;
};

function validIsoDay(value: string | string[] | undefined): string | null {
  const day = Array.isArray(value) ? value[0] : value;
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const rawView = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const view = rawView === "month" ? "month" : "week";
  return (
    <CronogramaClientPage
      initialView={view}
      initialAnchor={validIsoDay(params?.anchor) ?? validIsoDay(params?.day)}
      initialSelectedDay={validIsoDay(params?.day) ?? validIsoDay(params?.anchor)}
    />
  );
}
