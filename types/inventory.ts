export type InventoryStatus = "OK" | "LOW" | "OUT";
export type InventoryLogType = "restock" | "waste" | "manual" | "sale";

export interface InventoryItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  restock_threshold: string;
  status: InventoryStatus;
}

export interface InventoryLog {
  id: number;
  type: InventoryLogType;
  quantity_change: string;
  stock_after: string;
  reason: string;
  adjusted_by: string | null;
  created_at: string;
}

export interface AdjustStockPayload {
  type: InventoryLogType;
  quantity: string;
  direction: "add" | "deduct";
  reason: string;
}

export interface CreateInventoryItemPayload {
  name: string;
  quantity: string;
  unit: string;
  restock_threshold: string;
}

export interface UpdateInventoryItemPayload {
  name: string;
  unit: string;
  restock_threshold: string;
}
