"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Menu,
  LayoutDashboard,
  ClipboardList,
  Users,
  Archive,
  CalendarDays,
  GitBranch,
  UserCog,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { usePosKeyboardShortcuts } from "@/hooks/use-pos-keyboard-shortcuts";
import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const MAIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/enrollment",
    label: "Enrollment",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  { href: "/students", label: "Students", icon: <Users className="h-4 w-4" /> },
];

const REFERENCES_NAV: NavItem[] = [
  {
    href: "/references/inventory",
    label: "Inventory",
    icon: <Archive className="h-4 w-4" />,
  },
  {
    href: "/references/meal-planner",
    label: "Meal Planner",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    href: "/references/users",
    label: "Users",
    icon: <UserCog className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    href: "/references/branches",
    label: "Branches",
    icon: <GitBranch className="h-4 w-4" />,
  },
];

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
  const activeBranch = useAuthStore((s) => s.activeBranch);
  const { student, isWalkIn, setStudent, setWalkIn, clearCart } =
    useCartStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>("pos");
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = user?.roles.includes("admin") ?? false;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout even if the API call fails
    }
    useAuthStore.getState().logout();
    router.push("/login");
  }

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
      {/* Top header bar */}
      <div className="flex h-12 shrink-0 items-center border-b border-border bg-card px-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="ml-3 text-sm text-muted-foreground">
          {activeBranch?.name ?? "No branch selected"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <>
              <span className="text-sm font-medium text-foreground">
                {user.first_name}
              </span>
              {user.roles[0] && (
                <Badge variant="secondary" className="capitalize">
                  {user.roles[0]}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hamburger Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex flex-col p-0 sm:max-w-xs">
          <SheetHeader className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between">
              <AppLogo variant="full" />
            </div>
            {activeBranch && (
              <Badge variant="outline" className="mt-2 w-fit">
                {activeBranch.name}
              </Badge>
            )}
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            <div>
              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Main
              </p>
              <div className="space-y-0.5">
                {MAIN_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      pathname === item.href
                        ? "border-l-4 border-primary bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                References
              </p>
              <div className="space-y-0.5">
                {REFERENCES_NAV.filter(
                  (item) => !item.adminOnly || isAdmin,
                ).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      pathname === item.href
                        ? "border-l-4 border-primary bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <SheetFooter className="border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
