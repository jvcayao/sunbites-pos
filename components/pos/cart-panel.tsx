"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { orderApi } from "@/lib/api/orders";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { InsufficientFundsModal } from "@/components/pos/insufficient-funds-modal";

import type { ApiError } from "@/types/auth";
import type { Order, OrderPaymentMethod } from "@/types/order";

type DiscountType = "percent" | "fixed";

const PAYMENT_METHOD_CONFIG: Record<
  OrderPaymentMethod,
  { label: string; icon: string }
> = {
  cash: { label: "Cash", icon: "💵" },
  gcash: { label: "GCash", icon: "📱" },
  wallet: { label: "Wallet", icon: "👛" },
  subscription: { label: "Subscription", icon: "📋" },
};

interface CartItemRowProps {
  id: number;
  name: string;
  price: number;
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
}

function CartItemRow({
  name,
  price,
  quantity,
  onDecrement,
  onIncrement,
  onRemove,
}: CartItemRowProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">₱{price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={onDecrement}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={onIncrement}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          +
        </button>
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-medium text-foreground">
        ₱{(price * quantity).toFixed(2)}
      </span>
      <button
        type="button"
        aria-label={`Remove item`}
        onClick={onRemove}
        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
      >
        ✕
      </button>
    </div>
  );
}

const discountAmountSchema = z
  .string()
  .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Invalid amount");

interface Props {
  onOrderComplete: (order: Order) => void;
  className?: string;
}

