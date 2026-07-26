"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-paper p-8">
      <div className="mx-auto max-w-4xl space-y-3">
        <Alert variant="danger">
          <div>
            <p className="font-medium">Erro na página de desempenho</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted">{error.message}</pre>
          </div>
        </Alert>
        <Button variant="secondary" onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </main>
  );
}
