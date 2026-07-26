"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-8">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p className="text-sm text-muted">Algo deu errado. Tente recarregar a página.</p>
        <Button variant="secondary" onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </main>
  );
}
