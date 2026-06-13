import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementDetailLoading() {
  return (
    <div className="max-w-2xl space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
