import { Skeleton } from "@/components/ui/skeleton";

export default function PosLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6">
        <Skeleton className="h-10 w-96" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(["a", "b", "c"] as const).map((k) => (
            <Skeleton key={k} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
