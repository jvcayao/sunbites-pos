import { apiClient } from "./client";

import type {
  AnnouncementDetail,
  AnnouncementListResponse,
  CreateAnnouncementPayload,
} from "@/types/announcement";

export const announcementApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<AnnouncementListResponse>("/announcements", { params }),

  create: (payload: CreateAnnouncementPayload) =>
    apiClient.post<{ id: number }>("/announcements", payload),

  show: (id: number) =>
    apiClient.get<{ data: AnnouncementDetail }>(`/announcements/${id}`),
};
