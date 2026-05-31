import { apiClient } from "./client";

export async function exportReport(
  path: string,
  params?: Record<string, string | number | undefined>,
  filename?: string
): Promise<void> {
  const filtered = params
    ? Object.fromEntries(
        Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      )
    : undefined;
  await apiClient.download(`/${path}/export`, filtered as Record<string, string | number | boolean | undefined>, filename);
}

// ---------------------------------------------------------------------------
// Dashboard types
// ---------------------------------------------------------------------------

export interface DashboardData {
  total_students: number;
  enrolled_count: number;
  meals_today: number;
  revenue_today: number;
  walk_in_orders: number;
  wallet_payment_orders: number;
  recent_orders: Array<{
    id: number;
    receipt_number: string;
    created_at: string;
    student: string | null;
    items: Array<{ name: string; quantity: number }>;
    payment_method: string | null;
    total: number;
  }>;
  low_stock: Array<{
    id: number;
    name: string;
    unit: string;
    quantity: number;
    restock_threshold: number;
    status: "out" | "low";
  }>;
  credit_alerts: Array<{
    id: number;
    full_name: string;
    grade_level: string;
    credit_balance: number;
  }>;
  top_items: Array<{ id: number; name: string; quantity_sold: number }>;
  staff_roster: Array<{
    id: number;
    full_name: string;
    roles: string[];
    status: "Working" | "Off" | "OnLeave" | "Emergency" | "OnBreak";
  }>;
}

// ---------------------------------------------------------------------------
// Report common types
// ---------------------------------------------------------------------------

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface SalesSummary {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  total_discounts: number;
  net_revenue: number;
}

export interface SalesOrder {
  id: number;
  receipt_number: string;
  created_at: string;
  student: { id: number; full_name: string } | null;
  cashier: { id: number; first_name: string; last_name: string };
  items: Array<{ name: string; quantity: number; price: number }>;
  payment_method: string;
  discount_amount: number;
  total: number;
}

export interface StudentReportRow {
  id: number;
  full_name: string;
  student_number: string;
  grade_level: string;
  section: string | null;
  status: string;
  wallet_balance: number;
  total_spent: number;
}

export interface StudentReportSummary {
  total: number;
  grade_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
}

export interface WalletReportRow {
  id: number;
  student_name: string;
  grade_level: string;
  current_balance: number;
  outstanding_credit: number;
  total_credited: number;
  total_debited: number;
  last_transaction: string | null;
}

export interface WalletSummary {
  total_credits: number;
  total_debits: number;
  net_movement: number;
  students_below_100: number;
}

export type InventoryReportStatus = "out" | "low" | "ok" | "over";

export interface InventoryReportRow {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  restock_threshold: number;
  overstock_threshold: number | null;
  cost_per_unit: number | null;
  status: InventoryReportStatus;
  updated_at: string;
}

export interface InventoryReportLog {
  id: number;
  item_name_snapshot: string;
  type: string;
  type_label: string;
  quantity_change: string;
  stock_after: string;
  reason: string;
  adjusted_by: string | null;
  created_at: string;
  order_id: number | null;
}

export interface InventoryDiscrepancyRow {
  inventory_item_id: number;
  item_name: string;
  adjustment_count: number;
  net_change: string;
  last_adjusted_at: string;
}

export interface InventoryReportFilters {
  from?: string;
  to?: string;
  type?: string;
  item_id?: number;
  status?: string;
  page?: number;
}

export interface ActivityLogRow {
  id: number;
  created_at: string;
  causer_name: string | null;
  description: string;
  log_name: string;
  subject_type: string | null;
  subject_id: number | null;
  properties: Record<string, unknown>;
}

export interface CreditRow {
  id: number;
  created_at: string;
  student: {
    id: number;
    full_name: string;
    student_number: string;
    grade_level: string;
  };
  type: "charged" | "settled" | "voided";
  amount: number;
  notes: string | null;
  performed_by: { first_name: string; last_name: string } | null;
}

export interface CreditSummary {
  total_charged: number;
  total_settled: number;
  total_voided: number;
  net_outstanding: number;
}

export interface BillingSummary {
  total_subscribers: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
}

export interface BillingPayment {
  id: number;
  school_month: string;
  year: number;
  status: "paid" | "unpaid";
  amount: number;
  recorded_at: string | null;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    grade_level: string;
    section: string | null;
    student_number: string;
  };
  recorder: { id: number; first_name: string; last_name: string } | null;
}

export interface DailySummaryData {
  date: string;
  total_orders: number;
  total_discounts: number;
  total_revenue: number;
  payment_breakdown: Array<{ method: string; count: number; amount: number }>;
  cashier_breakdown: Array<{ cashier_name: string; orders: number; amount: number }>;
  items_sold: Array<{ name: string; quantity_sold: number }>;
}

// ---------------------------------------------------------------------------
// API service
// ---------------------------------------------------------------------------

export const reportApi = {
  dashboard: () => apiClient.get<DashboardData>("/dashboard"),

  updateStaffStatus: (userId: number, status: string) =>
    apiClient.post<{ id: number; user_id: number; status: string }>(
      "/dashboard/staff-status",
      { user_id: userId, status }
    ),

  sales: (params: Record<string, string | number | boolean | undefined>) =>
    apiClient.get<{
      data: SalesOrder[];
      meta: PaginatedMeta;
      summary: SalesSummary;
    }>("/reports/sales", { params }),

  students: (params: Record<string, string | number | undefined>) =>
    apiClient.get<{
      data: StudentReportRow[];
      meta: PaginatedMeta;
      summary: StudentReportSummary;
    }>("/reports/students", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  wallet: (params: Record<string, string | undefined>) =>
    apiClient.get<{
      data: WalletReportRow[];
      meta: PaginatedMeta;
      summary: WalletSummary;
    }>("/reports/wallet", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  inventory: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get<{
      data: InventoryReportRow[];
      summary: { out_of_stock: number; below_threshold: number; over_stock: number };
      logs?: { data: InventoryReportLog[]; meta: PaginatedMeta };
      discrepancy?: InventoryDiscrepancyRow[];
    }>("/reports/inventory", { params }),

  dailySummary: (date?: string) =>
    apiClient.get<DailySummaryData>("/reports/daily-summary", {
      params: date ? { date } : undefined,
    }),

  activity: (params: Record<string, string | number | undefined>) =>
    apiClient.get<{ data: ActivityLogRow[]; meta: PaginatedMeta }>(
      "/reports/activity",
      { params: params as Record<string, string | number | boolean | undefined> }
    ),

  billing: (params: Record<string, string | number | undefined>) =>
    apiClient.get<{
      data: BillingPayment[];
      meta: PaginatedMeta;
      summary: BillingSummary;
    }>("/reports/billing", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  credits: (params: Record<string, string | number | undefined>) =>
    apiClient.get<{ data: CreditRow[]; meta: PaginatedMeta; summary: CreditSummary }>(
      "/reports/credits",
      { params: params as Record<string, string | number | boolean | undefined> }
    ),

};
