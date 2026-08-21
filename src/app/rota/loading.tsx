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
          <Skeleton className="h-9 w-72 max-w-full " />
          <Skeleton className="h-8 w-8 shrink-0 " />
        </div>
        <Skeleton className="mt-3.5 h-3.5 w-full max-w-2xl " />
        <Skeleton className="mt-2 h-3.5 w-3/5 max-w-md " />
      </header>

      {/* Linha de base. */}
      <div className="border-y border-edge py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3.5 w-36 " />
          <Skeleton className="h-3 w-52 " />
        </div>
      </div>

      {/* Modo: quatro cartoes em grade 2x2. */}
      <div className="border-y border-edge py-4">
        <Skeleton className="h-5 w-20 " />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-[5.5rem] " />
          <Skeleton className="h-[5.5rem] " />
          <Skeleton className="h-[5.5rem] " />
          <Skeleton className="h-[5.5rem] " />
        </div>
      </div>

      {/* Tamanho da prova: numero grande, barra e o resumo da composicao. */}
      <div className="border-b border-edge pb-4">
        <Skeleton className="h-5 w-40 " />
        <div className="mt-4 flex items-baseline gap-3">
          <Skeleton className="h-9 w-16 " />
          <Skeleton className="h-3.5 w-40 " />
        </div>
        <Skeleton className="mt-3 h-4 w-full " />
        <Skeleton className="mt-5 h-11 w-full " />
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-edge pt-5">
          <Skeleton className="h-3.5 w-40 " />
          <Skeleton className="h-3.5 w-48 " />
        </div>
      </div>

      <div>
        <Skeleton className="h-3.5 w-full max-w-2xl " />
        <Skeleton className="mt-2 h-3.5 w-1/2 max-w-sm " />
        <Skeleton className="mt-5 hidden h-11 w-48 md:block" />
      </div>
    </div>
  );
}
