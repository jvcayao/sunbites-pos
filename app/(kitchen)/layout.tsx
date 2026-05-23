"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { KitchenLayout } from "@/components/layouts/kitchen-layout";
import { useAuthStore } from "@/lib/store/auth";

export default function KitchenGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) router.replace("/login");
  }, [mounted, token, router]);

  if (!mounted || !token) return null;

  return <KitchenLayout>{children}</KitchenLayout>;
}
