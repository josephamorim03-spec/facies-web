"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">Erro na página de hoje</div>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-red-800">{error.message}</pre>
        </div>
        <button
          onClick={() => reset()}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
