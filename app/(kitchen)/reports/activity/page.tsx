"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

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

import type { ActivityLogRow } from "@/lib/api/reports";

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_CLASSES: Record<string, string> = {
  auth: "bg-blue-100 text-blue-700 border-blue-300",
  pos: "bg-green-100 text-green-700 border-green-300",
  students: "bg-orange-100 text-orange-700 border-orange-300",
  wallet: "bg-purple-100 text-purple-700 border-purple-300",
  payments: "bg-yellow-100 text-amber-700 border-yellow-300",
  menu: "bg-pink-100 text-pink-700 border-pink-300",
  inventory: "bg-muted text-muted-foreground border-border",
  users: "bg-red-100 text-red-700 border-red-300",
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_CLASSES[category?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize", cls)}>
      {category}
    </span>
  );
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const CATEGORIES = ["auth", "pos", "students", "wallet", "payments", "menu", "inventory", "users"];

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
// Expandable row
// ---------------------------------------------------------------------------

function ActivityRow({ row }: { row: ActivityLogRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-muted/20"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.created_at)}
        </td>
        <td className="px-4 py-2.5 text-foreground">{row.causer_name ?? "System"}</td>
        <td className="px-4 py-2.5 text-muted-foreground max-w-[240px] truncate">{row.description}</td>
        <td className="px-4 py-2.5">
          <CategoryBadge category={row.log_name} />
        </td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">
          {row.subject_type
            ? `${row.subject_type.split("\\").pop()} #${row.subject_id}`
            : "—"}
        </td>
        <td className="px-4 py-2.5 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-muted/10 px-4 py-3">
            <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3">
              {JSON.stringify(row.properties, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ActivityLogPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { from, to } =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : getDateRange(preset);

  const params = {
    date_from: from || undefined,
    date_to: to || undefined,
    log_name: category !== "all" ? category : undefined,
    search: search || undefined,
    page,
    per_page: 25,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-activity", params],
    queryFn: () => reportApi.activity(params),
    enabled: isAdmin || isManager,
  });

  if (!isAdmin && !isManager) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-semibold text-foreground">Access Restricted</p>
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
  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">Reports</p>
        <h1 className="text-xl font-bold text-foreground">Activity Log</h1>
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
                : "border-border bg-card text-foreground hover:bg-muted"
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
              onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
              aria-label="From date"
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
              aria-label="To date"
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
            />
          </div>
        )}

        <Select value={category} onValueChange={(v) => { setCategory(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Category filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search activity…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-8 max-w-[200px] text-xs"
          aria-label="Search activity log"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load activity log. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Date & Time</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">User</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Action</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Category</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Subject</th>
                <th className="px-4 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : !rows?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No activity records found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => <ActivityRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {meta.current_page} of {meta.last_page} ({meta.total} records)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 font-medium text-foreground">{page} / {meta.last_page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
