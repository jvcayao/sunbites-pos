"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { usePosKeyboardShortcuts } from "@/hooks/use-pos-keyboard-shortcuts";
import { AppHeader } from "@/components/navigation/app-header";
import { AppNavSheet } from "@/components/navigation/app-nav-sheet";
import { CartPanel } from "@/components/pos/cart-panel";
import { MenuGrid } from "@/components/pos/menu-grid";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { StudentSearchInput } from "@/components/pos/student-search-input";
import { TransactionHistoryTab } from "@/components/pos/transaction-history-tab";

// Inline re-export of the kitchen POS menu/inventory content to avoid duplication.
// Those tabs already live in (kitchen)/pos/page.tsx; we reference the same query
// keys so TanStack Query's cache deduplicates network requests.
import { MenuMgmtTab } from "@/components/pos/menu-mgmt-tab";
import { InventoryTab } from "@/components/pos/inventory-tab";

import type { Order, PosStudent } from "@/types/order";

type ActiveTab = "pos" | "transactions" | "menu-mgmt" | "inventory";

interface TabConfig {
  id: ActiveTab;
  label: string;
  requiresRole?: string[];
}

const TABS: TabConfig[] = [
  { id: "pos", label: "POS" },
  { id: "transactions", label: "Transactions" },
  { id: "menu-mgmt", label: "Menu Mgmt", requiresRole: ["admin", "manager"] },
  {
    id: "inventory",
    label: "Inventory",
    requiresRole: ["admin", "manager", "supervisor"],
  },
];

export default function PosPage() {
  const user = useAuthStore((s) => s.user);
  const { student, isWalkIn, setStudent, setWalkIn, clearCart } =
    useCartStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>("pos");
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStudentSelected = useCallback(
    (selected: PosStudent | null) => {
      setStudent(selected);
    },
    [setStudent],
  );

  const handleWalkIn = useCallback(() => {
    setWalkIn(true);
  }, [setWalkIn]);

  const handleStudentMode = useCallback(() => {
    setWalkIn(false);
    setStudent(null);
  }, [setWalkIn, setStudent]);

  const handleClearStudent = useCallback(() => {
    setStudent(null);
    setWalkIn(false);
  }, [setStudent, setWalkIn]);

  const handleCheckout = useCallback(() => {
    // Keyboard shortcut delegates to the CartPanel's internal submit.
    // Dispatch a synthetic click on the confirm button.
    const btn = document.querySelector<HTMLButtonElement>(
      "[data-pos-checkout]",
    );
    btn?.click();
  }, []);

  usePosKeyboardShortcuts({
    onCheckout: handleCheckout,
    onClearStudent: handleClearStudent,
    onWalkIn: handleWalkIn,
    onStudentMode: handleStudentMode,
  });

  function handleNewOrder() {
    clearCart();
    setCompletedOrder(null);
  }

  const visibleTabs = TABS.filter((tab) => {
    if (!tab.requiresRole) return true;
    return tab.requiresRole.some((role) => user?.roles.includes(role));
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader onMenuOpen={() => setMenuOpen(true)} />
      <AppNavSheet open={menuOpen} onOpenChange={setMenuOpen} />

      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "border-2 border-border bg-background text-foreground hover:border-primary/50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* POS tab — two-column layout */}
      {activeTab === "pos" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left column: student search + menu grid */}
          <div className="flex flex-1 min-w-0 flex-col gap-4 overflow-y-auto p-4">
            <StudentSearchInput
              onStudentSelected={handleStudentSelected}
              onWalkIn={handleWalkIn}
              selectedStudent={student}
              isWalkIn={isWalkIn}
            />
            <MenuGrid />
          </div>

          {/* Right column: cart */}
          <div className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border p-3">
            <CartPanel onOrderComplete={setCompletedOrder} className="flex-1" />
          </div>
        </div>
      )}

      {/* Transactions tab */}
      {activeTab === "transactions" && (
        <div className="flex-1 overflow-y-auto p-4">
          <TransactionHistoryTab />
        </div>
      )}

      {/* Menu management tab */}
      {activeTab === "menu-mgmt" && (
        <div className="flex-1 overflow-y-auto p-4">
          {user?.roles.includes("admin") || user?.roles.includes("manager") ? (
            <MenuMgmtTab />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only admins and managers can manage menu items.
            </p>
          )}
        </div>
      )}

      {/* Inventory tab */}
      {activeTab === "inventory" && (
        <div className="flex-1 overflow-y-auto p-4">
          {user?.roles.includes("admin") ||
          user?.roles.includes("manager") ||
          user?.roles.includes("supervisor") ? (
            <InventoryTab />
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have access to inventory.
            </p>
          )}
        </div>
      )}

      {/* Receipt modal */}
      <ReceiptModal order={completedOrder} onNewOrder={handleNewOrder} />
    </div>
  );
}
