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
import { studentApi } from "@/lib/api/students";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type { CreditSettlementMethod } from "@/types/student";

const METHODS: Array<{ value: CreditSettlementMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "wallet", label: "From Wallet" },
];

const REFERENCE_REQUIRED: CreditSettlementMethod[] = ["gcash", "bank_transfer"];

function settleSchema(outstanding: number) {
  return z
    .object({
      amount: z
        .number({ error: "Amount is required" })
        .min(0.01, "Amount must be greater than ₱0")
        .max(
          outstanding,
          `Amount exceeds outstanding credit of ₱${outstanding.toFixed(2)}`,
        ),
      payment_method: z.enum(["cash", "gcash", "bank_transfer", "wallet"]),
      reference_number: z.string().optional(),
      note: z
        .string()
        .max(255, "Note must be 255 characters or fewer")
        .optional(),
    })
    .refine(
      (data) =>
        !REFERENCE_REQUIRED.includes(data.payment_method) ||
        !!data.reference_number?.trim(),
      {
        path: ["reference_number"],
        message:
          "A reference number is required for GCash and bank transfer payments.",
      },
    );
}

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: number;
  outstandingCredit: number;
  walletBalance: number;
}

export function SettleCreditDialog({
  open,
  onClose,
  studentId,
  outstandingCredit,
  walletBalance,
}: Props) {
  const queryClient = useQueryClient();

  // `null` means untouched, so the field shows the full outstanding amount without an
  // effect writing state on open — the project forbids setState inside useEffect.
  const [amountInput, setAmountInput] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] =
    useState<CreditSettlementMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const amount = amountInput ?? outstandingCredit.toFixed(2);
  const enteredAmount = Number(amount || 0);
  const walletCannotCover = walletBalance < enteredAmount;

  // Derived rather than corrected in an effect: if the amount rises past the wallet
  // balance while "From Wallet" is selected, fall back to cash instead of leaving the
  // form in an unsubmittable state.
  const method: CreditSettlementMethod =
    selectedMethod === "wallet" && walletCannotCover ? "cash" : selectedMethod;

  const needsReference = REFERENCE_REQUIRED.includes(method);

  const mutation = useMutation({
    mutationFn: () =>
      studentApi.settleCredit(studentId, {
        amount: enteredAmount,
        payment_method: method,
        reference_number: needsReference ? referenceNumber.trim() : undefined,
        note: note.trim() || undefined,
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
    setSelectedMethod("cash");
    setReferenceNumber("");
    setNote("");
    setErrors({});
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = settleSchema(outstandingCredit).safeParse({
      amount: amount === "" ? undefined : Number(amount),
      payment_method: method,
      reference_number: referenceNumber || undefined,
      note: note || undefined,
    });

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as Record<string, string[]>);

      return;
    }

    setErrors({});
    mutation.mutate();
  }

  const creditAfter = Math.max(0, outstandingCredit - enteredAmount);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Credit</DialogTitle>
          <DialogDescription>
            Record a payment against this student&apos;s outstanding credit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Outstanding Credit</p>
            <p className="text-lg font-bold text-destructive">
              ₱{outstandingCredit.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-lg font-bold text-foreground">
              ₱{walletBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="settle-amount">Amount (₱)</Label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setAmountInput(outstandingCredit.toFixed(2))}
              >
                Full amount
              </button>
            </div>
            <Input
              id="settle-amount"
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
            <Label>Payment Method</Label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((option) => {
                const disabled = option.value === "wallet" && walletCannotCover;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={method === option.value}
                    onClick={() => setSelectedMethod(option.value)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      method === option.value
                        ? "border-primary text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-muted/50",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {walletCannotCover && (
              <p className="text-xs text-muted-foreground">
                From Wallet is unavailable — balance is ₱
                {walletBalance.toFixed(2)}.
              </p>
            )}
          </div>

          {needsReference && (
            <div className="space-y-1.5">
              <Label htmlFor="settle-reference">Reference Number</Label>
              <Input
                id="settle-reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction reference…"
              />
              {errors.reference_number && (
                <p className="text-sm text-destructive">
                  {errors.reference_number[0]}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="settle-note">Note (optional)</Label>
            <Input
              id="settle-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid by mother at counter"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Credit after settlement
            </span>
            <span className="font-semibold">₱{creditAfter.toFixed(2)}</span>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Processing…"
                : `Settle ₱${enteredAmount.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
