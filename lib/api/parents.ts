import { apiClient } from "./client";

import type { PaginatedParents, ParentDetail } from "@/types/parent";

interface ParentListParams {
  search?: string;
  per_page?: number;
  page?: number;
}

export const parentApi = {
  list: (params?: ParentListParams) =>
    apiClient.get<PaginatedParents>("/references/parents", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  show: (id: number) =>
    apiClient.get<ParentDetail>(`/references/parents/${id}`),

  resendActivation: (id: number) =>
    apiClient.post<{ message: string }>(
      `/references/parents/${id}/resend-activation`,
    ),
};
