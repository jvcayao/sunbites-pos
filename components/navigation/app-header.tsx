"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { getPageTitle } from "@/lib/navigation";
import { NotificationBell } from "@/components/notification-bell";

interface AppHeaderProps {
  onMenuOpen: () => void;
}

export function AppHeader({ onMenuOpen }: AppHeaderProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);

  const isAdmin = user?.roles.includes("admin") ?? false;
  const canSwitchBranch = isAdmin || (user?.branches?.length ?? 0) > 1;
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="no-print flex h-16 shrink-0 items-center border-b border-border bg-card px-4">
      {/* Left: hamburger + logo + brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Image
          src="/icon.png"
          alt="Sunbites logo"
          width={32}
          height={32}
          className="shrink-0"
        />

        <div>
          <p className="text-sm font-bold leading-tight text-foreground">
            Sunbites
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground">
            Your healthy kitchen
          </p>
        </div>
      </div>

      {/* Center: page title */}
      <div className="flex flex-1 items-center justify-center px-4">
        <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Right: branch badge + notifications + user */}
      <div className="flex items-center gap-3">
        {activeBranch &&
          (canSwitchBranch ? (
            <Link
              href="/branch"
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {activeBranch.name}
            </Link>
          ) : (
            <span className="cursor-default rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {activeBranch.name}
            </span>
          ))}

        <NotificationBell />

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
                <span
                  className={cn(
                    "text-xs capitalize leading-tight text-muted-foreground",
                  )}
                >
                  {user.roles[0]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
