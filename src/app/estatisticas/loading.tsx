import { Skeleton } from "@/components/Skeleton";

export default function EstatisticasLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-36 " />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 space-y-3 ">
            <Skeleton className="h-4 w-24 " />
            <Skeleton className="h-8 w-16 " />
            <Skeleton className="h-3 w-full " />
            <Skeleton className="h-3 w-3/4 " />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full " />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-edge">
            <Skeleton className="h-3 w-3/5 " />
            <Skeleton className="h-2.5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
