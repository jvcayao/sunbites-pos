import { apiClient } from "./client";

import type { AuthUser } from "@/types/auth";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>("/auth/login", payload),

  logout: () =>
    apiClient.post<void>("/auth/logout"),

  user: () =>
    apiClient.get<AuthUser>("/auth/user"),

  setBranch: (branchId: number, fromBranchId: number | null = null) =>
    apiClient.post<{ id: number; name: string; slug: string }>("/auth/branch", {
      branch_id: branchId,
      from_branch_id: fromBranchId,
    }),
};
