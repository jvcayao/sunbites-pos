import { apiClient } from "./client";

import type {
  StaffNotificationListResponse,
  StaffUnreadCountResponse,
} from "@/types/staff-notification";

export const staffNotificationApi = {
  unreadCount: () =>
    apiClient.get<StaffUnreadCountResponse>("/staff/notifications/unread-count"),

  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<StaffNotificationListResponse>("/staff/notifications", { params }),

  markRead: (id: string) =>
    apiClient.patch<{ message: string }>(`/staff/notifications/${id}/read`),

  destroy: (id: string) =>
    apiClient.delete<void>(`/staff/notifications/${id}`),

  markAllRead: () =>
    apiClient.post<{ message: string }>("/staff/notifications/mark-all-read"),
};
