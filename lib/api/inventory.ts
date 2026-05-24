import { apiClient } from "./client";

import type {
  AdjustStockPayload,
  CreateInventoryItemPayload,
  InventoryItem,
  InventoryLog,
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
};
