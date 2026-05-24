"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { Order } from "@/types/order";

interface Props {
  order: Order | null;
  onNewOrder: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReceiptModal({ order, onNewOrder }: Props) {
  if (!order) return null;

  const subtotal = parseFloat(order.subtotal);
  const discount = parseFloat(order.discount_amount);
  const total = parseFloat(order.total);
  const amountTendered = order.amount_tendered ? parseFloat(order.amount_tendered) : null;
  const changeAmount = order.change_amount ? parseFloat(order.change_amount) : null;
  const creditAmount = parseFloat(order.credit_amount);
  const hasDiscount = discount > 0;

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onNewOrder(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center text-base font-bold">
            Sunbites POS — Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Header info */}
        <div className="space-y-1 border-b border-dashed border-border pb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receipt No.</span>
            <span className="font-mono font-medium">{order.receipt_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date & Time</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          {order.cashier && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cashier</span>
              <span>{order.cashier.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span>{order.student?.full_name ?? "Walk-in"}</span>
          </div>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-1.5 border-b border-dashed border-border pb-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Items</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex-1">
                  <span>{item.name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">x{item.quantity}</span>
                </div>
                <span className="font-medium">₱{parseFloat(item.line_total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-1 border-b border-dashed border-border pb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          {hasDiscount && (
            <div className="flex justify-between text-green-700">
              <span>
                Discount
                {order.discount_reason ? ` (${order.discount_reason})` : ""}
              </span>
              <span>−₱{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment details */}
        <div className="space-y-1 border-b border-dashed border-border pb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="capitalize">{order.payment_method_label}</span>
          </div>
          {order.payment_method === "cash" && amountTendered !== null && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tendered</span>
                <span>₱{amountTendered.toFixed(2)}</span>
              </div>
              {changeAmount !== null && (
                <div className="flex justify-between font-medium text-green-700">
                  <span>Change</span>
                  <span>₱{changeAmount.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          {order.payment_method === "gcash" && order.reference_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference No.</span>
              <span className="font-mono">{order.reference_number}</span>
            </div>
          )}
          {order.payment_method === "wallet" && order.student && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Remaining</span>
              <span>₱{Number(order.student.wallet_balance).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Credit / points */}
        {(order.is_credit || order.points_earned > 0) && (
          <div className="space-y-1 border-b border-dashed border-border pb-3 text-sm">
            {order.is_credit && (
              <>
                <div className="flex justify-between text-orange-700">
                  <span>Credit Used</span>
                  <span>₱{creditAmount.toFixed(2)}</span>
                </div>
                {order.student && (
                  <div className="flex justify-between text-destructive">
                    <span>Outstanding Credit</span>
                    <span>₱{parseFloat(order.student.credit_balance).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            {order.points_earned > 0 && (
              <div className="flex justify-between font-medium text-amber-700">
                <span>Points Earned</span>
                <span>⭐ +{order.points_earned}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            Print Receipt
          </Button>
          <Button className="flex-1" onClick={onNewOrder}>
            New Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
