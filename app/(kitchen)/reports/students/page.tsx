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

function formatPeso(n: number | null | undefined): string {
  return `₱${(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_CLASSES: Record<string, string> = {
  enrolled: "bg-green-100 text-green-700 border-green-300",
  paused: "bg-yellow-100 text-amber-700 border-yellow-300",
  unenrolled: "bg-muted text-muted-foreground border-border",
  banned: "bg-red-100 text-red-700 border-red-300",
  graduated: "bg-blue-100 text-blue-700 border-blue-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_CLASSES[status?.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
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

export default function StudentsReportPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [enrollmentStatus, setEnrollmentStatus] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [studentType, setStudentType] = useState("all");
  const [page, setPage] = useState(1);

  const params = {
    status: enrollmentStatus !== "all" ? enrollmentStatus : undefined,
    grade: gradeLevel !== "all" ? gradeLevel : undefined,
    type: studentType !== "all" ? studentType : undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-students", params],
    queryFn: () => reportApi.students(params),
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
          <h1 className="text-xl font-bold text-foreground">Student Report</h1>
        </div>
        {(isAdmin || isManager) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportReport("reports/students", {
                status:
                  enrollmentStatus !== "all" ? enrollmentStatus : undefined,
                grade: gradeLevel !== "all" ? gradeLevel : undefined,
                type: studentType !== "all" ? studentType : undefined,
              });
            }}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export to Excel
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={enrollmentStatus}
          onValueChange={(v) => {
            setEnrollmentStatus(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[160px] text-xs"
            aria-label="Enrollment status filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="unenrolled">Unenrolled</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
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

        <Select
          value={studentType}
          onValueChange={(v) => {
            setStudentType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[160px] text-xs"
            aria-label="Student type filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="non_subscription">Non-Subscription</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Enrolled
            </p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {summary.total}
            </p>
          </div>

          {summary.grade_breakdown &&
            Object.keys(summary.grade_breakdown).length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  By Grade
                </p>
                <div className="space-y-1">
                  {Object.entries(summary.grade_breakdown).map(
                    ([grade, count]) => (
                      <div
                        key={grade}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-foreground">{grade}</span>
                        <span className="font-semibold text-foreground">
                          {count}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {summary.status_breakdown &&
            Object.keys(summary.status_breakdown).length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  By Status
                </p>
                <div className="space-y-1">
                  {Object.entries(summary.status_breakdown).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="capitalize text-foreground">
                          {status}
                        </span>
                        <span className="font-semibold text-foreground">
                          {count}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load student data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Name
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
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Wallet Balance
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Total Spent
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
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No students found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.full_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.student_number}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.grade_level}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.section ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatPeso(row.wallet_balance)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {formatPeso(row.total_spent)}
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
