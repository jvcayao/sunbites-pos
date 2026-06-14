"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";

import type { OrderPaymentMethod } from "@/types/order";

const PAYMENT_METHODS: Record<string, OrderPaymentMethod> = {
  "1": "cash",
  "2": "gcash",
  "3": "wallet",
};

interface Options {
  onCheckout: () => void;
  onClearStudent: () => void;
  onWalkIn: () => void;
  onStudentMode: () => void;
}

export function usePosKeyboardShortcuts({
  onCheckout,
  onClearStudent,
  onWalkIn,
  onStudentMode,
}: Options): void {
  const user = useAuthStore((s) => s.user);
  const { items, isWalkIn, setPaymentMethod, removeItem } = useCartStore();

  const canDeleteLastItem =
    user?.roles.includes("admin") ||
    user?.roles.includes("manager") ||
    user?.roles.includes("supervisor");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isEditable =
        tag === "input" || tag === "textarea" || tag === "select";

      switch (e.key) {
        case "F1": {
          e.preventDefault();
          const qrInput = document.getElementById("pos-qr-input");
          qrInput?.focus();
          break;
        }

        case "F2": {
          e.preventDefault();
          const itemSearch = document.getElementById("pos-item-search");
          itemSearch?.focus();
          break;
        }

        case "Enter": {
          if (e.ctrlKey) {
            e.preventDefault();
            onCheckout();
          }
          break;
        }

        case "Escape": {
          if (!isEditable) {
            e.preventDefault();
            onClearStudent();
          }
          break;
        }

        case "w":
        case "W": {
          if (e.altKey) {
            e.preventDefault();
            onWalkIn();
          }
          break;
        }

        case "s":
        case "S": {
          if (e.altKey) {
            e.preventDefault();
            onStudentMode();
          }
          break;
        }

        case "Delete": {
          if (!isEditable && canDeleteLastItem && items.length > 0) {
            e.preventDefault();
            const lastItem = items[items.length - 1];
            removeItem(lastItem.id);
          }
          break;
        }

        default: {
          if (e.altKey && PAYMENT_METHODS[e.key]) {
            e.preventDefault();
            const method = PAYMENT_METHODS[e.key];
            if (method === "wallet" && isWalkIn) break;
            setPaymentMethod(method);
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    items,
    isWalkIn,
    canDeleteLastItem,
    onCheckout,
    onClearStudent,
    onWalkIn,
    onStudentMode,
    setPaymentMethod,
    removeItem,
  ]);
}
