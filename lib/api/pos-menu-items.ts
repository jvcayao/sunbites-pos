import { apiClient } from "./client";

import type { CreateMenuItemPayload, PosMenuItem } from "@/types/pos-menu-item";

export const posMenuItemApi = {
  list: () => apiClient.get<PosMenuItem[]>("/pos/menu-items"),

  create: (payload: CreateMenuItemPayload) =>
    apiClient.post<PosMenuItem>("/pos/menu-items", payload),

  toggle: (id: number) =>
    apiClient.post<{ is_available: boolean }>(`/pos/menu-items/${id}/toggle`),

  destroy: (id: number) =>
    apiClient.delete<{ message: string }>(`/pos/menu-items/${id}`),
};
