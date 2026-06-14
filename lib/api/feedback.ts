import { apiClient } from "./client";

import type { PaginatedFeedback } from "@/types/feedback";

interface FeedbackListParams {
  search?: string;
  is_read?: boolean;
  per_page?: number;
  page?: number;
  branch_id?: number;
}

export const feedbackApi = {
  list: (params?: FeedbackListParams) =>
    apiClient.get<PaginatedFeedback>("/references/feedback", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  reply: (id: number, admin_reply: string) =>
    apiClient.post<{ message: string }>(`/references/feedback/${id}/reply`, {
      admin_reply,
    }),

  markRead: (id: number) =>
    apiClient.patch<{ message: string }>(
      `/references/feedback/${id}/mark-read`,
    ),
};
