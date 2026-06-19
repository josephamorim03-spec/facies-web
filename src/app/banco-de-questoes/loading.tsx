import { Skeleton } from "@/components/Skeleton";

export default function BancoDeQuestoesLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 rounded-sm" />
          <Skeleton className="h-3 w-56 rounded-sm" />
        </div>
        <Skeleton className="h-9 w-24 rounded-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-sm" />
        ))}
      </div>
      <div className="space-y-2 rounded-sm border border-edge p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Skeleton className="h-9 rounded-sm" />
          <Skeleton className="h-9 rounded-sm" />
          <Skeleton className="h-9 rounded-sm" />
        </div>
        <Skeleton className="h-9 w-full rounded-sm" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-sm border border-edge p-3">
            <Skeleton className="h-4 w-2/3 rounded-sm" />
            <Skeleton className="mt-3 h-3 w-full rounded-sm" />
            <Skeleton className="mt-2 h-3 w-5/6 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

