export type MenuCategory = "meal" | "snack" | "drink" | "extra";

export interface PosMenuItem {
  id: number;
  name: string;
  price: string;
  category: MenuCategory;
  is_available: boolean;
  sort_order: number;
  inventory_status: "OK" | "LOW" | "OUT" | "OVER" | null;
  has_inventory_mapping: boolean;
}

export interface CreateMenuItemPayload {
  name: string;
  price: string;
  category: MenuCategory;
}

export type UpdateMenuItemPayload = CreateMenuItemPayload;
