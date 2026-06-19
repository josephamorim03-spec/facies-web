import { Skeleton } from "@/components/Skeleton";

export default function RelatorioLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-sm" />
        <Skeleton className="h-8 w-24 rounded-sm" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <section key={index} className="space-y-3 rounded-sm border border-edge p-4">
          <Skeleton className="mx-auto h-3 w-32 rounded-sm" />
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-11/12 rounded-sm" />
          <Skeleton className="h-3 w-4/5 rounded-sm" />
        </section>
      ))}
    </div>
  );
}

