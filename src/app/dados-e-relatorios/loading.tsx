import { Skeleton } from "@/components/Skeleton";

export default function DadosERelatoriosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded-sm" />
        <Skeleton className="h-8 w-24 rounded-sm" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-sm border border-edge p-3">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-8 w-16 rounded-sm" />
            <Skeleton className="h-2.5 w-full rounded-sm" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-sm" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-edge py-2">
            <Skeleton className="h-3 w-3/5 rounded-sm" />
            <Skeleton className="ml-auto h-2.5 w-16 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