export function CartPanel({ onOrderComplete, className }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { items, student, isWalkIn, paymentMethod, notes } = useCartStore();
  const { updateQuantity, removeItem, clearCart, setPaymentMethod, setNotes } = useCartStore();

  const [amountTendered, setAmountTendered] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountInput, setDiscountInput] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [useCredit, setUseCredit] = useState(false);

  const canApplyDiscount =
    user?.roles.includes("admin") || user?.roles.includes("manager");

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountValue = parseFloat(discountInput) || 0;
  const discountAmount =
    discountType === "percent"
      ? (subtotal * discountValue) / 100
      : discountValue;
  const total = Math.max(0, subtotal - discountAmount);

  const walletBalance = Number(student?.wallet_balance ?? 0);
  const walletAfter = walletBalance - total;
  const isWalletInsufficient = paymentMethod === "wallet" && walletAfter < 0;

  const tendered = parseFloat(amountTendered) || 0;
  const change = tendered - total;

  const isCheckoutValid = (() => {
    if (items.length === 0) return false;
    if (paymentMethod === "cash" && tendered < total) return false;
    if (paymentMethod === "subscription" && (!student || student.student_type !== "subscription")) return false;
    return true;
  })();

  const checkoutMutation = useMutation({
    mutationFn: orderApi.checkout,
    onSuccess: ({ order }) => {
      queryClient.invalidateQueries({ queryKey: ["pos-transactions"] });
      clearCart();
      setAmountTendered("");
      setReferenceNumber("");
      setDiscountInput("");
      setDiscountReason("");
      setUseCredit(false);
      onOrderComplete(order);
    },
    onError: (err: ApiError) => {
      if (err.message?.toLowerCase().includes("insufficient")) {
        setShowInsufficientFunds(true);
        return;
      }
      toast.error(err.message ?? "Checkout failed.");
    },
  });

  function validateDiscount(): boolean {
    if (!discountInput) return true;
    const result = discountAmountSchema.safeParse(discountInput);
    if (!result.success) {
      setDiscountError("Enter a valid discount amount.");
      return false;
    }
    if (discountType === "percent" && discountValue > 100) {
      setDiscountError("Percent discount cannot exceed 100.");
      return false;
    }
    if (discountAmount > 0 && !discountReason.trim()) {
      setDiscountError("A reason is required when applying a discount.");
      return false;
    }
    return true;
  }

  function handleCheckout(overrideUseCredit = false) {
    if (!validateDiscount()) return;

    checkoutMutation.mutate({
      student_id: student?.id,
      payment_method: paymentMethod,
      items: items.map((item) => ({
        pos_menu_item_id: item.id,
        quantity: item.quantity,
      })),
      notes: notes || undefined,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      discount_reason: discountAmount > 0 ? discountReason : undefined,
      amount_tendered: paymentMethod === "cash" ? tendered : undefined,
      reference_number:
        paymentMethod === "gcash" ? referenceNumber || undefined : undefined,
      use_credit: overrideUseCredit || useCredit || undefined,
    });
  }

  function handleReload() {
    setShowInsufficientFunds(false);
    handleCheckout();
  }

  function handleCredit() {
    setUseCredit(true);
    setShowInsufficientFunds(false);
    handleCheckout(true);
  }

  return (
    <div className={cn("flex flex-col gap-0 rounded-xl border border-border bg-card", className)}>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">Order Summary</h2>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Add items from the menu.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                quantity={item.quantity}
                onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
                onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order notes */}
      <div className="border-t border-border px-4 py-3">
        <Textarea
          placeholder="Order notes (optional)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-none text-xs"
          rows={2}
        />
      </div>

      {/* Discount block — admin/manager only */}
      {canApplyDiscount && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Discount</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDiscountType("percent")}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors",
                discountType === "percent"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              % Percent
            </button>
            <button
              type="button"
              onClick={() => setDiscountType("fixed")}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors",
                discountType === "fixed"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              ₱ Fixed
            </button>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={discountType === "percent" ? "0%" : "₱0.00"}
            value={discountInput}
            onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(null); }}
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          {discountAmount > 0 && (
            <input
              type="text"
              placeholder="Discount reason (required)"
              value={discountReason}
              onChange={(e) => { setDiscountReason(e.target.value); setDiscountError(null); }}
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          )}
          {discountError && (
            <p role="alert" className="text-xs text-destructive">{discountError}</p>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-border px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-700">
            <span>Discount</span>
            <span>−₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>₱{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Payment Method</p>
        <div className="flex gap-2">
          {(Object.entries(PAYMENT_METHOD_CONFIG) as [OrderPaymentMethod, { label: string; icon: string }][]).map(
            ([method, config]) => {
              const isDisabled =
                (method === "wallet" && (isWalkIn || !student)) ||
                (method === "subscription" && (isWalkIn || !student || student.student_type !== "subscription"));
              return (
                <button
                  key={method}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => { setPaymentMethod(method); setUseCredit(false); }}
                  className={cn(
                    "flex-1 rounded-xl border py-2 text-xs font-medium transition-colors",
                    paymentMethod === method
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50",
                    isDisabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span className="block text-base leading-tight">{config.icon}</span>
                  {config.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Payment-specific inputs */}
      <div className="px-4 pt-2 space-y-2">
        {paymentMethod === "cash" && (
          <>
            <div>
              <label htmlFor="cash-tendered" className="mb-1 block text-xs font-medium text-muted-foreground">
                Amount Tendered
              </label>
              <input
                id="cash-tendered"
                type="number"
                min="0"
                step="0.01"
                placeholder="₱0.00"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            {tendered > 0 && (
              <div
                className={cn(
                  "flex justify-between rounded-lg p-2 text-sm font-medium",
                  change >= 0 ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive"
                )}
              >
                <span>Change</span>
                <span>₱{change.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {paymentMethod === "gcash" && (
          <div>
            <label htmlFor="gcash-ref" className="mb-1 block text-xs font-medium text-muted-foreground">
              Reference Number (optional)
            </label>
            <input
              id="gcash-ref"
              type="text"
              placeholder="GCash reference no."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        )}

        {paymentMethod === "wallet" && student && (
          <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Balance</span>
              <span>₱{walletBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">After Purchase</span>
              <span className={cn(walletAfter < 0 ? "text-destructive" : "text-foreground")}>
                ₱{walletAfter.toFixed(2)}
              </span>
            </div>
            {isWalletInsufficient && (
              <p className="text-xs text-destructive">
                Insufficient balance. Reload or use a different payment method.
              </p>
            )}
          </div>
        )}

        {paymentMethod === "subscription" && (
          <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-sm text-muted-foreground">
            Covered by monthly subscription
          </div>
        )}
      </div>

      {/* Checkout button */}
      <div className="px-4 pb-4 pt-3">
        <Button
          data-pos-checkout
          className="w-full"
          size="lg"
          disabled={!isCheckoutValid || checkoutMutation.isPending}
          onClick={() => setShowConfirm(true)}
        >
          {checkoutMutation.isPending ? "Processing…" : "Confirm Purchase →"}
        </Button>
      </div>

      {/* Confirm Purchase Dialog */}
      <Dialog open={showConfirm} onOpenChange={(open) => { if (!open) setShowConfirm(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">
                {isWalkIn || !student ? "Walk-In" : student.full_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span>−₱{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium capitalize">{paymentMethod}</span>
            </div>
            {paymentMethod === "cash" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className="font-medium">₱{Math.max(0, tendered - total).toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => { setShowConfirm(false); handleCheckout(); }}
              disabled={checkoutMutation.isPending}
            >
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient Funds Modal */}
      {showInsufficientFunds && student && (
        <InsufficientFundsModal
          open={showInsufficientFunds}
          student={student}
          orderTotal={total}
          onReload={handleReload}
          onCredit={handleCredit}
          onCancel={() => setShowInsufficientFunds(false)}
        />
      )}
    </div>
  );
}
