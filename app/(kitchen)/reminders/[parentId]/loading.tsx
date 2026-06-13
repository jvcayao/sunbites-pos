import { Skeleton } from "@/components/ui/skeleton";

export default function ReminderParentDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="rounded-lg border border-border p-6 space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <th key={i} className="px-4 py-3"><Skeleton className="h-4 w-20" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
