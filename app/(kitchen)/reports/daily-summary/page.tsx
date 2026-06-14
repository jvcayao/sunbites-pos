"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi } from "@/lib/api/reports";
import { useAuthStore } from "@/lib/store/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeso(n: number | null | undefined): string {
  return `₱${(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DailySummaryPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;

  const [date, setDate] = useState(todayString());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports-daily-summary", date],
    queryFn: () => reportApi.dailySummary(date),
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

  const summary = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="no-print flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Reports</p>
          <h1 className="text-xl font-bold text-foreground">Daily Summary</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="summary-date"
              className="text-xs text-muted-foreground"
            >
              Date
            </label>
            <input
              id="summary-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Print Summary
          </Button>
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Failed to load daily summary. Please try again.
        </p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : !summary ? null : (
        <div className="space-y-6">
          {/* Date heading */}
          <div className="border-b border-border pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Summary for
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              {new Date(summary.date).toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>

          {/* Overview */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Orders
            </p>
            <p className="mt-1 text-4xl font-extrabold text-foreground">
              {summary.total_orders}
            </p>
          </div>

          {/* Payment breakdown */}
          <div>
            <h3 className="mb-2 font-semibold text-foreground">
              Payment Breakdown
            </h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Method
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                      Count
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.payment_breakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    summary.payment_breakdown.map((row) => (
                      <tr key={row.method} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 capitalize text-foreground">
                          {row.method}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {row.count}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {formatPeso(row.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-muted/20">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-foreground">
                      Total Discounts
                    </td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                      -{formatPeso(summary.total_discounts)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-foreground">
                      Total Revenue
                    </td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right text-lg font-extrabold text-green-700">
                      {formatPeso(summary.total_revenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Per-cashier breakdown */}
          <div>
            <h3 className="mb-2 font-semibold text-foreground">
              Per-Cashier Breakdown
            </h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Cashier Name
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                      Orders
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.cashier_breakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No cashier data.
                      </td>
                    </tr>
                  ) : (
                    summary.cashier_breakdown.map((row) => (
                      <tr key={row.cashier_name} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-foreground">
                          {row.cashier_name}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {row.orders}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {formatPeso(row.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Items sold */}
          <div>
            <h3 className="mb-2 font-semibold text-foreground">Items Sold</h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Item Name
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                      Qty Sold
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.items_sold.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No items sold.
                      </td>
                    </tr>
                  ) : (
                    [...summary.items_sold]
                      .sort((a, b) => b.quantity_sold - a.quantity_sold)
                      .map((item) => (
                        <tr key={item.name} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 text-foreground">
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            {item.quantity_sold}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
