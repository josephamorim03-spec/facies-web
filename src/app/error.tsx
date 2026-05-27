"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p className="text-sm text-muted">Algo deu errado. Tente recarregar a página.</p>
        <button
          onClick={() => reset()}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
