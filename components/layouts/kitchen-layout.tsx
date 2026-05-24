"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart2,
  Users,
  Wallet,
  Package,
  FileText,
  Archive,
  CalendarDays,
  UserCog,
  GitBranch,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  UserRound,
  MessageSquare,
} from "lucide-react";

import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Enrollment", href: "/enrollment", icon: ClipboardList },
  { label: "Students", href: "/students", icon: Users },
];

const reportsNav: NavItem[] = [
  { label: "Sales", href: "/reports/sales", icon: BarChart2 },
  { label: "Wallet", href: "/reports/wallet", icon: Wallet },
  { label: "Inventory", href: "/reports/inventory", icon: Package },
  { label: "Daily Summary", href: "/reports/daily-summary", icon: FileText },
];

const referencesNav: NavItem[] = [
  { label: "Inventory", href: "/references/inventory", icon: Archive },
  { label: "Meal Planner", href: "/references/meal-planner", icon: CalendarDays },
  { label: "Subscription Config", href: "/references/subscription-config", icon: CalendarDays },
  { label: "Users", href: "/references/users", icon: UserCog },
  { label: "Branches", href: "/references/branches", icon: GitBranch },
  { label: "Parents", href: "/references/parents", icon: UserRound },
  { label: "Feedback", href: "/references/feedback", icon: MessageSquare },
  { label: "System Settings", href: "/references/system-settings", icon: Settings },
];

interface NavGroupProps {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}

function NavGroup({ label, items, pathname, collapsed }: NavGroupProps) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      )}
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-l-[3px] border-primary bg-primary/10 text-primary font-bold"
                : "text-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

interface KitchenLayoutProps {
  children: React.ReactNode;
}

export function KitchenLayout({ children }: KitchenLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);

  const isAdmin = user?.roles.includes("admin") ?? false;

  const referencesNavFiltered = isAdmin
    ? referencesNav
    : referencesNav.filter((item) => item.href !== "/references/system-settings");

  const pageTitle = [...mainNav, ...reportsNav, ...referencesNav].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )?.label ?? "Dashboard";

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // continue regardless
    }
    useAuthStore.getState().logout();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-sidebar transition-all duration-200",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-3">
          {collapsed ? (
            <AppLogo variant="icon" />
          ) : (
            <AppLogo variant="full" />
          )}
        </div>

        {/* Branch indicator */}
        {activeBranch && (
          <div className="border-b border-border px-3 py-2">
            {collapsed ? (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
                title={activeBranch.name}
              >
                {activeBranch.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <Badge variant="outline" className="w-full justify-center truncate text-xs">
                {activeBranch.name}
              </Badge>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-2 py-4">
          <NavGroup
            label="Main"
            items={mainNav}
            pathname={pathname}
            collapsed={collapsed}
          />
          <NavGroup
            label="Reports"
            items={reportsNav}
            pathname={pathname}
            collapsed={collapsed}
          />
          <NavGroup
            label="References"
            items={referencesNavFiltered}
            pathname={pathname}
            collapsed={collapsed}
          />
        </nav>

        {/* Bottom: Collapse + Logout */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span aria-hidden="true">Logout</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <h1 className="text-lg font-semibold">{pageTitle}</h1>

          <div className="flex items-center gap-3">
            {activeBranch && (() => {
              const canSwitch = isAdmin || (user?.branches?.length ?? 0) > 1;
              return canSwitch ? (
                <Link
                  href="/branch"
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {activeBranch.name}
                </Link>
              ) : (
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground cursor-default">
                  {activeBranch.name}
                </span>
              );
            })()}
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {user.first_name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden flex-col md:flex">
                  <span className="text-sm font-medium leading-tight">
                    {user.first_name} {user.last_name}
                  </span>
                  {user.roles[0] && (
                    <span className="text-xs capitalize leading-tight text-muted-foreground">
                      {user.roles[0]}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
