"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi, exportReport } from "@/lib/api/reports";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeso(n: number | null | undefined): string {
  return `₱${(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function getDefaultSchoolMonth(): string {
  const month = new Date().getMonth(); // 0-based
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
  return map[month] ?? "all";
}

function getDefaultSchoolYear(): number {
  const now = new Date();
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", colorClass)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "paid" | "unpaid" | "voided" }) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-300",
    unpaid: "bg-red-100 text-destructive border-red-300",
    voided: "bg-muted text-muted-foreground border-border",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
        map[status] ?? map.voided,
        status === "voided" && "line-through",
      )}
    >
      {label}
    </span>
  );
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

export default function BillingReportPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [year, setYear] = useState(String(getDefaultSchoolYear()));
  const [schoolMonth, setSchoolMonth] = useState(getDefaultSchoolMonth());
  const [status, setStatus] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [recordedFrom, setRecordedFrom] = useState("");
  const [recordedTo, setRecordedTo] = useState("");
  const [page, setPage] = useState(1);

  const params = {
    year: year ? Number(year) : undefined,
    school_month: schoolMonth !== "all" ? schoolMonth.toLowerCase() : undefined,
    status: status !== "all" ? status : undefined,
    grade_level: gradeLevel !== "all" ? gradeLevel : undefined,
    search: search.trim() || undefined,
    recorded_from: recordedFrom || undefined,
    recorded_to: recordedTo || undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-billing", params],
    queryFn: () => reportApi.billing(params),
  });

  const rows = data?.data;
  const summary = data?.summary;
  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Reports</p>
          <h1 className="text-xl font-bold text-foreground">Billing Report</h1>
        </div>
        {(isAdmin || isManager) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportReport("reports/billing", {
                year: year || undefined,
                school_month:
                  schoolMonth !== "all" ? schoolMonth.toLowerCase() : undefined,
                status: status !== "all" ? status : undefined,
                grade_level: gradeLevel !== "all" ? gradeLevel : undefined,
                search: search.trim() || undefined,
                recorded_from: recordedFrom || undefined,
                recorded_to: recordedTo || undefined,
              });
            }}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export to Excel
          </Button>
        )}
      </div>

      {/* Month pill filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSchoolMonth("all");
            setPage(1);
          }}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            schoolMonth === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          All Months
        </button>
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
            className="h-8 w-[130px] text-xs"
            aria-label="Payment status filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
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

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Recorded:
          </span>
          <input
            type="date"
            value={recordedFrom}
            onChange={(e) => {
              setRecordedFrom(e.target.value);
              setPage(1);
            }}
            aria-label="Recorded from date"
            className="h-8 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={recordedTo}
            onChange={(e) => {
              setRecordedTo(e.target.value);
              setPage(1);
            }}
            aria-label="Recorded to date"
            className="h-8 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
          />
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Total Subscribers"
            value={String(summary.total_subscribers)}
          />
          <SummaryCard
            label="Total Collected"
            value={formatPeso(summary.total_collected)}
            colorClass="border-green-200 bg-green-50"
          />
          <SummaryCard
            label="Total Outstanding"
            value={formatPeso(summary.total_outstanding)}
            colorClass="border-red-200 bg-red-50"
          />
          <SummaryCard
            label="Collection Rate"
            value={`${summary.collection_rate.toFixed(1)}%`}
            colorClass="border-blue-200 bg-blue-50"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load billing data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Student Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Student #
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Grade
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Section
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Month / Year
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Amount Due
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Paid On
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Recorded By
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
                    colSpan={9}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No billing records found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.student.full_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.student.student_number}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.student.grade_level}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.student.section ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground capitalize">
                      {row.school_month} {row.year}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {formatPeso(row.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(row.recorded_at)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.recorder
                        ? `${row.recorder.first_name} ${row.recorder.last_name}`
                        : "—"}
                    </td>
                  </tr>
                ))
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
