"use client";

import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface FilterPillGroupProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterPillGroup({
  label,
  options,
  value,
  onChange,
  className,
}: FilterPillGroupProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          value === ""
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
