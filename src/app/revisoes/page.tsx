import { Suspense } from "react";
import { SessoesContent } from "./_components/SessoesContent";
import { parseSessionsTab } from "@/lib/sessionsPanel";

export const dynamic = "force-dynamic";

type RevisoesPageProps = {
  searchParams: Promise<{
    tipo?: string | string[];
  }>;
};

export default async function RevisoesPage({ searchParams }: RevisoesPageProps) {
  const params = await searchParams;
  const rawTipo = Array.isArray(params.tipo) ? params.tipo[0] : params.tipo;
  const initialTab = parseSessionsTab(rawTipo);

  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted">Carregando...</main>}>
      <SessoesContent initialTab={initialTab} />
    </Suspense>
  );
}
