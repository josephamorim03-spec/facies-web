import { Suspense } from "react";
import { SessoesContent } from "./_components/SessoesContent";

export default function RevisoesPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted">Carregando...</main>}>
      <SessoesContent />
    </Suspense>
  );
}
