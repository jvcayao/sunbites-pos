export type InventoryStatus = "OK" | "LOW" | "OUT" | "OVER";
export type InventoryLogType = "restock" | "waste" | "manual" | "sale";

export interface InventoryItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  restock_threshold: string;
  overstock_threshold: string | null;
  cost_per_unit: string | null;
  is_archived: boolean;
  has_inventory_mapping: boolean;
  inventory_status: InventoryStatus | null;
  status: InventoryStatus;
}

export interface InventoryLog {
  id: number;
  type: InventoryLogType;
  type_label?: string;
  quantity_change: string;
  stock_after: string;
  reason: string;
  adjusted_by: string | null;
  created_at: string;
  item_name_snapshot?: string;
  order_id?: number | null;
  item_name?: string;
}

export interface InventoryHistoryLog {
  id: number;
  item_name_snapshot: string;
  type: InventoryLogType;
  type_label: string;
  quantity_change: string;
  stock_after: string;
  reason: string;
  adjusted_by: string | null;
  created_at: string;
  order_id: number | null;
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
  overstock_threshold?: string | null;
  cost_per_unit?: string | null;
}

export interface UpdateInventoryItemPayload {
  name: string;
  unit: string;
  restock_threshold: string;
  overstock_threshold?: string | null;
  cost_per_unit?: string | null;
}

export interface InventoryHistoryFilters {
  from?: string;
  to?: string;
  type?: string;
  item_id?: number;
  page?: number;
}

export interface InventoryIngredient {
  inventory_item_id: number;
  name: string;
  unit: string;
  quantity_used: number;
}

export interface AttachIngredientPayload {
  inventory_item_id: number;
  quantity_used: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}
