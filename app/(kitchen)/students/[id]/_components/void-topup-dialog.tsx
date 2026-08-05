"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { studentApi } from "@/lib/api/students";

import type { ApiError } from "@/types/auth";

const voidSchema = z.object({
  reason: z
    .string()
    .min(1, "A reason is required")
    .max(500, "Reason must be 500 characters or fewer"),
});

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: number;
  walletTransactionId: number;
  originalAmount: number;
  currentWalletBalance: number;
}

export function VoidTopUpDialog({
  open,
  onClose,
  studentId,
  walletTransactionId,
  originalAmount,
  currentWalletBalance,
}: Props) {
  const queryClient = useQueryClient();

  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const shortfall = Math.max(0, originalAmount - currentWalletBalance);

  const mutation = useMutation({
    mutationFn: () =>
      studentApi.voidTopUp(studentId, walletTransactionId, {
        reason: reason.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({
        queryKey: ["student-ledger", studentId],
      });
      handleClose();
    },
  });

  function handleClose() {
    setReason("");
    setErrors({});
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = voidSchema.safeParse({ reason });

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as Record<string, string[]>);

      return;
    }

    setErrors({});
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Top-Up</DialogTitle>
          <DialogDescription>
            Reverse a wallet top-up that was entered in error.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Original Amount</p>
            <p className="text-lg font-bold text-foreground">
              ₱{originalAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Current Wallet Balance
            </p>
            <p className="text-lg font-bold text-foreground">
              ₱{currentWalletBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {shortfall > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">
              ₱{shortfall.toFixed(2)} of this top-up has already been spent.
            </p>
            <p className="mt-0.5 text-muted-foreground">
              That amount will be added to the student&apos;s outstanding
              credit instead of refunded from the wallet.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cashier entered ₱1000 instead of ₱100."
              rows={3}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason[0]}</p>
            )}
          </div>

          {mutation.isError && !Object.keys(errors).length && (
            <p className="text-sm text-destructive">
              {(mutation.error as ApiError)?.message ?? "An error occurred."}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Processing…" : "Void Top-Up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
