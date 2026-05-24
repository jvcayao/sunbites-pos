import { http, HttpResponse } from "msw";

import type { AdminBranch } from "@/types/branch";
import type { InventoryItem } from "@/types/inventory";
import type { PosMenuItem } from "@/types/pos-menu-item";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Spec 04 fixtures
// ---------------------------------------------------------------------------

export const posMenuItemsFixture: PosMenuItem[] = [
  { id: 1, name: "Subscription Meal Tray", price: "135.00", category: "meal", is_available: true, sort_order: 0 },
  { id: 2, name: "Snack A (Bread/Pastry)", price: "15.00", category: "snack", is_available: true, sort_order: 1 },
];

export const inventoryItemsFixture: InventoryItem[] = [
  { id: 1, name: "Rice", quantity: "50.00", unit: "kg", restock_threshold: "20.00", status: "OK" },
  { id: 2, name: "Chicken", quantity: "8.00", unit: "kg", restock_threshold: "10.00", status: "LOW" },
];

export const mealPlannerFixture = {
  grid: [
    { day: "monday", day_label: "Monday", ulam: "Chicken Adobo", vegetables: "Chopsuey", fruit: "Mango", soup: "Sinigang" },
    { day: "tuesday", day_label: "Tuesday", ulam: "Sinigang na Baboy", vegetables: "Pinakbet", fruit: "Banana", soup: "Miso" },
    { day: "wednesday", day_label: "Wednesday", ulam: "Tinola", vegetables: "Laing", fruit: "Apple", soup: "Broth" },
    { day: "thursday", day_label: "Thursday", ulam: "Kaldereta", vegetables: "Gulay", fruit: "Orange", soup: "Clear" },
    { day: "friday", day_label: "Friday", ulam: "Inasal", vegetables: "Ampalaya", fruit: "Watermelon", soup: "Corn" },
  ],
};

export const inventoryLogsFixture = [
  { id: 1, type: "restock", quantity_change: "20.00", stock_after: "50.00", reason: "Initial stock", adjusted_by: "Admin", created_at: "2024-06-01T08:00:00Z" },
];

export const staffUserFixture = {
  id: 1,
  first_name: "Juan",
  last_name: "Dela Cruz",
  full_name: "Juan Dela Cruz",
  middle_name: null,
  nickname: null,
  email: "juan@sunbites.test",
  birthday: null,
  gender: null,
  civil_status: null,
  has_photo: false,
  phone: "09171234567",
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  address_line: null,
  city: null,
  province: null,
  zip_code: null,
  position: "Cashier Staff",
  employment_type: "full_time",
  date_hired: "2024-01-15",
  daily_rate: "600.00",
  is_active: true,
  roles: ["cashier"],
  branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
  sss_number: null,
  pagibig_number: null,
  philhealth_number: null,
  tin_number: null,
};

export const branchesFixture = [
  { id: 1, name: "Main Branch", slug: "main-branch" },
  { id: 2, name: "South Branch", slug: "south-branch" },
];

export const adminBranchesFixture: AdminBranch[] = [
  {
    id: 1,
    name: "Main Branch",
    slug: "main-branch",
    address: "123 Main St",
    gcash_number: "09171234567",
    is_active: true,
    staff_count: 3,
    student_count: 10,
    orders_today: 0,
    deleted_at: null,
  },
  {
    id: 2,
    name: "South Branch",
    slug: "south-branch",
    address: null,
    gcash_number: null,
    is_active: true,
    staff_count: 1,
    student_count: 5,
    orders_today: 0,
    deleted_at: null,
  },
];

export const handlers = [
  http.post(`${API}/auth/login`, () =>
    HttpResponse.json({
      token: "test-sanctum-token",
      user: {
        id: 1,
        full_name: "Test Staff",
        email: "staff@sunbites.test",
        roles: ["admin"],
        branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
      },
    })
  ),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/users`, () =>
    HttpResponse.json({
      data: [staffUserFixture],
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 1,
        from: 1,
        to: 1,
      },
    })
  ),

  http.get(`${API}/users/:id`, () => HttpResponse.json(staffUserFixture)),

  http.post(`${API}/users`, () =>
    HttpResponse.json({ ...staffUserFixture, id: 2 }, { status: 201 })
  ),

  http.put(`${API}/users/:id`, () => HttpResponse.json(staffUserFixture)),

  http.post(`${API}/users/:id/deactivate`, () =>
    HttpResponse.json({ message: "User deactivated." })
  ),

  http.post(`${API}/users/:id/reactivate`, () =>
    HttpResponse.json({ ...staffUserFixture, is_active: true })
  ),

  http.post(`${API}/users/:id/reset-password`, () =>
    HttpResponse.json({ message: "Password reset email sent." })
  ),

  http.get(`${API}/branches`, () => HttpResponse.json(adminBranchesFixture)),

  http.put(`${API}/branches/:id`, () =>
    HttpResponse.json({ ...adminBranchesFixture[0], name: "Updated Branch Name" })
  ),

  http.post(`${API}/branches/:id/toggle`, () =>
    HttpResponse.json({ is_active: false })
  ),

  // POS Menu Items
  http.get(`${API}/pos/menu-items`, () => HttpResponse.json(posMenuItemsFixture)),

  http.post(`${API}/pos/menu-items`, () =>
    HttpResponse.json({ ...posMenuItemsFixture[0], id: 99, name: "New Item" }, { status: 201 })
  ),

  http.post(`${API}/pos/menu-items/:id/toggle`, () =>
    HttpResponse.json({ is_available: false })
  ),

  http.delete(`${API}/pos/menu-items/:id`, () =>
    HttpResponse.json({ message: "Menu item deleted." })
  ),

  // Meal Planner
  http.get(`${API}/references/meal-planner`, () => HttpResponse.json(mealPlannerFixture)),

  http.patch(`${API}/references/meal-planner`, () =>
    HttpResponse.json({ message: "Week 1 of june menu saved." })
  ),

  http.post(`${API}/references/meal-planner/reset`, () =>
    HttpResponse.json({ message: "Week reset to default pattern." })
  ),

  // POS Inventory
  http.get(`${API}/pos/inventory`, () => HttpResponse.json(inventoryItemsFixture)),

  http.post(`${API}/pos/inventory/:id/adjust`, () =>
    HttpResponse.json({
      message: "Stock adjusted.",
      item: { ...inventoryItemsFixture[0], quantity: "55.00" },
    })
  ),

  // References Inventory
  http.get(`${API}/references/inventory`, () => HttpResponse.json(inventoryItemsFixture)),

  http.post(`${API}/references/inventory`, () =>
    HttpResponse.json({ id: 99, name: "New Item", quantity: "10.00", unit: "pcs", restock_threshold: "5.00", status: "OK" }, { status: 201 })
  ),

  http.put(`${API}/references/inventory/:id`, () =>
    HttpResponse.json({ ...inventoryItemsFixture[0], name: "Updated Rice" })
  ),

  http.delete(`${API}/references/inventory/:id`, () =>
    HttpResponse.json({ message: "Inventory item deleted." })
  ),

  http.get(`${API}/references/inventory/:id/logs`, () =>
    HttpResponse.json(inventoryLogsFixture)
  ),
];
