export type OrderPaymentMethod = "cash" | "gcash" | "wallet" | "subscription";
export type OrderStatus = "completed" | "voided";

export interface SubscriptionCategoryStatus {
  used: number;
  limit: number;
  remaining: number;
}

export interface SubscriptionMonthlyCategoryStatus {
  allocated: number;
  used: number;
  remaining: number;
}

export interface SubscriptionMonthlyStatus {
  month: string;
  year: number;
  categories: {
    meal: SubscriptionMonthlyCategoryStatus;
    snack: SubscriptionMonthlyCategoryStatus;
    drink: SubscriptionMonthlyCategoryStatus;
    extra: SubscriptionMonthlyCategoryStatus;
  };
}

export interface PosStudent {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  student_number: string;
  grade_level: string;
  section: string | null;
  has_photo: boolean;
  student_type: string;
  student_type_label: string;
  enrollment_status: string;
  enrollment_status_label: string;
  points: number;
  total_spent: string;
  credit_balance: string;
  wallet_balance: number;
  subscription_daily_status: {
    meal: SubscriptionCategoryStatus;
    snack: SubscriptionCategoryStatus;
    drink: SubscriptionCategoryStatus;
    extra: SubscriptionCategoryStatus;
  } | null;
  subscription_monthly_status: SubscriptionMonthlyStatus | null;
}

export interface PosStudentSearchResult {
  id: number;
  full_name: string;
  student_number: string;
  grade_level: string;
  section: string | null;
  has_photo: boolean;
  enrollment_status: string;
  enrollment_status_label: string;
}

export interface StudentLookupPayload {
  type: "qr" | "search";
  value: string;
}

export interface StudentLookupResult {
  student?: PosStudent;
  students?: PosStudentSearchResult[];
}

export interface OrderItem {
  id: number;
  pos_menu_item_id: number;
  name: string;
  price: string;
  quantity: number;
  line_total: string;
}

export interface OrderStudent {
  id: number;
  full_name: string;
  grade_level: string;
  section: string | null;
  wallet_balance: number;
  credit_balance: string;
  points: number;
}

export interface OrderCashier {
  id: number;
  name: string;
}

export interface Order {
  id: number;
  branch_id: number;
  student_id: number | null;
  cashier_id: number;
  receipt_number: string;
  payment_method: OrderPaymentMethod;
  payment_method_label: string;
  subtotal: string;
  discount_amount: string;
  discount_reason: string | null;
  total: string;
  amount_tendered: string | null;
  change_amount: string | null;
  reference_number: string | null;
  notes: string | null;
  is_credit: boolean;
  credit_amount: string;
  points_earned: number;
  status: OrderStatus;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  items?: OrderItem[];
  student?: OrderStudent | null;
  cashier?: OrderCashier | null;
}

export interface PaginatedOrders {
  data: Order[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface CheckoutItem {
  pos_menu_item_id: number;
  quantity: number;
}

export interface CheckoutPayload {
  student_id?: number;
  payment_method: OrderPaymentMethod;
  items: CheckoutItem[];
  notes?: string;
  /** The API derives the peso discount from these two; it rejects a precomputed amount. */
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  discount_reason?: string;
  amount_tendered?: number;
  reference_number?: string;
  use_credit?: boolean;
}

export interface VoidPayload {
  void_reason: string;
}

export interface InlineReloadPayload {
  student_id: number;
  amount: number;
  payment_method: "cash" | "gcash";
  reference_number?: string;
}

export interface TransactionListParams {
  date?: string;
  payment_method?: OrderPaymentMethod | "";
  student_search?: string;
  page?: number;
}

export interface TransactionSummary {
  total_transactions: number;
  total_revenue: string;
  walk_in_count: number;
}
