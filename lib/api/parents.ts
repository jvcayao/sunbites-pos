import { apiClient } from "./client";

import type { PaginatedParents, ParentDetail } from "@/types/parent";

interface ParentListParams {
  search?: string;
  per_page?: number;
  page?: number;
  include_deleted?: boolean;
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

  disable: (id: number) =>
    apiClient.post<{ message: string }>(`/references/parents/${id}/disable`),

  enable: (id: number) =>
    apiClient.post<{ message: string }>(`/references/parents/${id}/enable`),

  destroy: (id: number) =>
    apiClient.delete<{ message: string }>(`/references/parents/${id}`),

  restore: (id: number) =>
    apiClient.post<{ message: string }>(`/references/parents/${id}/restore`),
};
