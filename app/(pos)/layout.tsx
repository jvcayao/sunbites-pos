"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/store/auth";

export default function PosGroupLayout({
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
    setMounted(true);
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
    if (user && !user.roles.includes("cashier")) {
      router.replace("/dashboard");
    }
  }, [mounted, token, activeBranch, user, router]);

  const isNonCashier = user && !user.roles.includes("cashier");
  if (!mounted || !token || !activeBranch || isNonCashier) return null;

  return <>{children}</>;
}
