"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/store/auth";

export default function PosGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((s) => s.token);
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
  }, [mounted, token, activeBranch, router]);

  if (!mounted || !token || !activeBranch) return null;

  return <>{children}</>;
}
