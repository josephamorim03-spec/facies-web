import { Skeleton } from "@/components/Skeleton";

export default function RevisaoTurboLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-36 rounded-control" />
      <div className="flex flex-col items-center space-y-4 py-8">
        <Skeleton className="h-32 w-32 rounded-control" />
        <Skeleton className="h-4 w-48 rounded-control" />
        <Skeleton className="h-3 w-32 rounded-control" />
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24 rounded-control" />
          <Skeleton className="h-10 w-24 rounded-control" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-edge p-3 space-y-2 rounded-surface">
            <Skeleton className="h-3 w-3/4 rounded-control" />
            <Skeleton className="h-3 w-full rounded-control" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-full rounded-control" />
              <Skeleton className="h-8 w-full rounded-control" />
              <Skeleton className="h-8 w-full rounded-control" />
              <Skeleton className="h-8 w-full rounded-control" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
