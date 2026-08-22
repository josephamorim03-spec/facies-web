import { Skeleton } from "@/components/Skeleton";
import { LoadBar } from "@/components/ui/LoadBar";

/**
 * Maquete do `/hoje`: coluna única, herói com placa de área, e a pilha de
 * seções separadas por régua.
 *
 * A forma tem que bater com o que VAI renderizar, não com o que já renderizou.
 * A versão anterior desenhava a página de duas gerações atrás — um "resumo do
 * dia" que virou grade de três células, uma faixa de "carga do dia" cujo
 * componente foi deletado, e uma agenda de três linhas que hoje é a seção
 * "Depois". Nada disso existia mais, então a página trocava de layout inteiro
 * quando os dados chegavam: o oposto do que um esqueleto serve para fazer.
 *
 * A ordem aqui espelha `CanonicalTodayDashboard` linha a linha. Quando aquele
 * arquivo ganhar ou perder uma seção, esta precisa acompanhar — e a prova de
 * que não acompanhou é visual, não é um teste que quebra.
 */
export function TodayPageSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6" aria-label="Carregando seu dia" aria-busy="true">
      {/* Os blocos abaixo só reservam a forma. Quem diz "está carregando" é a
          barra — uma vez, no topo, e não duzentos blocos pulsando juntos. */}
      <LoadBar label="Carregando seu dia" className="w-full max-w-xs" />

      {/* Saudação: só o h1, sem subtítulo. */}
      <Skeleton className="h-9 w-56" />

      {/* Herói, na geometria exata do `TodayPrimaryAction`. */}
      <section className="paper-surface overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          <div className="flex shrink-0 items-center justify-center border-b border-edge bg-surfaceMuted px-5 py-4 sm:w-24 sm:border-b-0 sm:border-r sm:py-5">
            <Skeleton className="h-11 w-11" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-28" />
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <div>
                <Skeleton className="h-8 w-4/5 sm:h-9" />
                <Skeleton className="mt-2 h-8 w-2/5 sm:h-9" />
                <Skeleton className="mt-3 h-3.5 w-full max-w-2xl" />
                <Skeleton className="mt-2 h-3.5 w-3/4 max-w-2xl" />
              </div>
            </div>
            <Skeleton className="h-12 w-full shrink-0 md:w-36" />
          </div>
        </div>
      </section>

      {/* Dimensionamento: uma linha fechada, que é como ele nasce. */}
      <div className="flex min-h-11 items-center border-y border-edge">
        <Skeleton className="h-3.5 w-64" />
      </div>

      {/* Resumo em três células. */}
      <div className="grid grid-cols-3 divide-x divide-edge border-y border-edge py-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`resumo-sk-${index}`} className="flex flex-col items-center gap-1.5 px-2 sm:px-4">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* "Depois". */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
        <div className="mt-3 divide-y divide-edge border-y border-edge">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`depois-sk-${index}`} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-2.5 w-28" />
              </div>
              <Skeleton className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* "Alternativas e métricas", fechada. */}
      <div className="flex min-h-11 items-center border-y border-edge">
        <Skeleton className="h-3.5 w-44" />
      </div>
    </div>
  );
}
