import { Skeleton } from "@/components/Skeleton";

/**
 * Espelha a estrutura real de `banco/page.tsx`: cabecalho "Montar sessao", grade
 * de duas colunas (filtros + resumo de 21rem) e a lista de questoes.
 *
 * Fonte unica para o `loading.tsx` da rota E para o estado de carregamento do
 * cliente. Antes eram tres aparencias diferentes em sequencia — skeleton de um
 * layout que a pagina nao tem, depois um "Carregando..." de texto puro, depois o
 * conteudo — e cada troca dava um pulo.
 */
export function BancoDeQuestoesSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-3 w-32 rounded-control" />
          <Skeleton className="h-6 w-44 rounded-control" />
        </div>
        <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 border-y border-edge">
            {/* 1. Foco clinico */}
            <div className="space-y-4 p-4 md:p-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-control" />
                <Skeleton className="h-5 w-56 rounded-control" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`area-${index}`} className="h-11 rounded-control" />
                ))}
              </div>
              <Skeleton className="h-11 w-full rounded-control" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`topic-${index}`} className="h-9 w-full rounded-control" />
                ))}
              </div>
            </div>

            {/* 2. Refinar selecao */}
            <div className="flex items-center justify-between gap-3 border-t border-edge p-4 md:p-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-control" />
                <Skeleton className="h-5 w-48 rounded-control" />
              </div>
              <Skeleton className="h-4 w-40 shrink-0 rounded-control" />
            </div>

            {/* 3. Modo e carga */}
            <div className="space-y-4 border-t border-edge p-4 md:p-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-control" />
                <Skeleton className="h-5 w-64 rounded-control" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`mode-${index}`} className="h-24 rounded-surface" />
                ))}
              </div>
              <div className="space-y-3 border-t border-edge pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20 rounded-control" />
                    <Skeleton className="h-10 w-24 rounded-control" />
                  </div>
                  <Skeleton className="h-3 w-14 rounded-control" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Painel Resumo */}
        <div className="space-y-4 border-y border-edge py-4 lg:border-y-0 lg:border-l lg:py-0 lg:pl-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-36 rounded-control" />
              <Skeleton className="h-6 w-24 rounded-control" />
              <Skeleton className="h-4 w-40 rounded-control" />
            </div>
            <Skeleton className="h-8 w-24 shrink-0 rounded-control" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`summary-${index}`} className="flex items-center gap-3 border-b border-edge py-3 last:border-b-0">
                <Skeleton className="h-9 w-9 shrink-0 rounded-control" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28 rounded-control" />
                  <Skeleton className="h-4 w-20 rounded-control" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="hidden h-10 w-full rounded-control md:block" />
            <Skeleton className="h-10 w-full rounded-control" />
          </div>
        </div>
      </div>
    </div>
  );
}
