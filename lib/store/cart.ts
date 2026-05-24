import { create } from "zustand";

import type { OrderPaymentMethod, PosStudent } from "@/types/order";

export interface CartItem {
  id: number; // pos_menu_item_id
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  student: PosStudent | null;
  isWalkIn: boolean;
  paymentMethod: OrderPaymentMethod;
  notes: string;

  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  setStudent: (student: PosStudent | null) => void;
  setWalkIn: (walkIn: boolean) => void;
  setPaymentMethod: (method: OrderPaymentMethod) => void;
  setNotes: (notes: string) => void;
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  student: null,
  isWalkIn: false,
  paymentMethod: "cash",
  notes: "",

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  clearCart: () =>
    set({ items: [], student: null, isWalkIn: false, paymentMethod: "cash", notes: "" }),

  setStudent: (student) => set({ student, isWalkIn: false }),

  setWalkIn: (walkIn) =>
    set({ isWalkIn: walkIn, student: null, paymentMethod: "cash" }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setNotes: (notes) => set({ notes }),
}));
