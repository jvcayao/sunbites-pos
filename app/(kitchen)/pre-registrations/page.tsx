"use client";

import { startTransition, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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
import { preRegistrationApi } from "@/lib/api/pre-registrations";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PreRegistrationSummary } from "@/types/pre-registration";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Status = "pending" | "approved" | "rejected" | "expired";
type DatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

const STATUS_PILLS: { value: Status; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

const STATUS_BADGE: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  expired: "bg-muted text-muted-foreground border-border",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (preset === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(from), to: fmt(to) };
  }
  return { from: fmt(now), to: fmt(now) };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
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

export default function PreRegistrationsPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("pending");
  const [preset, setPreset] = useState<DatePreset | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [enrollmentType, setEnrollmentType] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const { from, to } =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : preset !== null
        ? getDateRange(preset)
        : { from: "", to: "" };

  const params = {
    status,
    enrollment_type:
      enrollmentType !== "all"
        ? (enrollmentType as "subscription" | "non_subscription")
        : undefined,
    search: search || undefined,
    date_from: from || undefined,
    date_to: to || undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pre-registrations", params],
    queryFn: () => preRegistrationApi.list(params),
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-xl font-bold text-foreground">Pre-Registrations</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date preset pills */}
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              setPreset(preset === p.value ? null : p.value);
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

        {/* Custom date inputs */}
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

        {/* Enrollment type */}
        <Select
          value={enrollmentType}
          onValueChange={(v) => {
            setEnrollmentType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[160px] text-xs"
            aria-label="Enrollment type filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="non_subscription">Non-Subscription</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          placeholder="Search student name…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-8 w-[200px] text-xs"
          aria-label="Search pre-registrations"
        />
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => {
              setStatus(s.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === s.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load pre-registrations. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Contact
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Submitted
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No {status} pre-registrations found.
                  </td>
                </tr>
              ) : (
                data.data.map((item: PreRegistrationSummary) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/pre-registrations/${item.id}`)}
                    className="cursor-pointer transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {item.student_name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {item.contact_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground capitalize">
                      {item.enrollment_type === "subscription"
                        ? "Subscription"
                        : "Non-Subscription"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize",
                          STATUS_BADGE[item.status],
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(item.submitted_at)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(item.expires_at)}
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
