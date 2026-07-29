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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { studentApi } from "@/lib/api/students";

import type { ApiError } from "@/types/auth";

function waiveSchema(outstanding: number) {
  return z.object({
    amount: z
      .number({ error: "Amount is required" })
      .min(0.01, "Amount must be greater than ₱0")
      .max(
        outstanding,
        `Amount exceeds outstanding credit of ₱${outstanding.toFixed(2)}`,
      ),
    reason: z
      .string()
      .min(5, "The reason must explain the write-off in at least 5 characters")
      .max(1000, "Reason must be 1000 characters or fewer"),
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: number;
  outstandingCredit: number;
}

export function WaiveCreditDialog({
  open,
  onClose,
  studentId,
  outstandingCredit,
}: Props) {
  const queryClient = useQueryClient();

  const [amountInput, setAmountInput] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const amount = amountInput ?? outstandingCredit.toFixed(2);

  const mutation = useMutation({
    mutationFn: () =>
      studentApi.waiveCredit(studentId, {
        amount: Number(amount || 0),
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
    setAmountInput(null);
    setReason("");
    setErrors({});
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = waiveSchema(outstandingCredit).safeParse({
      amount: amount === "" ? undefined : Number(amount),
      reason,
    });

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
          <DialogTitle>Waive Credit</DialogTitle>
          <DialogDescription>
            Write off credit that will not be collected.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            This writes off money owed.
          </p>
          <p className="mt-0.5 text-muted-foreground">
            It will not be collected and will not appear as cash received.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Outstanding Credit</p>
          <p className="text-lg font-bold text-destructive">
            ₱{outstandingCredit.toFixed(2)}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waive-amount">Amount to waive (₱)</Label>
            <Input
              id="waive-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="waive-reason">Reason</Label>
            <Textarea
              id="waive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student graduated; written off per admin approval."
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
              {mutation.isPending ? "Processing…" : "Waive Credit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
