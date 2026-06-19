import { Skeleton } from "@/components/Skeleton";

export default function GraficosLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-sm" />
        <Skeleton className="h-8 w-24 rounded-sm" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-sm border border-edge p-4">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-56 w-full rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

