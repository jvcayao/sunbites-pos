import { apiClient } from "./client";

import type { AdminBranch, UpdateBranchPayload } from "@/types/branch";
import type { Branch } from "@/types/auth";

export const branchApi = {
  list: () => apiClient.get<Branch[]>("/branches"),

  listForAdmin: () => apiClient.get<AdminBranch[]>("/branches"),

  update: (id: number, payload: UpdateBranchPayload) =>
    apiClient.put<AdminBranch>(`/branches/${id}`, payload),

  toggle: (id: number) =>
    apiClient.post<{ is_active: boolean }>(`/branches/${id}/toggle`),
};
