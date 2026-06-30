import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const accentClasses = {
  default: "border-border",
  success: "border-green-500",
  warning: "border-amber-500",
  danger: "border-red-500",
};

export function KpiCard({ label, value, sub, accent = "default", className }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 bg-card px-4 py-3",
        accentClasses[accent],
        className,
      )}
    >
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  );
}
