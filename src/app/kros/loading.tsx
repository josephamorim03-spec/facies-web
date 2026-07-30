import { Skeleton } from "@/components/Skeleton";

/**
 * Mesma forma da pagina real -- se o skeleton descrever outro layout, a tela
 * troca de estrutura quando os dados chegam. Foi exatamente o defeito que o
 * `/hoje` tinha.
 */
export default function KrosLoading() {
  return (
    <div className="space-y-5 md:space-y-6" aria-label="Carregando o Kros" aria-busy="true">
      <header>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-72 max-w-full rounded-control" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        </div>
        <Skeleton className="mt-3.5 h-3.5 w-full max-w-2xl rounded-control" />
        <Skeleton className="mt-2 h-3.5 w-3/5 max-w-md rounded-control" />
      </header>

      {/* Linha de base. */}
      <div className="border-y border-edge py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3.5 w-36 rounded-control" />
          <Skeleton className="h-3 w-52 rounded-control" />
        </div>
      </div>

      {/* Tamanho da prova. */}
      <div className="border-y border-edge py-4">
        <Skeleton className="h-5 w-40 rounded-control" />
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1">
          <Skeleton className="min-h-24 rounded-control" />
          <Skeleton className="min-h-24 rounded-control" />
        </div>
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-edge pt-5">
          <Skeleton className="h-3.5 w-40 rounded-control" />
          <Skeleton className="h-3.5 w-48 rounded-control" />
          <Skeleton className="h-3.5 w-44 rounded-control" />
        </div>
      </div>

      <div>
        <Skeleton className="h-3.5 w-full max-w-2xl rounded-control" />
        <Skeleton className="mt-2 h-3.5 w-1/2 max-w-sm rounded-control" />
        <Skeleton className="mt-5 hidden h-11 w-48 rounded-control md:block" />
      </div>
    </div>
  );
}
