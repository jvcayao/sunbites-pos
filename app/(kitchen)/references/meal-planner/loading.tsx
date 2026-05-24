import { Skeleton } from "@/components/ui/skeleton";

export default function MealPlannerLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-12 rounded-full" />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
