import { cn } from "@/lib/utils";

import type { UserRole } from "@/types/user";

const roleStyles: Record<UserRole, string> = {
  admin:      "bg-primary/10 text-primary border-primary/20",
  manager:    "bg-blue-50 text-blue-700 border-blue-200",
  supervisor: "bg-purple-50 text-purple-700 border-purple-200",
  cashier:    "bg-muted text-foreground border-border",
};

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const style = roleStyles[role as UserRole] ?? "bg-muted text-foreground border-border";
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-3 py-1 rounded-full border uppercase",
        style,
        className
      )}
    >
      {role}
    </span>
  );
}
