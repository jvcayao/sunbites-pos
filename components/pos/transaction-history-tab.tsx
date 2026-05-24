"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { orderApi } from "@/lib/api/orders";
import { useAuthStore } from "@/lib/store/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { VoidModal } from "@/components/pos/void-modal";

import type { ApiError } from "@/types/auth";
import type { Order, OrderPaymentMethod, TransactionListParams } from "@/types/order";

const PAYMENT_BADGE_STYLES: Record<OrderPaymentMethod, string> = {
  cash: "bg-green-100 text-green-700",
  gcash: "bg-blue-100 text-blue-700",
  wallet: "bg-purple-100 text-purple-700",
  subscription: "bg-amber-100 text-amber-700",
};

function PaymentBadge({ method, label }: { method: OrderPaymentMethod; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        PAYMENT_BADGE_STYLES[method]
      )}
    >
      {label}
    </span>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  className?: string;
}

export function TransactionHistoryTab({ className }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [filterMethod, setFilterMethod] = useState<OrderPaymentMethod | "">("");
  const [filterStudent, setFilterStudent] = useState("");
  const [voidingOrder, setVoidingOrder] = useState<Order | null>(null);

  const canVoid =
    user?.roles.includes("admin") ||
    user?.roles.includes("manager") ||
    user?.roles.includes("supervisor");

  const params: TransactionListParams = {
    date: filterDate || undefined,
    payment_method: filterMethod || undefined,
    student_search: filterStudent || undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pos-transactions", params],
    queryFn: () => orderApi.transactions(params),
  });

  const voidMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) =>
      orderApi.void(orderId, { void_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-transactions"] });
      setVoidingOrder(null);
      toast.success("Transaction voided.");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to void transaction.");
    },
  });

  const orders = data?.data ?? [];
  const summary = data?.summary;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold text-foreground">{summary.total_transactions}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold text-foreground">₱{parseFloat(summary.total_revenue).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Walk-ins</p>
            <p className="text-2xl font-bold text-foreground">{summary.walk_in_count}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value as OrderPaymentMethod | "")}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="wallet">Wallet</option>
        </select>
        <input
          type="text"
          placeholder="Search student…"
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Time</TableHead>
              <TableHead className="text-xs">Receipt #</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Items</TableHead>
              <TableHead className="text-xs">Payment</TableHead>
              <TableHead className="text-right text-xs">Total</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-destructive">
                  Failed to load transactions.
                </TableCell>
              </TableRow>
            ) : !orders.length ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const isVoided = order.status === "voided";
                return (
                  <TableRow
                    key={order.id}
                    className={cn(isVoided && "opacity-50")}
                  >
                    <TableCell className={cn("text-sm", isVoided && "line-through")}>
                      {formatTime(order.created_at)}
                    </TableCell>
                    <TableCell
                      className={cn("font-mono text-xs", isVoided && "line-through")}
                    >
                      {order.receipt_number}
                      {isVoided && (
                        <span className="ml-1.5 rounded bg-destructive/10 px-1 py-0.5 text-xs font-medium text-destructive">
                          VOIDED
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-sm", isVoided && "line-through")}>
                      {order.student?.full_name ?? (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {order.items?.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                        {(order.items?.length ?? 0) > 3 && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            +{(order.items?.length ?? 0) - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PaymentBadge
                        method={order.payment_method}
                        label={order.payment_method_label}
                      />
                    </TableCell>
                    <TableCell
                      className={cn("text-right text-sm font-medium", isVoided && "line-through")}
                    >
                      ₱{parseFloat(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {canVoid && !isVoided && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setVoidingOrder(order)}
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <VoidModal
        order={voidingOrder}
        onConfirm={(reason) => {
          if (!voidingOrder) return;
          voidMutation.mutate({ orderId: voidingOrder.id, reason });
        }}
        onCancel={() => setVoidingOrder(null)}
        isPending={voidMutation.isPending}
      />
    </div>
  );
}
