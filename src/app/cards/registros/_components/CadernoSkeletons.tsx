import { Skeleton } from "@/components/Skeleton";

import { AREAS } from "../_lib/cadernoShared";

export function CadernoRegistroSkeleton() {
  return (
    <section
      data-caderno-registro-panel="true"
      className="w-full space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] md:pb-0"
    >
      <div data-caderno-registro-area-picker="true" className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-center">
        {AREAS.map((areaName) => (
          <Skeleton key={`registro-skeleton-area-${areaName}`} className="h-8 w-full sm:w-24 rounded-sm" />
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-sm" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-8 w-full rounded-sm" />
        <Skeleton className="h-8 w-full rounded-sm" />
      </div>
      <Skeleton className="h-14 w-full rounded-sm" />
      <Skeleton className="h-24 w-full rounded-sm" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-20 rounded-sm" />
        <Skeleton className="h-2 w-full rounded-sm" />
      </div>
      <Skeleton className="h-8 w-32 rounded-sm" />
      <Skeleton className="h-10 w-full rounded-sm" />
    </section>
  );
}

export function CadernoPesquisarSkeleton() {
  return (
    <section
      data-caderno-pesquisar-panel="true"
      className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] md:pb-0"
    >
      <div data-caderno-pesquisar-area-picker="true" className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-center">
        {AREAS.map((areaName) => (
          <Skeleton key={`pesquisar-skeleton-area-${areaName}`} className="h-8 w-full sm:w-24 rounded-sm" />
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-sm" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-12 w-full rounded-sm" />
        <Skeleton className="h-12 w-full rounded-sm" />
      </div>
      <Skeleton className="h-36 w-full rounded-sm" />
      <Skeleton className="h-10 w-full rounded-sm" />
    </section>
  );
}

export function CadernoSearchResultsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20 rounded-sm" />
      {[1, 2, 3].map((item) => (
        <div key={`search-results-skeleton-${item}`} className="border border-edge p-3 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-sm" />
          <Skeleton className="h-3 w-2/3 rounded-sm" />
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-11/12 rounded-sm" />
        </div>
      ))}
    </div>
  );
}
