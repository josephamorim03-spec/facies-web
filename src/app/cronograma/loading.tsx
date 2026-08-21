import { Skeleton } from "@/components/Skeleton";

export default function CronogramaLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-7 w-36 " />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 space-y-3 ">
            <Skeleton className="h-4 w-3/4 " />
            <Skeleton className="h-3 w-full " />
            <Skeleton className="h-3 w-1/2 " />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 " />
              <Skeleton className="h-6 w-16 " />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
