import { Skeleton } from "@/components/Skeleton";
import { LoadBar } from "@/components/ui/LoadBar";

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
      {/* A reticula abaixo so reserva a forma. Quem diz "esta carregando" e a
          barra — uma vez, no topo, e nao duzentos blocos pulsando juntos. */}
      <LoadBar label="Carregando o banco de questões" className="w-full max-w-xs" />

      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-3 w-32 " />
          <Skeleton className="h-6 w-44 " />
        </div>
        <Skeleton className="h-11 w-24 shrink-0 " />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 border-y border-edge">
            {/* 1. Foco clinico */}
            <div className="space-y-4 p-4 md:p-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 " />
                <Skeleton className="h-5 w-56 " />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`area-${index}`} className="h-11 " />
                ))}
              </div>
              <Skeleton className="h-11 w-full " />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`topic-${index}`} className="h-9 w-full " />
                ))}
              </div>
            </div>

            {/* 2. Refinar selecao */}
            <div className="flex items-center justify-between gap-3 border-t border-edge p-4 md:p-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 " />
                <Skeleton className="h-5 w-48 " />
              </div>
              <Skeleton className="h-4 w-40 shrink-0 " />
            </div>

            {/* 3. Modo e carga */}
            <div className="space-y-4 border-t border-edge p-4 md:p-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 " />
                <Skeleton className="h-5 w-64 " />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`mode-${index}`} className="h-24 " />
                ))}
              </div>
              <div className="space-y-3 border-t border-edge pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20 " />
                    <Skeleton className="h-10 w-24 " />
                  </div>
                  <Skeleton className="h-3 w-14 " />
                </div>
                <Skeleton className="h-1 w-full " />
              </div>
            </div>
          </div>
        </div>

        {/* Painel Resumo */}
        <div className="space-y-4 border-y border-edge py-4 lg:border-y-0 lg:border-l lg:py-0 lg:pl-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-36 " />
              <Skeleton className="h-6 w-24 " />
              <Skeleton className="h-4 w-40 " />
            </div>
            <Skeleton className="h-8 w-24 shrink-0 " />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`summary-${index}`} className="flex items-center gap-3 border-b border-edge py-3 last:border-b-0">
                <Skeleton className="h-9 w-9 shrink-0 " />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28 " />
                  <Skeleton className="h-4 w-20 " />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="hidden h-10 w-full md:block" />
            <Skeleton className="h-10 w-full " />
          </div>
        </div>
      </div>
    </div>
  );
}
