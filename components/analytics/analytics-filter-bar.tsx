"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AnalyticsParams } from "@/types/analytics";

// ---------------------------------------------------------------------------
// School-year helpers
// ---------------------------------------------------------------------------

const SCHOOL_MONTHS = [
  { value: "june", label: "June", num: 6 },
  { value: "july", label: "July", num: 7 },
  { value: "august", label: "August", num: 8 },
  { value: "september", label: "September", num: 9 },
  { value: "october", label: "October", num: 10 },
  { value: "november", label: "November", num: 11 },
  { value: "december", label: "December", num: 12 },
  { value: "january", label: "January", num: 1 },
  { value: "february", label: "February", num: 2 },
  { value: "march", label: "March", num: 3 },
] as const;

type SchoolMonthValue = (typeof SCHOOL_MONTHS)[number]["value"];

function currentSchoolYear(): number {
  const now = new Date();
  return now.getMonth() + 1 >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function thisSchoolYearPreset(): AnalyticsParams {
  const sy = currentSchoolYear();
  return {
    from_month: "june",
    from_year: sy,
    to_month: "march",
    to_year: sy + 1,
  };
}

function lastSchoolYearPreset(): AnalyticsParams {
  const sy = currentSchoolYear() - 1;
  return {
    from_month: "june",
    from_year: sy,
    to_month: "march",
    to_year: sy + 1,
  };
}

function firstHalfPreset(): AnalyticsParams {
  const sy = currentSchoolYear();
  return {
    from_month: "june",
    from_year: sy,
    to_month: "october",
    to_year: sy,
  };
}

function secondHalfPreset(): AnalyticsParams {
  const sy = currentSchoolYear();
  return {
    from_month: "november",
    from_year: sy,
    to_month: "march",
    to_year: sy + 1,
  };
}

const PRESETS: { label: string; fn: () => AnalyticsParams }[] = [
  { label: "This School Year", fn: thisSchoolYearPreset },
  { label: "Last School Year", fn: lastSchoolYearPreset },
  { label: "First Half", fn: firstHalfPreset },
  { label: "Second Half", fn: secondHalfPreset },
];

// ---------------------------------------------------------------------------
// Year options (last 4 school years)
// ---------------------------------------------------------------------------

function yearOptions(): number[] {
  const current = currentSchoolYear();
  return [current, current - 1, current - 2, current - 3];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  params: AnalyticsParams;
  onChange: (params: AnalyticsParams) => void;
  className?: string;
}

export function AnalyticsFilterBar({ params, onChange, className }: Props) {
  const activePreset = PRESETS.findIndex((p) => {
    const preset = p.fn();
    return (
      preset.from_month === params.from_month &&
      preset.from_year === params.from_year &&
      preset.to_month === params.to_month &&
      preset.to_year === params.to_year
    );
  });

  const years = yearOptions();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Preset buttons */}
      <div className="flex gap-1">
        {PRESETS.map((p, i) => (
          <Button
            key={p.label}
            size="sm"
            variant={activePreset === i ? "default" : "outline"}
            onClick={() => onChange(p.fn())}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <span className="text-muted-foreground text-sm">or</span>

      {/* Custom from */}
      <Select
        value={params.from_month}
        onValueChange={(v) =>
          onChange({ ...params, from_month: v as SchoolMonthValue })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCHOOL_MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(params.from_year)}
        onValueChange={(v) => onChange({ ...params, from_year: Number(v) })}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground text-sm">to</span>

      {/* Custom to */}
      <Select
        value={params.to_month}
        onValueChange={(v) =>
          onChange({ ...params, to_month: v as SchoolMonthValue })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCHOOL_MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(params.to_year)}
        onValueChange={(v) => onChange({ ...params, to_year: Number(v) })}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y + 1)}>
              {y + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
