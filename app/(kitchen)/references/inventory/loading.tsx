import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
