import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionConfigLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-8 w-40" />
      <div className="space-y-2">
        {(["sk-a", "sk-b", "sk-c"] as const).map((key) => (
          <Skeleton key={key} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
