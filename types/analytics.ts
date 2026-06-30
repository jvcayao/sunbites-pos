export interface AnalyticsParams {
  from_month: string;
  from_year: number;
  to_month: string;
  to_year: number;
}

export interface AnalyticsPeriod {
  from_month: string;
  from_year: number;
  to_month: string;
  to_year: number;
  months: string[];
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export interface SalesKpis {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  total_discounts: number;
  net_revenue: number;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface PaymentMethodPoint {
  method: string;
  count: number;
  amount: number;
}

export interface TopItemPoint {
  name: string;
  quantity: number;
}

export interface PeakHourPoint {
  hour: string;
  avg_orders: number;
}

export interface SalesSection {
  kpis: SalesKpis;
  revenue_trend: RevenueTrendPoint[];
  payment_methods: PaymentMethodPoint[];
  top_items: TopItemPoint[];
  peak_hours: PeakHourPoint[];
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export interface StudentsKpis {
  total_students: number;
  enrolled: number;
  subscription_count: number;
  non_subscription_count: number;
  new_enrollments: number;
  subscription_upgrades: number;
  subscription_downgrades: number;
}

export interface GradeEnrollmentPoint {
  grade_level: string;
  enrolled: number;
}

export interface SwitchTrendPoint {
  label: string;
  upgrades: number;
  downgrades: number;
}

export interface StudentsSection {
  kpis: StudentsKpis;
  by_grade: GradeEnrollmentPoint[];
  switch_trend: SwitchTrendPoint[];
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export interface BillingKpis {
  total_collected: number;
  total_outstanding: number;
  total_void: number;
  total_subscribers: number;
  collection_rate: number;
  discrepancy_count: number;
  fully_paid_count: number;
}

export interface BillingMonthPoint {
  label: string;
  paid_count: number;
  unpaid_count: number;
  void_count: number;
  paid_amount: number;
  unpaid_amount: number;
  void_amount: number;
  collection_rate: number;
}

export interface BillingGradePoint {
  grade_level: string;
  paid: number;
  unpaid: number;
  void: number;
}

export interface BillingSection {
  kpis: BillingKpis;
  monthly_trend: BillingMonthPoint[];
  by_grade: BillingGradePoint[];
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export interface WalletKpis {
  total_credits: number;
  total_debits: number;
  net_flow: number;
  low_balance_count: number;
}

export interface WalletMonthPoint {
  label: string;
  credits: number;
  debits: number;
  net: number;
}

export interface WalletSection {
  kpis: WalletKpis;
  monthly_trend: WalletMonthPoint[];
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface CreditsKpis {
  total_credit_balance: number;
  students_on_credit: number;
  avg_credit_per_student: number;
  near_limit_count: number;
}

export interface CreditDistributionPoint {
  range: string;
  count: number;
}

export interface CreditsSection {
  kpis: CreditsKpis;
  distribution: CreditDistributionPoint[];
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryKpis {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  most_restocked_item: string | null;
  most_restocked_count: number;
}

export interface TopConsumedPoint {
  name: string;
  quantity: number;
  unit: string;
}

export interface StockEventPoint {
  label: string;
  low_events: number;
  out_events: number;
}

export interface InventorySection {
  kpis: InventoryKpis;
  top_consumed: TopConsumedPoint[];
  stock_events: StockEventPoint[];
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  period: AnalyticsPeriod;
  sales: SalesSection;
  students: StudentsSection;
  billing: BillingSection;
  wallet: WalletSection;
  credits: CreditsSection;
  inventory: InventorySection;
}
