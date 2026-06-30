import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-6 pb-12">
      <div>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-1 h-6 w-28" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>

      <div className="space-y-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-52 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
