"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EchoProvider } from "@/components/providers/echo-provider";
import { KitchenLayout } from "@/components/layouts/kitchen-layout";
import { useAuthStore } from "@/lib/store/auth";

export default function KitchenGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);
  const router = useRouter();

  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!activeBranch) {
      router.replace("/branch");
      return;
    }
    if (user?.roles.includes("cashier")) {
      router.replace("/pos");
    }
  }, [mounted, token, activeBranch, user, router]);

  const isCashier = user?.roles.includes("cashier");
  if (!mounted || !token || !activeBranch || isCashier) return null;

  return (
    <EchoProvider>
      <KitchenLayout>{children}</KitchenLayout>
    </EchoProvider>
  );
}
