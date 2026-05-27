import { Skeleton } from "@/components/Skeleton";

export default function LogLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-7 w-24 rounded-sm" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-edge">
            <Skeleton className="h-3 w-20 rounded-sm shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-4/5 rounded-sm" />
              <Skeleton className="h-2.5 w-2/5 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
