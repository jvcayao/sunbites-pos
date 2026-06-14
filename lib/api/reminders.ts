import { apiClient } from "./client";

import type {
  EligibleParent,
  EligibleParentsParams,
  ReminderBellCount,
  ReminderParentDetail,
  ReminderSendResult,
} from "@/types/reminder";

interface PaginatedEligibleParents {
  data: EligibleParent[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const reminderApi = {
  bellCount: () => apiClient.get<ReminderBellCount>("/reminders/bell-count"),

  eligibleParents: (params?: EligibleParentsParams) =>
    apiClient.get<PaginatedEligibleParents>("/reminders/eligible-parents", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  send: (parentIds: number[], force?: boolean) =>
    apiClient.post<ReminderSendResult>("/reminders/send", {
      parent_ids: parentIds,
      ...(force ? { force: true } : {}),
    }),

  parentDetail: (id: number) =>
    apiClient.get<ReminderParentDetail>(`/reminders/parents/${id}`),
};
