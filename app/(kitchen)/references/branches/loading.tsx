import { Skeleton } from "@/components/ui/skeleton";

export default function BranchesLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(["skeleton-a", "skeleton-b"] as const).map((key) => (
          <Skeleton key={key} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
