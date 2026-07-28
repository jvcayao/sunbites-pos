import { apiClient } from "./client";

import type {
  FeedbackReplyResponse,
  PaginatedFeedback,
} from "@/types/feedback";

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

  reply: (id: number, reply: string) =>
    apiClient.post<FeedbackReplyResponse>(`/references/feedback/${id}/reply`, {
      reply,
    }),

  markRead: (id: number) =>
    apiClient.patch<{ message: string }>(
      `/references/feedback/${id}/mark-read`,
    ),
};
