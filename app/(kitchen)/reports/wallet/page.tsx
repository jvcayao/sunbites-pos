"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

export default function WalletReportPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const params = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page: String(page),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-wallet", params],
    queryFn: () => reportApi.wallet(params),
    enabled: isAdmin || isManager,
  });

  // Access guard for supervisor
  if (!isAdmin && !isManager) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <AlertTriangle
            className="mx-auto h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-lg font-semibold text-foreground">
            Access Restricted
          </p>
          <p className="text-sm text-muted-foreground">
            {"You don't have permission to view this report."}
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const rows = data?.data;
  const summary = data?.summary;
  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Reports</p>
          <h1 className="text-xl font-bold text-foreground">Wallet Report</h1>
        </div>
        {(isAdmin || isManager) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportReport("reports/wallet", {
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              });
            }}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export to Excel
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor="wallet-from"
            className="text-xs text-muted-foreground"
          >
            From
          </label>
          <input
            id="wallet-from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="wallet-to" className="text-xs text-muted-foreground">
            To
          </label>
          <input
            id="wallet-to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
          />
        </div>
      </div>

      {/* Low balance warning */}
      {summary && summary.students_below_100 > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">
              {summary.students_below_100} student
              {summary.students_below_100 !== 1 ? "s" : ""}
            </span>{" "}
            have a wallet balance below ₱100.00. Consider sending a top-up
            reminder.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Total Credits"
            value={formatPeso(summary.total_credits)}
            colorClass="border-green-200 bg-green-50"
          />
          <SummaryCard
            label="Total Debits"
            value={formatPeso(summary.total_debits)}
            colorClass="border-red-200 bg-red-50"
          />
          <SummaryCard
            label="Net Movement"
            value={formatPeso(summary.net_movement)}
          />
          <SummaryCard
            label="Students Below ₱100"
            value={String(summary.students_below_100)}
            colorClass="border-yellow-200 bg-yellow-50"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load wallet data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Student Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Grade
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Balance
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Credit
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Total Credited
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Total Debited
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Last Transaction
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
                    No wallet data found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.student_name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.grade_level}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold",
                        row.current_balance < 100 && "text-amber-600",
                      )}
                    >
                      {formatPeso(row.current_balance)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-red-600">
                      {row.outstanding_credit > 0
                        ? formatPeso(row.outstanding_credit)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-700">
                      {formatPeso(row.total_credited)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {formatPeso(row.total_debited)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(row.last_transaction)}
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
