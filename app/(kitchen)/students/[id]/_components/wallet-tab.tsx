"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentLedger } from "@/hooks/use-student-ledger";
import { cn } from "@/lib/utils";

import { SettleCreditDialog } from "./settle-credit-dialog";

import type { LedgerEntry, LedgerEntryFilter } from "@/types/student";

const FILTERS: Array<{ value: LedgerEntryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "topup", label: "Top-up" },
  { value: "purchase", label: "Purchases" },
  { value: "credit", label: "Credit" },
];

interface Props {
  studentId: number;
  walletBalance: number;
  creditBalance: number;
  onTopUp: () => void;
}

export function WalletTab({
  studentId,
  walletBalance,
  creditBalance,
  onTopUp,
}: Props) {
  const [filter, setFilter] = useState<LedgerEntryFilter>("all");
  const [page, setPage] = useState(1);
  const [showSettle, setShowSettle] = useState(false);

  const { data, isLoading, error } = useStudentLedger(studentId, filter, page);

  const owesCredit = creditBalance > 0;

  function changeFilter(next: LedgerEntryFilter) {
    setFilter(next);
    setPage(1);
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold text-foreground">
            ₱{walletBalance.toFixed(2)}
          </p>
        </div>

        <div
          className={cn(
            "rounded-xl border p-5",
            owesCredit
              ? "border-destructive/40 bg-destructive/5"
              : "border-border bg-card",
          )}
        >
          <p
            className={cn(
              "text-xs",
              owesCredit ? "text-destructive" : "text-muted-foreground",
            )}
          >
            Outstanding Credit
          </p>
          <p
            className={cn(
              "text-2xl font-bold",
              owesCredit ? "text-destructive" : "text-muted-foreground",
            )}
          >
            ₱{creditBalance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onTopUp}>
          + Top Up
        </Button>
        {owesCredit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSettle(true)}
          >
            Settle Credit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => changeFilter(option.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-label="Loading transactions"
            className="space-y-2"
          >
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Failed to load transactions.
          </p>
        ) : !data?.data.length ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Note
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Staff
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((entry) => (
                    <LedgerRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>

            {data.meta.last_page > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {data.meta.current_page} of {data.meta.last_page}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={data.meta.current_page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={data.meta.current_page >= data.meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <SettleCreditDialog
        open={showSettle}
        onClose={() => setShowSettle(false)}
        studentId={studentId}
        outstandingCredit={creditBalance}
        walletBalance={walletBalance}
      />
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isDebit = entry.direction === "debit";

  return (
    <tr className="border-b border-border hover:bg-muted/20">
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {new Date(entry.date).toLocaleDateString()}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            entry.entry_type.startsWith("credit_")
              ? "bg-amber-100 text-amber-800"
              : "bg-muted text-muted-foreground",
          )}
        >
          {entry.entry_label}
        </span>
      </td>
      <td
        className={cn(
          "px-3 py-2 font-medium",
          isDebit ? "text-destructive" : "text-green-700",
        )}
      >
        {isDebit ? "−" : "+"}₱{entry.amount.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {entry.note ?? "—"}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {entry.performed_by ?? "—"}
      </td>
    </tr>
  );
}
