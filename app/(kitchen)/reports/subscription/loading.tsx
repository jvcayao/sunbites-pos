import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionReportLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-52" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
