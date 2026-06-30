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

const SCHOOL_MONTHS = [
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

const GRADE_LEVELS = [
  "Nursery",
  "Kinder 1",
  "Kinder 2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

function getDefaultSchoolMonth(): string {
  const month = new Date().getMonth();
  const map: Record<number, string> = {
    0: "January",
    1: "February",
    2: "March",
    5: "June",
    6: "July",
    7: "August",
    8: "September",
    9: "October",
    10: "November",
    11: "December",
  };
  return map[month] ?? "June";
}

function getDefaultSchoolYear(): number {
  const now = new Date();
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
}

function usageCellClass(remaining: number): string {
  if (remaining === 0) return "text-red-600 font-semibold";
  if (remaining <= 5) return "text-amber-600 font-semibold";
  return "text-foreground";
}

function PaymentStatusBadge({
  status,
}: {
  status: "paid" | "unpaid" | "not_recorded";
}) {
  const map = {
    paid: "bg-green-100 text-green-700 border-green-300",
    unpaid: "bg-red-100 text-red-700 border-red-300",
    not_recorded: "bg-muted text-muted-foreground border-border",
  };
  const label =
    status === "not_recorded"
      ? "Not Recorded"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
        map[status],
      )}
    >
      {label}
    </span>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
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
  const [schoolMonth, setSchoolMonth] = useState(getDefaultSchoolMonth);
  const [year, setYear] = useState(String(getDefaultSchoolYear()));
  const [status, setStatus] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showHistorical, setShowHistorical] = useState(false);

  const params = {
    month: schoolMonth.toLowerCase(),
    year: Number(year),
    status: status !== "all" ? status : undefined,
    grade_level: gradeLevel !== "all" ? gradeLevel : undefined,
    search: search.trim() || undefined,
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
        <h1 className="text-xl font-bold text-foreground">
          Subscription Usage Report
        </h1>
      </div>

      {/* Month pill filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SCHOOL_MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setSchoolMonth(m);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              schoolMonth === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={year}
          onValueChange={(v) => {
            setYear(v ?? String(getDefaultSchoolYear()));
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[100px] text-xs"
            aria-label="Year filter"
          >
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

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[150px] text-xs"
            aria-label="Payment status filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="not_recorded">Not Recorded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={gradeLevel}
          onValueChange={(v) => {
            setGradeLevel(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[140px] text-xs"
            aria-label="Grade level filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {GRADE_LEVELS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search student..."
          aria-label="Search student by name or number"
          className="h-8 w-[160px] rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
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
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Grade
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Payment
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                  Meal
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                  Snack
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                  Drink
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                  Extra
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                  Total Remaining
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : !rows?.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No subscription students found for the selected filters.
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
                        <p className="font-medium text-foreground">
                          {row.full_name}
                        </p>
                        {row.student_number && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {row.student_number}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <p>{row.grade_level}</p>
                        {row.section && (
                          <p className="text-xs text-muted-foreground">
                            {row.section}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <PaymentStatusBadge status={row.payment_status} />
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-center",
                          usageCellClass(cats.meal.remaining),
                        )}
                      >
                        {cats.meal.used}/{cats.meal.allocated}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-center",
                          usageCellClass(cats.snack.remaining),
                        )}
                      >
                        {cats.snack.used}/{cats.snack.allocated}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-center",
                          usageCellClass(cats.drink.remaining),
                        )}
                      >
                        {cats.drink.used}/{cats.drink.allocated}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-center",
                          usageCellClass(cats.extra.remaining),
                        )}
                      >
                        {cats.extra.used}/{cats.extra.allocated}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-center font-semibold",
                          usageCellClass(totalRemaining),
                        )}
                      >
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

      {/* Former Subscribers */}
      {(data?.historical_data?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowHistorical((v) => !v)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            {showHistorical ? "Hide" : "Show"} {data!.historical_data.length} former subscriber
            {data!.historical_data.length > 1 ? "s" : ""} with paid records for this month
          </button>

          {showHistorical && (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Student</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Grade</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data!.historical_data.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{row.full_name}</p>
                        {row.student_number && (
                          <p className="text-xs font-mono text-muted-foreground">{row.student_number}</p>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                          Switched
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {row.grade_level}
                        {row.section && <p className="text-xs">{row.section}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        ₱{row.payment_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
