"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { AuthLayout } from "@/components/layouts/auth-layout";
import { authApi } from "@/lib/api/auth";
import { branchApi } from "@/lib/api/branches";
import { getHomeRoute } from "@/lib/auth-utils";
import { useAuthStore } from "@/lib/store/auth";

import type { Branch } from "@/types/auth";

export default function BranchPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);

  const isAdmin = user?.roles.includes("admin") ?? false;

  // Admins can work from any branch — fetch the full list instead of relying on assigned branches
  const { data: allBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.list(),
    enabled: isAdmin,
  });

  const branches: Branch[] = isAdmin
    ? (allBranches ?? user?.branches ?? [])
    : (user?.branches ?? []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  async function handleSelectBranch(branch: Branch) {
    try {
      await authApi.setBranch(branch.id, activeBranch?.id ?? null);
    } catch {
      // Log silently — branch switch logging failure must not block UX
    }
    setActiveBranch(branch);
    router.push(getHomeRoute(user?.roles ?? []));
  }

  if (!user) return null;

  return (
    <AuthLayout className="max-w-[600px]">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Select a branch</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the branch you are working at today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => handleSelectBranch(branch)}
            className="rounded-xl border-2 border-border p-6 text-left transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {branch.name.charAt(0).toUpperCase()}
            </div>
            <p className="mt-3 font-semibold text-foreground">{branch.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {branch.slug}
            </p>
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}
