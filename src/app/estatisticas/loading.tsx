import { Skeleton } from "@/components/Skeleton";

/**
 * A espera desta rota usa a MESMA superfície do conteúdo que vai substituir —
 * `paper-surface`, e não uma moldura `border border-edge` sem raio. Sem isso a
 * tela muda de forma ao acabar de carregar, que é o defeito que um esqueleto
 * existe para não ter.
 */
export default function EstatisticasLoading() {
  return (
    <div className="ritmo-secao" aria-busy="true">
      <Skeleton className="h-7 w-36" rotulo="Gráficos carregando" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="paper-surface space-y-3 p-4 sm:p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="paper-surface space-y-3 p-4 sm:p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
