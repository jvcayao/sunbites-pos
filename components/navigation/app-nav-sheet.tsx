"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth";
import { preRegistrationApi } from "@/lib/api/pre-registrations";
import { mainNav, reportsNav, referencesNav } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AppNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavGroupProps {
  label: string;
  items: NavItem[];
  pathname: string;
  onClose: () => void;
}

function NavGroup({ label, items, pathname, onClose }: NavGroupProps) {
  return (
    <div className="space-y-1">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-l-[3px] border-primary bg-primary/10 font-bold text-primary"
                : "text-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function AppNavSheet({ open, onOpenChange }: AppNavSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;
  const isSupervisor = user?.roles.includes("supervisor") ?? false;
  const canSeeReminders = isAdmin || isManager || isSupervisor;
  const canSeeAnnouncements = isAdmin || isManager || isSupervisor;
  const canSeePreRegistrations = isAdmin || isManager || isSupervisor;

  const { data: pendingCountData } = useQuery({
    queryKey: ["pre-registrations-pending-count"],
    queryFn: () => preRegistrationApi.list({ status: "pending", page: 1 }),
    enabled: canSeePreRegistrations,
    staleTime: 60_000,
  });
  const pendingPreRegCount = pendingCountData?.meta?.total ?? 0;

  const mainNavFiltered = mainNav
    .map((item) =>
      item.href === "/pre-registrations"
        ? { ...item, badge: pendingPreRegCount > 0 ? pendingPreRegCount : undefined }
        : item,
    )
    .filter((item) => {
      if (item.href === "/reminders" && !canSeeReminders) return false;
      if (item.href === "/announcements" && !canSeeAnnouncements) return false;
      if (item.href === "/pre-registrations" && !canSeePreRegistrations) return false;
      return true;
    });

  const supervisorAllowedReports = [
    "/reports/sales",
    "/reports/students",
    "/reports/inventory",
    "/reports/billing",
    "/reports/subscription",
  ];
  const reportsNavFiltered =
    isAdmin || isManager
      ? reportsNav
      : reportsNav.filter((item) =>
          supervisorAllowedReports.includes(item.href),
        );

  const referencesNavFiltered = isAdmin
    ? referencesNav
    : referencesNav.filter(
        (item) => item.href !== "/references/system-settings",
      );

  function handleClose() {
    onOpenChange(false);
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout even if the API call fails
    }
    useAuthStore.getState().logout();
    router.push("/login");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col p-0 sm:max-w-xs">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Sunbites logo"
              width={36}
              height={36}
              className="shrink-0"
            />
            <div>
              <p className="font-bold leading-tight text-foreground">Sunbites</p>
              <p className="text-xs leading-tight text-muted-foreground">
                Your healthy kitchen
              </p>
            </div>
          </div>
          {activeBranch && (
            <Badge variant="outline" className="mt-2 w-fit">
              {activeBranch.name}
            </Badge>
          )}
        </SheetHeader>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
          <NavGroup
            label="Main"
            items={mainNavFiltered}
            pathname={pathname}
            onClose={handleClose}
          />
          <NavGroup
            label="Reports"
            items={reportsNavFiltered}
            pathname={pathname}
            onClose={handleClose}
          />
          <NavGroup
            label="References"
            items={referencesNavFiltered}
            pathname={pathname}
            onClose={handleClose}
          />
        </nav>

        <div className="border-t border-border px-2 py-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
