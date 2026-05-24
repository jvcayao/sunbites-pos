"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { orderApi } from "@/lib/api/orders";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { ApiError } from "@/types/auth";
import type { PosStudent } from "@/types/order";

const CREDIT_LIMIT = 300;

interface Props {
  open: boolean;
  student: PosStudent;
  orderTotal: number;
  onReload: () => void;
  onCredit: () => void;
  onCancel: () => void;
}

export function InsufficientFundsModal({
  open,
  student,
  orderTotal,
  onReload,
  onCredit,
  onCancel,
}: Props) {
  const [reloadMethod, setReloadMethod] = useState<"cash" | "gcash">("cash");
  const [referenceNumber, setReferenceNumber] = useState("");

  const shortfall = Math.max(0, orderTotal - Number(student.wallet_balance));
  const currentCredit = parseFloat(student.credit_balance);
  const creditAfter = currentCredit + shortfall;
  const canUseCredit = creditAfter <= CREDIT_LIMIT;

  const reloadMutation = useMutation({
    mutationFn: () =>
      orderApi.inlineReload({
        student_id: student.id,
        amount: shortfall,
        payment_method: reloadMethod,
        reference_number: reloadMethod === "gcash" ? referenceNumber : undefined,
      }),
    onSuccess: () => {
      toast.success(`Wallet reloaded by ₱${shortfall.toFixed(2)}.`);
      onReload();
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Reload failed.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insufficient Wallet Balance</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Wallet Balance</span>
            <span className="font-medium">₱{Number(student.wallet_balance).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Total</span>
            <span className="font-medium">₱{orderTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-destructive/20 pt-1 text-sm font-bold text-destructive">
            <span>Shortfall</span>
            <span>₱{shortfall.toFixed(2)}</span>
          </div>
        </div>

        {/* Reload option */}
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4">
          <p className="mb-3 font-semibold text-green-800">Reload Wallet</p>

          <div className="mb-3 rounded-lg border border-green-200 bg-white p-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reload Amount</span>
              <span className="font-bold text-green-700">₱{shortfall.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-green-700">Payment Method</p>
            <div className="flex gap-3">
              {(["cash", "gcash"] as const).map((method) => (
                <label key={method} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="reload-method"
                    value={method}
                    checked={reloadMethod === method}
                    onChange={() => setReloadMethod(method)}
                    className="accent-green-600"
                  />
                  <span className="text-sm font-medium capitalize text-green-800">
                    {method === "gcash" ? "GCash" : "Cash"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {reloadMethod === "gcash" && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="GCash Reference No. (optional)"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
          )}

          <Button
            className="w-full bg-green-600 text-white hover:bg-green-700"
            disabled={reloadMutation.isPending}
            onClick={() => reloadMutation.mutate()}
          >
            {reloadMutation.isPending
              ? "Processing…"
              : `Reload ₱${shortfall.toFixed(2)} & Continue`}
          </Button>
        </div>

        {/* Credit option */}
        <div
          className={cn(
            "rounded-xl border-2 p-4",
            canUseCredit
              ? "border-orange-300 bg-orange-50"
              : "border-border bg-muted/40 opacity-60"
          )}
        >
          <p
            className={cn(
              "mb-2 font-semibold",
              canUseCredit ? "text-orange-800" : "text-muted-foreground"
            )}
          >
            Use Credit
          </p>

          {canUseCredit ? (
            <>
              <div className="mb-3 space-y-1 text-sm text-orange-700">
                <div className="flex justify-between">
                  <span>Current Credit Owed</span>
                  <span>₱{currentCredit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Credit After This Order</span>
                  <span>₱{creditAfter.toFixed(2)} / ₱{CREDIT_LIMIT.toFixed(2)}</span>
                </div>
              </div>
              <Button
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={onCredit}
              >
                Use Credit & Continue
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Credit limit of ₱{CREDIT_LIMIT} would be exceeded. Please reload the wallet instead.
            </p>
          )}
        </div>

        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
