"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi, exportReport } from "@/lib/api/reports";
import { inventoryApi } from "@/lib/api/inventory";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type {
  InventoryDiscrepancyRow,
  InventoryReportLog,
  InventoryReportRow,
  InventoryReportStatus,
} from "@/lib/api/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

const STATUS_BADGE_MAP: Record<InventoryReportStatus, string> = {
  out: "bg-red-100 text-red-700 border-red-300",
  low: "bg-yellow-100 text-amber-700 border-yellow-300",
  ok: "bg-green-100 text-green-700 border-green-300",
  over: "bg-orange-100 text-orange-700 border-orange-300",
};

const STATUS_LABEL_MAP: Record<InventoryReportStatus, string> = {
  ok: "OK ✓",
  low: "LOW ⚠",
  out: "OUT ✕",
  over: "OVER ▲",
};

function StatusBadge({ status }: { status: InventoryReportStatus }) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase",
        STATUS_BADGE_MAP[status],
      )}
    >
      {STATUS_LABEL_MAP[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Log Type Badge
// ---------------------------------------------------------------------------

const LOG_TYPE_STYLES: Record<string, string> = {
  restock: "bg-green-100 text-green-700 border-green-300",
  sale: "bg-red-100 text-red-700 border-red-300",
  waste: "bg-red-100 text-red-700 border-red-300",
  manual: "bg-muted text-muted-foreground border-border",
};

function LogTypeBadge({ type, label }: { type: string; label?: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize",
        LOG_TYPE_STYLES[type] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {label ?? type}
    </span>
  );
}

function historyRowClass(type: string): string {
  if (type === "restock") return "bg-green-50";
  if (type === "sale" || type === "waste") return "bg-red-50";
  return "bg-muted/30";
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", colorClass)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date preset tabs
// ---------------------------------------------------------------------------

type DatePreset = "today" | "week" | "month" | "custom";

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "today") {
    const t = fmt(today);
    return { from: t, to: t };
  }
  if (preset === "week") {
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return { from: fmt(monday), to: fmt(today) };
  }
  if (preset === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(first), to: fmt(today) };
  }
  return { from: "", to: "" };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const LOG_TYPES = [
  { value: "", label: "All Types" },
  { value: "restock", label: "Restock" },
  { value: "waste", label: "Waste" },
  { value: "manual", label: "Manual" },
  { value: "sale", label: "Sale" },
];

const STATUS_FILTERS = [
  { value: "", label: "All Status" },
  { value: "ok", label: "OK" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
  { value: "over", label: "Over" },
];

export default function InventoryReportPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  // Snapshot filters
  const [statusFilter, setStatusFilter] = useState("");

  // History filters
  const [preset, setPreset] = useState<DatePreset>("today");
  const [histFilters, setHistFilters] = useState<InventoryHistoryState>(() => {
    const dates = getPresetDates("today");
    return { from: dates.from, to: dates.to, type: "", item_id: undefined };
  });
  const [appliedHistFilters, setAppliedHistFilters] =
    useState<InventoryHistoryState>(() => {
      const dates = getPresetDates("today");
      return { from: dates.from, to: dates.to, type: "", item_id: undefined };
    });
  const [histPage, setHistPage] = useState(1);

  // Snapshot query
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-inventory"],
    queryFn: () => reportApi.inventory(),
  });

  // Inventory items for filter dropdown
  const { data: inventoryItems } = useQuery({
    queryKey: ["references-inventory"],
    queryFn: inventoryApi.list,
  });

  // History query
  const {
    data: histData,
    isLoading: histLoading,
    isError: histError,
  } = useQuery({
    queryKey: ["reports-inventory-history", appliedHistFilters, histPage],
    queryFn: () =>
      reportApi.inventory({
        from: appliedHistFilters.from || undefined,
        to: appliedHistFilters.to || undefined,
        log_type: appliedHistFilters.type || undefined,
        item_id: appliedHistFilters.item_id,
        history_page: histPage,
        include_logs: true,
        include_discrepancy: true,
      }),
  });

  const rows = data?.data ?? [];
  const summary = data?.summary;
  const histLogs = histData?.logs?.data ?? [];
  const histMeta = histData?.logs?.meta;
  const discrepancy = histData?.discrepancy ?? [];

  // Snapshot filter
  const filteredRows = statusFilter
    ? rows.filter((r) => r.status === statusFilter)
    : rows;

  function handlePresetChange(p: DatePreset) {
    setPreset(p);
    if (p !== "custom") {
      const dates = getPresetDates(p);
      setHistFilters((prev) => ({ ...prev, from: dates.from, to: dates.to }));
    }
  }

  function applyHistFilters() {
    setHistPage(1);
    setAppliedHistFilters({ ...histFilters });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Reports</p>
          <h1 className="text-xl font-bold text-foreground">
            Inventory Report
          </h1>
        </div>
        {(isAdmin || isManager) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportReport("reports/inventory");
            }}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export to Excel
          </Button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Out of Stock"
            value={summary.out_of_stock}
            colorClass="border-red-200 bg-red-50"
          />
          <SummaryCard
            label="Below Threshold"
            value={summary.below_threshold}
            colorClass="border-yellow-200 bg-yellow-50"
          />
          <SummaryCard
            label="Overstock"
            value={summary.over_stock ?? 0}
            colorClass="border-orange-200 bg-orange-50"
          />
        </div>
      )}

      {/* Stock Snapshot Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Stock Snapshot
          </h2>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "")}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          {isError ? (
            <p className="px-4 py-8 text-center text-sm text-destructive">
              Failed to load inventory data. Please try again.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Item Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Unit
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                    Current Stock
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                    Alert Threshold
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                    Overstock
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                    Cost/Unit
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !filteredRows.length ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No inventory data found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row: InventoryReportRow) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {row.unit}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-semibold",
                          row.status === "out" && "text-red-600",
                          row.status === "low" && "text-amber-600",
                        )}
                      >
                        {row.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {row.restock_threshold}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {row.overstock_threshold ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {row.cost_per_unit != null
                          ? `₱${row.cost_per_unit.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(row.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log History Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Log History</h2>

        {/* Date preset tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "week", "month", "custom"] as DatePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePresetChange(p)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                preset === p
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background hover:border-primary/50",
              )}
            >
              {p === "today"
                ? "Today"
                : p === "week"
                  ? "This Week"
                  : p === "month"
                    ? "This Month"
                    : "Custom Range"}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-end gap-3">
          {preset === "custom" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="hist-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="hist-from"
                  type="date"
                  className="h-8 w-36 text-xs"
                  value={histFilters.from}
                  onChange={(e) =>
                    setHistFilters((p) => ({ ...p, from: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hist-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="hist-to"
                  type="date"
                  className="h-8 w-36 text-xs"
                  value={histFilters.to}
                  onChange={(e) =>
                    setHistFilters((p) => ({ ...p, to: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="hist-type" className="text-xs">
              Type
            </Label>
            <Select
              value={histFilters.type}
              onValueChange={(v) =>
                setHistFilters((p) => ({ ...p, type: v ?? "" }))
              }
            >
              <SelectTrigger id="hist-type" className="h-8 w-36 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="hist-item" className="text-xs">
              Item
            </Label>
            <Select
              value={
                histFilters.item_id !== undefined
                  ? String(histFilters.item_id)
                  : ""
              }
              onValueChange={(v) =>
                setHistFilters((p) => ({
                  ...p,
                  item_id: v ? Number(v) : undefined,
                }))
              }
            >
              <SelectTrigger id="hist-item" className="h-8 w-44 text-xs">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">
                  All Items
                </SelectItem>
                {(inventoryItems ?? [])
                  .filter((i) => !i.is_archived)
                  .map((inv) => (
                    <SelectItem
                      key={inv.id}
                      value={String(inv.id)}
                      className="text-xs"
                    >
                      {inv.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyHistFilters}
          >
            Apply
          </Button>
        </div>

        {/* History table */}
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Date/Time
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Item Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Change
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  After
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Reason
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Adjusted By
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Order #
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {histLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : histError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    Failed to load history.
                  </td>
                </tr>
              ) : !histLogs.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No history records for this period.
                  </td>
                </tr>
              ) : (
                histLogs.map((log: InventoryReportLog) => (
                  <tr
                    key={log.id}
                    className={cn(
                      "hover:brightness-95",
                      historyRowClass(log.type),
                    )}
                  >
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {log.item_name_snapshot}
                    </td>
                    <td className="px-4 py-2.5">
                      <LogTypeBadge type={log.type} label={log.type_label} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      <span
                        className={
                          parseFloat(log.quantity_change) >= 0
                            ? "text-green-600"
                            : "text-destructive"
                        }
                      >
                        {parseFloat(log.quantity_change) >= 0 ? "+" : ""}
                        {log.quantity_change}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {log.stock_after}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.reason}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.adjusted_by ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.order_id ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* History pagination */}
        {histMeta && histMeta.last_page > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(histPage - 1) * histMeta.per_page + 1}–
              {Math.min(histPage * histMeta.per_page, histMeta.total)} of{" "}
              {histMeta.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={histPage <= 1}
                onClick={() => setHistPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={histPage >= histMeta.last_page}
                onClick={() => setHistPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Discrepancy Summary Section */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Discrepancy Summary
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manual adjustments may indicate inventory counting errors or
              unrecorded losses. Items with frequent adjustments should be
              reviewed.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Item
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  # Adjustments
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Net Change
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Last Adjusted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {histLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !discrepancy.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No manual adjustments recorded for this period.
                  </td>
                </tr>
              ) : (
                discrepancy.map((row: InventoryDiscrepancyRow) => {
                  const net = parseFloat(row.net_change);
                  const isHighCount = row.adjustment_count >= 3;
                  const rowClass =
                    net < 0 ? "bg-red-50" : net > 0 ? "bg-green-50" : "";
                  return (
                    <tr
                      key={row.inventory_item_id}
                      className={cn("hover:brightness-95", rowClass)}
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {row.item_name}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right",
                          isHighCount && "font-semibold text-amber-700",
                        )}
                      >
                        {row.adjustment_count}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono font-semibold",
                          net < 0
                            ? "text-destructive"
                            : net > 0
                              ? "text-green-700"
                              : "text-muted-foreground",
                        )}
                      >
                        {net >= 0 ? "+" : ""}
                        {row.net_change}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(row.last_adjusted_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal type
// ---------------------------------------------------------------------------

interface InventoryHistoryState {
  from: string;
  to: string;
  type: string;
  item_id?: number;
}
