import { Skeleton } from "@/components/Skeleton";
import { TodayDaySummarySkeleton } from "./TodayDaySummary";

/**
 * Maquete do ramo canonico do `/hoje` -- coluna unica, heroi com placa de area,
 * e a pilha de secoes separadas por regua.
 *
 * A forma tem que bater com o que vai renderizar, nao com o que ja renderizou:
 * a versao anterior desenhava a grade de duas colunas do ramo legado, entao a
 * pagina trocava de layout inteiro quando os dados chegavam. Por isso o resumo
 * do dia entra aqui pelo `TodayDaySummarySkeleton` de verdade: quando `loading`
 * cai, esse bloco continua exatamente onde esta enquanto o resto se preenche,
 * em vez de sumir e voltar em outro formato.
 */
export function TodayPageSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6" aria-label="Carregando seu dia" aria-busy="true">
      {/* Saudacao: o canonico tem so o h1, sem subtitulo. */}
      <Skeleton className="h-9 w-56 rounded-control" />

      {/* Heroi, na geometria exata do TodayPrimaryAction. */}
      <section className="overflow-hidden rounded-surface border border-edge bg-paper">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          <div className="flex shrink-0 items-center justify-center border-b border-edge bg-surfaceMuted px-5 py-4 sm:w-24 sm:border-b-0 sm:border-r sm:py-5">
            <Skeleton className="h-11 w-11 rounded-control" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-28 rounded-control" />
                <Skeleton className="h-2.5 w-20 rounded-control" />
                <Skeleton className="h-2.5 w-12 rounded-control" />
              </div>
              <div>
                <Skeleton className="h-8 w-4/5 rounded-control sm:h-9" />
                <Skeleton className="mt-2 h-8 w-2/5 rounded-control sm:h-9" />
                <Skeleton className="mt-3 h-3.5 w-full max-w-2xl rounded-control" />
                <Skeleton className="mt-2 h-3.5 w-3/4 max-w-2xl rounded-control" />
              </div>
            </div>
            <Skeleton className="h-12 w-full shrink-0 rounded-control md:w-36" />
          </div>
        </div>
      </section>

      <TodayDaySummarySkeleton />

      {/* Carga do dia. */}
      <div className="border-y border-edge px-1 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3.5 w-32 rounded-control" />
          <Skeleton className="h-3 w-24 rounded-control" />
        </div>
      </div>

      {/* Agenda curta. */}
      <div className="border-y border-edge py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 rounded-control" />
            <Skeleton className="h-3 w-52 rounded-control" />
          </div>
        </div>
        <div className="mt-4 divide-y divide-edge border-y border-edge">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`schedule-sk-${index}`} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/5 rounded-control" />
                <Skeleton className="h-2.5 w-28 rounded-control" />
              </div>
              <Skeleton className="h-3 w-14 shrink-0 rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
