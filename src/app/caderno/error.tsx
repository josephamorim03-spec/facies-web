"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-paper p-8">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <div className="text-sm font-medium text-danger">Erro no caderno</div>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-danger">{error.message}</pre>
        </div>
        <button
          onClick={() => reset()}
          className="rounded-lg border border-edge px-3 py-2 text-sm text-ink hover:bg-surfaceMuted"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
