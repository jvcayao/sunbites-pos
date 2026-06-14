"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi } from "@/lib/api/reports";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCHOOL_MONTHS: { value: string; label: string }[] = [
  { value: "june", label: "June" },
  { value: "july", label: "July" },
  { value: "august", label: "August" },
  { value: "september", label: "September" },
  { value: "october", label: "October" },
  { value: "november", label: "November" },
  { value: "december", label: "December" },
  { value: "january", label: "January" },
  { value: "february", label: "February" },
  { value: "march", label: "March" },
];

function resolveCurrentSchoolMonth(): string {
  const month = new Date().getMonth(); // 0-indexed
  const names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  return names[month] ?? "june";
}

function PaymentStatusBadge({ status }: { status: "paid" | "unpaid" | "not_recorded" }) {
  const map = {
    paid: "bg-green-100 text-green-700 border-green-300",
    unpaid: "bg-red-100 text-red-700 border-red-300",
    not_recorded: "bg-muted text-muted-foreground border-border",
  };
  const label = status === "not_recorded" ? "Not Recorded" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", map[status])}>
      {label}
    </span>
  );
}

function usageCellClass(remaining: number): string {
  if (remaining === 0) return "text-red-600 font-semibold";
  if (remaining <= 5) return "text-amber-600 font-semibold";
  return "text-foreground";
}

function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SubscriptionReportPage() {
  const currentYear = new Date().getFullYear();

  const [schoolMonth, setSchoolMonth] = useState(resolveCurrentSchoolMonth);
  const [year, setYear] = useState(String(currentYear));
  const [page, setPage] = useState(1);

  const params = {
    month: schoolMonth,
    year: Number(year),
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-subscription", params],
    queryFn: () => reportApi.subscriptionUsage(params),
  });

  const rows = data?.data;
  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">Reports</p>
        <h1 className="text-xl font-bold text-foreground">Subscription Usage Report</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SCHOOL_MONTHS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => {
              setSchoolMonth(m.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              schoolMonth === m.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {m.label}
          </button>
        ))}

        <Select
          value={year}
          onValueChange={(v) => {
            setYear(v ?? String(currentYear));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[100px] text-xs" aria-label="Year filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load subscription data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Student</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Grade</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Payment</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Meal</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Snack</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Drink</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Extra</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Total Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : !rows?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No subscription students found for this month.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const cats = row.subscription_monthly_status.categories;
                  const totalRemaining =
                    cats.meal.remaining +
                    cats.snack.remaining +
                    cats.drink.remaining +
                    cats.extra.remaining;

                  return (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{row.full_name}</p>
                        {row.student_number && (
                          <p className="text-xs font-mono text-muted-foreground">{row.student_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <p>{row.grade_level}</p>
                        {row.section && (
                          <p className="text-xs text-muted-foreground">{row.section}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <PaymentStatusBadge status={row.payment_status} />
                      </td>
                      <td className={cn("px-4 py-2.5 text-center", usageCellClass(cats.meal.remaining))}>
                        {cats.meal.used}/{cats.meal.allocated}
                      </td>
                      <td className={cn("px-4 py-2.5 text-center", usageCellClass(cats.snack.remaining))}>
                        {cats.snack.used}/{cats.snack.allocated}
                      </td>
                      <td className={cn("px-4 py-2.5 text-center", usageCellClass(cats.drink.remaining))}>
                        {cats.drink.used}/{cats.drink.allocated}
                      </td>
                      <td className={cn("px-4 py-2.5 text-center", usageCellClass(cats.extra.remaining))}>
                        {cats.extra.used}/{cats.extra.allocated}
                      </td>
                      <td className={cn("px-4 py-2.5 text-center font-semibold", usageCellClass(totalRemaining))}>
                        {totalRemaining}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.current_page} of {meta.last_page} ({meta.total} records)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 font-medium text-foreground">
              {page} / {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={page === meta.last_page}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
