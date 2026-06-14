"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletHistory } from "@/hooks/use-wallet-history";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Section skeleton
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchases section
// ---------------------------------------------------------------------------

function PurchasesSection({ studentId }: { studentId: number }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useWalletHistory(studentId, "purchases", deferredSearch);

  const rows = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;
  const remaining = total - rows.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
          🛒 Purchases
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 w-36 pl-8 text-xs"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <SectionSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No purchases found.
        </p>
      ) : (
        <>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">
                  Date
                </th>
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">
                  Items
                </th>
                <th className="pb-1.5 text-right font-semibold uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/10">
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {formatDate(row.date)}
                  </td>
                  <td className="py-1.5 pr-3">{row.description || "—"}</td>
                  <td className="py-1.5 text-right font-medium text-red-600">
                    {formatPeso(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? "Loading..."
                  : `Load more (${remaining} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-ups section
// ---------------------------------------------------------------------------

function TopUpsSection({ studentId }: { studentId: number }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useWalletHistory(studentId, "topups", deferredSearch);

  const rows = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;
  const remaining = total - rows.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
          💳 Top-Ups
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 w-36 pl-8 text-xs"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <SectionSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No top-ups found.
        </p>
      ) : (
        <>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">
                  Date
                </th>
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">
                  Added By
                </th>
                <th className="pb-1.5 text-right font-semibold uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/10">
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {formatDate(row.date)}
                  </td>
                  <td className="py-1.5 pr-3">{row.added_by ?? "—"}</td>
                  <td className="py-1.5 text-right font-medium text-green-700">
                    +{formatPeso(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? "Loading..."
                  : `Load more (${remaining} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface Props {
  studentId: number;
  className?: string;
}

export function WalletHistoryPanel({ studentId, className }: Props) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", className)}>
      <PurchasesSection studentId={studentId} />
      <TopUpsSection studentId={studentId} />
    </div>
  );
}
