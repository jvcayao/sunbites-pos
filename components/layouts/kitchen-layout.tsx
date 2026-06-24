"use client";

import { useState } from "react";

import { AppHeader } from "@/components/navigation/app-header";
import { AppNavSheet } from "@/components/navigation/app-nav-sheet";

interface KitchenLayoutProps {
  children: React.ReactNode;
}

export function KitchenLayout({ children }: KitchenLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader onMenuOpen={() => setMenuOpen(true)} />
      <AppNavSheet open={menuOpen} onOpenChange={setMenuOpen} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
