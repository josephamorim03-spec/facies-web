import CronogramaClientPage from "./CronogramaClientPage";

type PageProps = {
  searchParams: Promise<{ day?: string | string[] }>;
};

function validIsoDay(value: string | string[] | undefined): string | null {
  const day = Array.isArray(value) ? value[0] : value;
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return <CronogramaClientPage initialSelectedDay={validIsoDay(params?.day)} />;
}
