import { http, HttpResponse } from "msw";

import type { AdminBranch } from "@/types/branch";
import type { InventoryItem } from "@/types/inventory";
import type { PosMenuItem } from "@/types/pos-menu-item";
import type { SystemConfiguration } from "@/types/system-configuration";
import type {
  EnrolledStudentResponse,
  MonthlyPayment,
  PaginatedStudents,
  Student,
} from "@/types/student";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Spec 04 fixtures
// ---------------------------------------------------------------------------

export const posMenuItemsFixture: PosMenuItem[] = [
  { id: 1, name: "Subscription Meal Tray", price: "135.00", category: "meal", is_available: true, sort_order: 0, inventory_status: "OK", has_inventory_mapping: true },
  { id: 2, name: "Snack A (Bread/Pastry)", price: "15.00", category: "snack", is_available: true, sort_order: 1, inventory_status: null, has_inventory_mapping: false },
];

export const inventoryItemsFixture: InventoryItem[] = [
  { id: 1, name: "Rice", quantity: "50.00", unit: "kg", restock_threshold: "20.00", overstock_threshold: null, cost_per_unit: null, is_archived: false, has_inventory_mapping: true, inventory_status: "OK", status: "OK" },
  { id: 2, name: "Chicken", quantity: "8.00", unit: "kg", restock_threshold: "10.00", overstock_threshold: null, cost_per_unit: null, is_archived: false, has_inventory_mapping: false, inventory_status: "LOW", status: "LOW" },
];

