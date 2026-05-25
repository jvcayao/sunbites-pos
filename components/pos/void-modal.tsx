"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Order } from "@/types/order";

interface Props {
  order: Order | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function VoidModal({ order, onConfirm, onCancel, isPending }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!reason.trim()) {
      setError("A void reason is required.");
      return;
    }
    setError(null);
    onConfirm(reason.trim());
  }

  function handleClose() {
    setReason("");
    setError(null);
    onCancel();
  }

  return (
    <Dialog open={order !== null} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 rounded-lg border border-border bg-muted/50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receipt No.</span>
            <span className="font-mono font-medium">{order?.receipt_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">₱{parseFloat(order?.total ?? "0").toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span>{order?.student?.full_name ?? "Walk-in"}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="void-reason">Reason for Void</Label>
          <Textarea
            id="void-reason"
            placeholder="Describe why this transaction is being voided…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "void-reason-error" : undefined}
            rows={3}
          />
          {error && (
            <p id="void-reason-error" role="alert" className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Voiding…" : "Confirm Void"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
