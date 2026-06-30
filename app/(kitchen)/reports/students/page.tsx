"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterPillGroup } from "@/components/reports/filter-pill-group";
import { exportReport, reportApi } from "@/lib/api/reports";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
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

const STATUS_OPTIONS = [
  { label: "Enrolled", value: "enrolled" },
  { label: "Paused", value: "paused" },
  { label: "Unenrolled", value: "unenrolled" },
  { label: "Banned", value: "banned" },
  { label: "Graduated", value: "graduated" },
];

const GRADE_OPTIONS = GRADE_LEVELS.map((g) => ({ label: g, value: g }));

const TYPE_OPTIONS = [
  { label: "Subscription", value: "subscription" },
  { label: "Non-Subscription", value: "non_subscription" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
        "rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize",
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

export default function StudentsReportPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [studentType, setStudentType] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = {
    search: search || undefined,
    status: enrollmentStatus || undefined,
    grade: gradeLevel || undefined,
    type: studentType || undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-students", params],
    queryFn: () => reportApi.students(params),
  });

  const rows = data?.data;
  const summary = data?.summary;
  const meta = data?.meta;

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(1);
    };
  }

  function toggleRow(id: number) {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4 p-6">
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
                search: search || undefined,
                status: enrollmentStatus || undefined,
                grade: gradeLevel || undefined,
                type: studentType || undefined,
              });
            }}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export to Excel
          </Button>
        )}
      </div>

      {/* Search + Filter toolbar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="h-9 pl-9 text-sm"
            placeholder="Search by name, student number, or section..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search students"
          />
        </div>

        <FilterPillGroup
          label="Status"
          options={STATUS_OPTIONS}
          value={enrollmentStatus}
          onChange={handleFilterChange(setEnrollmentStatus)}
        />
        <FilterPillGroup
          label="Grade"
          options={GRADE_OPTIONS}
          value={gradeLevel}
          onChange={handleFilterChange(setGradeLevel)}
        />
        <FilterPillGroup
          label="Type"
          options={TYPE_OPTIONS}
          value={studentType}
          onChange={handleFilterChange(setStudentType)}
        />
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
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
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
                <th className="w-8 px-4 py-2" />
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
                    No students found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.flatMap((row) => [
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/20"
                    onClick={() => toggleRow(row.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleRow(row.id);
                      }
                    }}
                  >
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
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-150",
                          expandedRowId === row.id && "rotate-90",
                        )}
                        aria-hidden="true"
                      />
                    </td>
                  </tr>,
                  ...(expandedRowId === row.id
                    ? [
                        <tr key={`${row.id}-detail`} className="bg-muted/10">
                          <td colSpan={8} className="px-6 py-4">
                            {row.notes || row.allergies ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border bg-card p-3">
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Allergies
                                  </p>
                                  <p className="text-sm text-foreground">
                                    {row.allergies ?? "None recorded"}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-card p-3">
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Notes
                                  </p>
                                  <p className="text-sm text-foreground">
                                    {row.notes ?? "None recorded"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-sm text-muted-foreground">
                                No notes or allergies recorded for this student.
                              </p>
                            )}
                          </td>
                        </tr>,
                      ]
                    : []),
                ])
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