export const mealPlannerFixture = {
  visible_to_parents: true,
  days: [
    { day: "monday", day_label: "Monday", ulam: "Chicken Adobo", vegetables: "Chopsuey", fruit: "Mango", soup: "Sinigang", snacks: "Graham Crackers" },
    { day: "tuesday", day_label: "Tuesday", ulam: "Sinigang na Baboy", vegetables: "Pinakbet", fruit: "Banana", soup: "Miso", snacks: "Bread Roll" },
    { day: "wednesday", day_label: "Wednesday", ulam: "Tinola", vegetables: "Laing", fruit: "Apple", soup: "Broth", snacks: "Biscuit" },
    { day: "thursday", day_label: "Thursday", ulam: "Kaldereta", vegetables: "Gulay", fruit: "Orange", soup: "Clear", snacks: "Banana Cue" },
    { day: "friday", day_label: "Friday", ulam: "Inasal", vegetables: "Ampalaya", fruit: "Watermelon", soup: "Corn", snacks: "Puto" },
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

// ---------------------------------------------------------------------------
// Spec 05 fixtures
// ---------------------------------------------------------------------------

export const studentFixture: Student = {
  id: 1,
  branch_id: 1,
  student_number: "ANT-2025-001",
  first_name: "Maria",
  last_name: "Santos",
  full_name: "Maria Santos",
  grade_level: "Grade 3",
  section: "Section Mabini",
  birthday: "2015-03-14",
  has_photo: false,
  allergies: null,
  notes: null,
  qr_code: "SB-K8mP3xNzQr4w",
  student_type: "subscription",
  student_type_label: "Subscription",
  enrollment_status: "enrolled",
  enrollment_status_label: "Enrolled",
  enrollment_date: "2025-06-01",
  points: 0,
  total_spent: "0.00",
  credit_balance: "0.00",
  wallet_balance: 450.0,
  contacts: [
    {
      id: 1,
      full_name: "Ana Santos",
      relationship: "Mother",
      phone: "09171234567",
      address: "123 Rizal St",
      email: "ana@example.com",
      is_primary: true,
    },
  ],
  monthly_payments: [
    {
      id: 1,
      school_month: "june",
      school_month_label: "June",
      year: 2025,
      status: "paid",
      amount: "2970.00",
      recorded_at: "2025-06-15T08:00:00Z",
    },
    {
      id: 2,
      school_month: "july",
      school_month_label: "July",
      year: 2025,
      status: "unpaid",
      amount: "2970.00",
      recorded_at: null,
    },
  ],
};

export const nonSubStudentFixture: Student = {
  ...studentFixture,
  id: 2,
  student_number: "ANT-2025-002",
  full_name: "Carlo Mendoza",
  first_name: "Carlo",
  last_name: "Mendoza",
  student_type: "non_subscription",
  student_type_label: "Non-Subscription",
  credit_balance: "135.00",
  wallet_balance: 300.0,
};

export const enrolledStudentFixture: EnrolledStudentResponse = {
  id: 10,
  full_name: "Test Student",
  student_number: "ANT-2025-010",
  student_type: "subscription",
  enrollment_date: "2025-06-01",
  qr_code: "SB-TestQrCode123",
};

export const paymentsFixture: MonthlyPayment[] = [
  {
    id: 1,
    school_month: "june",
    school_month_label: "June",
    year: 2025,
    status: "paid",
    amount: "2970.00",
    recorded_at: "2025-06-15T08:00:00Z",
  },
  {
    id: 2,
    school_month: "july",
    school_month_label: "July",
    year: 2025,
    status: "unpaid",
    amount: "2970.00",
    recorded_at: null,
  },
];

// ---------------------------------------------------------------------------
// Spec 09 fixtures
// ---------------------------------------------------------------------------

export const systemConfigsFixture: SystemConfiguration[] = [
  {
    key: "daily_meal_rate",
    value: "135",
    type: "decimal",
    label: "Daily Meal Rate (₱)",
    description: "Daily rate used to compute monthly subscription amounts when no override is set.",
  },
  {
    key: "credit_limit",
    value: "300",
    type: "decimal",
    label: "Credit Limit (₱)",
    description: "Maximum outstanding credit a student may carry.",
  },
  {
    key: "loyalty_point_threshold",
    value: "1000",
    type: "decimal",
    label: "Loyalty Point Threshold (₱)",
    description: "Amount spent to earn one loyalty point.",
  },
];

export const paginatedStudentsFixture: PaginatedStudents = {
  data: [studentFixture, nonSubStudentFixture],
  links: { first: null, last: null, prev: null, next: null },
  meta: {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 2,
    from: 1,
    to: 2,
  },
};

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

  http.patch(`${API}/references/meal-planner/week-visibility`, () =>
    HttpResponse.json({ visible_to_parents: false })
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
    HttpResponse.json({ id: 99, name: "New Item", quantity: "10.00", unit: "pcs", restock_threshold: "5.00", overstock_threshold: null, cost_per_unit: null, is_archived: false, has_inventory_mapping: false, inventory_status: "OK", status: "OK" }, { status: 201 })
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

  // Enrollment
  http.get(`${API}/enrollment`, () =>
    HttpResponse.json({
      branches: branchesFixture,
      grade_levels: [
        "Nursery",
        "Kinder 1",
        "Kinder 2",
        "Grade 1",
        "Grade 2",
        "Grade 3",
        "Grade 4",
        "Grade 5",
        "Grade 6",
      ],
    })
  ),

  http.post(`${API}/enrollment`, () =>
    HttpResponse.json(enrolledStudentFixture, { status: 201 })
  ),

  // Students
  http.get(`${API}/students`, () =>
    HttpResponse.json(paginatedStudentsFixture)
  ),

  http.get(`${API}/students/:id`, () =>
    HttpResponse.json({
      student: studentFixture,
      wallet_transactions: [],
      activity_logs: [],
    })
  ),

  http.put(`${API}/students/:id`, () => HttpResponse.json(studentFixture)),

  http.delete(`${API}/students/:id`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.post(`${API}/students/:id/regenerate-qr`, () =>
    HttpResponse.json({ qr_code: "SB-NewCode123456" })
  ),

  http.patch(`${API}/students/:id/status`, () =>
    HttpResponse.json({ ...studentFixture, enrollment_status: "paused" })
  ),

  http.post(`${API}/students/:id/wallet/top-up`, () =>
    HttpResponse.json({
      message: "Wallet topped up successfully.",
      new_balance: 950.0,
    })
  ),

  http.get(`${API}/students/:id/payments`, () =>
    HttpResponse.json(paymentsFixture)
  ),

  http.get(`${API}/students/:id/orders`, () =>
    HttpResponse.json({ data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } })
  ),

  http.patch(`${API}/students/:studentId/payments/:paymentId`, () =>
    HttpResponse.json({ ...paymentsFixture[1], status: "paid" })
  ),

  http.patch(`${API}/students/:studentId/payments/:paymentId/amount`, () =>
    HttpResponse.json({ id: 2, status: "unpaid", amount: "2500.00" })
  ),

  http.post(`${API}/students/:id/credit/settle`, () =>
    HttpResponse.json({
      message: "Credit balance settled.",
      amount_settled: 135.0,
    })
  ),

  // System Configurations
  http.get(`${API}/system-configurations`, () =>
    HttpResponse.json(systemConfigsFixture)
  ),

  http.put(`${API}/system-configurations/:key`, () =>
    HttpResponse.json({
      key: "daily_meal_rate",
      value: "150",
      type: "decimal",
      label: "Daily Meal Rate (₱)",
      description: "Daily rate used to compute monthly subscription amounts when no override is set.",
    } satisfies SystemConfiguration)
  ),
];
