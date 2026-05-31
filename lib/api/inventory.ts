import { apiClient } from "./client";

import type {
  AdjustStockPayload,
  AttachIngredientPayload,
  CreateInventoryItemPayload,
  InventoryHistoryFilters,
  InventoryHistoryLog,
  InventoryIngredient,
  InventoryItem,
  InventoryLog,
  PaginatedResponse,
  UpdateInventoryItemPayload,
} from "@/types/inventory";

export const inventoryApi = {
  list: () => apiClient.get<InventoryItem[]>("/references/inventory"),

  listForPos: () => apiClient.get<InventoryItem[]>("/pos/inventory"),

  adjust: (id: number, payload: AdjustStockPayload) =>
    apiClient.post<{ message: string; item: InventoryItem }>(`/pos/inventory/${id}/adjust`, payload),

  create: (payload: CreateInventoryItemPayload) =>
    apiClient.post<InventoryItem>("/references/inventory", payload),

  update: (id: number, payload: UpdateInventoryItemPayload) =>
    apiClient.put<InventoryItem>(`/references/inventory/${id}`, payload),

  destroy: (id: number) =>
    apiClient.delete<{ message: string }>(`/references/inventory/${id}`),

  logs: (id: number) =>
    apiClient.get<InventoryLog[]>(`/references/inventory/${id}/logs`),

  history: (filters?: InventoryHistoryFilters) =>
    apiClient.get<PaginatedResponse<InventoryHistoryLog>>("/references/inventory/history", {
      params: filters as Record<string, string | number | boolean | undefined>,
    }),

  archive: (id: number) =>
    apiClient.patch<{ message: string }>(`/references/inventory/${id}/archive`),

  unarchive: (id: number) =>
    apiClient.patch<{ message: string }>(`/references/inventory/${id}/unarchive`),

  listIngredients: (menuItemId: number) =>
    apiClient.get<InventoryIngredient[]>(`/references/menu-items/${menuItemId}/ingredients`),

  attachIngredient: (menuItemId: number, payload: AttachIngredientPayload) =>
    apiClient.post<InventoryIngredient[]>(`/references/menu-items/${menuItemId}/ingredients`, payload),

  detachIngredient: (menuItemId: number, inventoryItemId: number) =>
    apiClient.delete<{ message: string }>(
      `/references/menu-items/${menuItemId}/ingredients/${inventoryItemId}`
    ),
};
