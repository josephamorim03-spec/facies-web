import { Skeleton } from "@/components/Skeleton";

export default function QuestionBankSessionLoading() {
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 border-b border-edge bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-40 rounded-sm" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-sm" />
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: 24 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-sm" />
        ))}
      </div>
      <section className="space-y-4 rounded-sm border border-edge p-4">
        <Skeleton className="h-4 w-32 rounded-sm" />
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-11/12 rounded-sm" />
        <Skeleton className="h-3 w-4/5 rounded-sm" />
      </section>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-sm" />
        ))}
      </div>
      <div className="sticky bottom-0 -mx-4 border-t border-edge bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-sm" />
          <Skeleton className="h-10 flex-1 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

