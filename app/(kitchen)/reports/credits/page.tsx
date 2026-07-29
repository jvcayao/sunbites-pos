"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi } from "@/lib/api/reports";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DatePreset = "today" | "this_week" | "this_month" | "custom";

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "today") {
    const t = fmt(now);
    return { from: t, to: t };
  }
  if (preset === "this_week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return { from: fmt(monday), to: fmt(now) };
  }
  if (preset === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(from), to: fmt(now) };
  }
  return { from: fmt(now), to: fmt(now) };
}

function formatPeso(n: number | null | undefined): string {
  return `₱${(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypeBadge({
  type,
}: {
  type: "charged" | "settled" | "waived" | "voided";
}) {
  const map = {
    charged: "bg-red-100 text-red-700 border-red-300",
    settled: "bg-green-100 text-green-700 border-green-300",
    // Amber, deliberately distinct from settled: a waive collects no money.
    waived: "bg-amber-100 text-amber-800 border-amber-300",
    voided: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize",
        map[type],
      )}
    >
      {type}
    </span>
  );
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

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

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

export default function CreditsReportPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { from, to } =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : getDateRange(preset);

  const params = {
    date_from: from || undefined,
    date_to: to || undefined,
    type: type !== "all" ? type : undefined,
    search: search || undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-credits", params],
    queryFn: () => reportApi.credits(params),
    enabled: isAdmin || isManager,
  });

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
      <div>
        <p className="text-xs text-muted-foreground">Reports</p>
        <h1 className="text-xl font-bold text-foreground">
          Credit Collection Report
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              setPreset(p.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              preset === p.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setPage(1);
              }}
              aria-label="From date"
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setPage(1);
              }}
              aria-label="To date"
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
            />
          </div>
        )}

        <Select
          value={type}
          onValueChange={(v) => {
            setType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[130px] text-xs"
            aria-label="Credit type filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="charged">Charged</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search student…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-8 max-w-[200px] text-xs"
          aria-label="Search by student name or number"
        />
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard
              label="Total Charged"
              value={formatPeso(summary.total_charged)}
              colorClass="border-red-200 bg-red-50"
            />
            <SummaryCard
              label="Total Settled"
              value={formatPeso(summary.total_settled)}
              colorClass="border-green-200 bg-green-50"
            />
            <SummaryCard
              label="Total Waived"
              value={formatPeso(summary.total_waived)}
              colorClass="border-amber-200 bg-amber-50"
            />
            <SummaryCard
              label="Total Voided"
              value={formatPeso(summary.total_voided)}
            />
            <SummaryCard
              label="Net Outstanding"
              value={formatPeso(summary.net_outstanding)}
              colorClass="border-amber-200 bg-amber-50"
            />
          </div>

          {/*
            How settlements were paid. "From wallet" is separated because it moves an
            existing prepaid balance and brings no cash into the drawer — mixing it into
            the cash figure is what makes a drawer fail to reconcile.
          */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Settled by method
              </span>
              <span>
                Cash{" "}
                <strong>{formatPeso(summary.settled_by_method.cash)}</strong>
              </span>
              <span>
                GCash{" "}
                <strong>{formatPeso(summary.settled_by_method.gcash)}</strong>
              </span>
              <span>
                Bank Transfer{" "}
                <strong>
                  {formatPeso(summary.settled_by_method.bank_transfer)}
                </strong>
              </span>
              <span className="text-muted-foreground">
                From wallet{" "}
                <strong>{formatPeso(summary.settled_by_method.wallet)}</strong>{" "}
                <span className="text-xs">(no cash)</span>
              </span>
              <span className="ml-auto rounded-md bg-green-50 px-2 py-1 text-green-800">
                Cash collected{" "}
                <strong>{formatPeso(summary.settled_bringing_in_cash)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load credit data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Date / Time
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Grade
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Notes
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Staff
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
                    No credit records found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">
                        {row.student.full_name}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {row.student.student_number}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.student.grade_level}
                    </td>
                    <td className="px-4 py-2.5">
                      <TypeBadge type={row.type} />
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold",
                        row.type === "charged" && "text-red-600",
                        row.type === "settled" && "text-green-700",
                      )}
                    >
                      {formatPeso(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 max-w-[160px] truncate text-muted-foreground">
                      {row.notes ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.performed_by ?? "—"}
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
