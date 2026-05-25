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

import type { SalesOrder } from "@/lib/api/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DatePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    cash: "bg-green-100 text-green-700 border-green-300",
    gcash: "bg-blue-100 text-blue-700 border-blue-300",
    wallet: "bg-purple-100 text-purple-700 border-purple-300",
    subscription: "bg-orange-100 text-orange-700 border-orange-300",
  };
  const cls = map[method?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize", cls)}>
      {method}
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

export default function SalesReportPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [customerType, setCustomerType] = useState("all");
  const [page, setPage] = useState(1);

  const { from, to } =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : getDateRange(preset);

  const params = {
    date_from: from || undefined,
    date_to: to || undefined,
    payment_method: paymentMethod !== "all" ? paymentMethod : undefined,
    customer_type: customerType !== "all" ? customerType : undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-sales", params],
    queryFn: () => reportApi.sales(params as Record<string, string | number | boolean | undefined>),
  });

  const summary = data?.summary;
  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Reports</p>
          <h1 className="text-xl font-bold text-foreground">Sales Report</h1>
        </div>
        {(isAdmin || isManager) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportReport("reports/sales", {
                date_from: from || undefined,
                date_to: to || undefined,
                payment_method: paymentMethod !== "all" ? paymentMethod : undefined,
                customer_type: customerType !== "all" ? customerType : undefined,
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
          value={paymentMethod}
          onValueChange={(v) => {
            setPaymentMethod(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Payment method filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="gcash">GCash</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={customerType}
          onValueChange={(v) => {
            setCustomerType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Customer type filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="walk_in">Walk-In</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label="Total Revenue" value={formatPeso(summary.total_revenue)} colorClass="border-green-200 bg-green-50" />
          <SummaryCard label="Total Orders" value={String(summary.total_orders)} />
          <SummaryCard label="Avg Order Value" value={formatPeso(summary.avg_order_value)} />
          <SummaryCard label="Total Discounts" value={formatPeso(summary.total_discounts)} colorClass="border-red-200 bg-red-50" />
          <SummaryCard label="Net Revenue" value={formatPeso(summary.net_revenue)} colorClass="border-blue-200 bg-blue-50" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load sales data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Receipt #</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Date / Time</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Cashier</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Items</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Payment</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Discount</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No sales records for this period.
                  </td>
                </tr>
              ) : (
                data.data.map((order: SalesOrder) => (
                  <tr key={order.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs">{order.receipt_number}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-2.5">
                      {order.cashier.first_name} {order.cashier.last_name}
                    </td>
                    <td className="px-4 py-2.5">
                      {order.student ? (
                        order.student.full_name
                      ) : (
                        <span className="italic text-muted-foreground">Walk-In</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[180px] truncate text-muted-foreground">
                      {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-2.5">
                      <PaymentBadge method={order.payment_method} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {order.discount_amount > 0 ? `-${formatPeso(order.discount_amount)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatPeso(order.total)}</td>
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
