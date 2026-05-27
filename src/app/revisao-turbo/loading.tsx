import { Skeleton } from "@/components/Skeleton";

export default function RevisaoTurboLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-36 rounded-sm" />
      <div className="flex flex-col items-center space-y-4 py-8">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-4 w-48 rounded-sm" />
        <Skeleton className="h-3 w-32 rounded-sm" />
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24 rounded-sm" />
          <Skeleton className="h-10 w-24 rounded-sm" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-edge p-3 space-y-2 rounded-lg">
            <Skeleton className="h-3 w-3/4 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-full rounded-sm" />
              <Skeleton className="h-8 w-full rounded-sm" />
              <Skeleton className="h-8 w-full rounded-sm" />
              <Skeleton className="h-8 w-full rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
