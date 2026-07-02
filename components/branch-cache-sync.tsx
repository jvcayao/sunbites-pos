"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/store/auth";

/**
 * Resets the TanStack Query cache whenever the active branch changes so the UI
 * never shows another branch's data. Renders nothing.
 *
 * - Branch switch (A -> B): resetQueries() — refetches all active observers
 *   with the new X-Branch-Id. (clear() alone does NOT refetch mounted queries.)
 * - Logout (B -> null): clear() — drops the previous user's cached data with
 *   no refetch.
 * - First selection (null -> B) and hard refresh: no-op (guarded).
 */
export function BranchCacheSync() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranch?.id ?? null);
  const previousBranchId = useRef(branchId);

  useEffect(() => {
    if (
      previousBranchId.current !== null &&
      previousBranchId.current !== branchId
    ) {
      if (branchId === null) {
        queryClient.clear();
      } else {
        queryClient.resetQueries();
      }
    }
    previousBranchId.current = branchId;
  }, [branchId, queryClient]);

  return null;
}
