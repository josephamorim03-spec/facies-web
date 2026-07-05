import { Suspense } from "react";
import { SessoesContent } from "../revisoes/_components/SessoesContent";

export const dynamic = "force-dynamic";

// Canonical Simulados route: measurement/results view. Renders the sessions
// panel locked to the "provas" tab (no redirect, no tab switching back to
// /revisoes). Starting a simulado lives in Questões until Fase 3.
export default function ProvasPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted">Carregando...</main>}>
      <SessoesContent initialTab="provas" lockedTab="provas" variant="simulados" />
    </Suspense>
  );
}
