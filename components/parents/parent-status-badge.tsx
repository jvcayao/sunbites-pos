import { cn } from "@/lib/utils";

interface ParentStatusBadgeProps {
  deletedAt: string | null;
  isDisabled: boolean;
  isActivated: boolean;
}

export function ParentStatusBadge({
  deletedAt,
  isDisabled,
  isActivated,
}: ParentStatusBadgeProps) {
  if (deletedAt) {
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-300">
        Deleted
      </span>
    );
  }
  if (isDisabled) {
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-300">
        Disabled
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
        isActivated
          ? "bg-green-100 text-green-700 border-green-300"
          : "bg-muted text-muted-foreground border-border",
      )}
    >
      {isActivated ? "Active" : "Pending"}
    </span>
  );
}
