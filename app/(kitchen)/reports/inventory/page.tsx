"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi, exportReport } from "@/lib/api/reports";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { InventoryReportRow } from "@/lib/api/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: "out" | "low" | "ok" }) {
  const map = {
    out: "bg-red-100 text-red-700 border-red-300",
    low: "bg-yellow-100 text-amber-700 border-yellow-300",
    ok: "bg-green-100 text-green-700 border-green-300",
  };
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase", map[status])}>
      {status === "ok" ? "OK" : status === "out" ? "OUT" : "LOW"}
    </span>
  );
}

function SummaryCard({ label, value, colorClass }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", colorClass)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

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

export default function InventoryReportPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-inventory"],
    queryFn: reportApi.inventory,
  });

  const rows = data?.data;
  const summary = data?.summary;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Reports</p>
          <h1 className="text-xl font-bold text-foreground">Inventory Report</h1>
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

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load inventory data. Please try again.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Item Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Unit</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Current Stock</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Alert Threshold</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Last Restocked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : !rows?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No inventory data found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.unit}</td>
                    <td className={cn(
                      "px-4 py-2.5 text-right font-semibold",
                      row.status === "out" && "text-red-600",
                      row.status === "low" && "text-amber-600"
                    )}>
                      {row.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{row.restock_threshold}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(row.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
