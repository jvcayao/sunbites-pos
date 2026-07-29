export type StudentType = "subscription" | "non_subscription";
export type EnrollmentStatus =
  "enrolled" | "paused" | "unenrolled" | "banned" | "graduated";
export type SchoolMonth =
  | "june"
  | "july"
  | "august"
  | "september"
  | "october"
  | "november"
  | "december"
  | "january"
  | "february"
  | "march";
export type PaymentStatus = "paid" | "unpaid" | "voided";
export type WalletPaymentMethod = "cash" | "gcash" | "bank_transfer";

export interface StudentContact {
  id: number;
  full_name: string;
  relationship: string;
  phone: string;
  address: string;
  email: string;
  is_primary: boolean;
}

export interface MonthlyPayment {
  id: number;
  school_month: SchoolMonth;
  school_month_label: string;
  year: number;
  status: PaymentStatus;
  amount: string;
  recorded_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface DowngradePreviewMonth {
  id: number;
  school_month: SchoolMonth;
  year: number;
  amount: number;
  label: string;
}

export interface DowngradePreview {
  paid_months_retained: DowngradePreviewMonth[];
  paid_voidable_months: DowngradePreviewMonth[];
  unpaid_months_to_delete: string[];
  unpaid_months_to_delete_count: number;
  wallet_balance: number;
}

export interface Student {
  id: number;
  branch_id: number;
  student_number: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  grade_level: string;
  section: string | null;
  birthday: string;
  has_photo: boolean;
  photo_url: string | null;
  allergies: string | null;
  notes: string | null;
  qr_code: string;
  student_type: StudentType;
  student_type_label: string;
  enrollment_status: EnrollmentStatus;
  enrollment_status_label: string;
  enrollment_date: string;
  points: number;
  total_spent: string;
  credit_balance: string;
  wallet_balance?: number;
  contacts?: StudentContact[];
  monthly_payments?: MonthlyPayment[];
  deleted_at?: string | null;
}

export interface PaginatedStudents {
  data: Student[];
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

export interface StudentShowResponse {
  student: Student;
  activity_logs: Array<{
    id: number;
    description: string;
    causer_name: string | null;
    properties: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface EnrolledStudentResponse {
  id: number;
  full_name: string;
  student_number: string | null;
  student_type: StudentType;
  enrollment_date: string;
  qr_code: string;
  subscription_period: string | null;
}

export interface StudentContactInput {
  full_name: string;
  relationship: string;
  phone: string;
  address: string;
  email: string;
}

export interface EnrollStudentPayload {
  branch_id: number;
  student_number?: string | null;
  first_name: string;
  last_name: string;
  grade_level: string;
  section?: string;
  birthday: string;
  student_type: StudentType;
  allergies?: string;
  notes?: string;
  contacts: StudentContactInput[];
  signature: string;
  permission_meals: boolean;
  permission_dietary: boolean;
  // Subscription period — required when student_type === "subscription"
  subscription_start_month?: SchoolMonth;
  subscription_start_year?: number;
  subscription_end_month?: SchoolMonth;
  subscription_end_year?: number;
}

export interface SubscriptionPeriodPayload {
  subscription_start_month: SchoolMonth;
  subscription_start_year: number;
  subscription_end_month: SchoolMonth;
  subscription_end_year: number;
}

export interface BranchMonthlyAmountConfig {
  id: number | null;
  school_month: SchoolMonth;
  label: string;
  year: number;
  days: number;
  amount: number;
  is_configured: boolean;
}

export interface SchoolMonthDefault {
  month: SchoolMonth;
  label: string;
  days: number;
  default_amount: number;
}

export interface UpdateStudentPayload {
  first_name: string;
  last_name: string;
  student_number?: string | null;
  grade_level: string;
  section?: string;
  birthday: string;
  allergies?: string;
  notes?: string;
}

export interface UpdateStatusPayload {
  enrollment_status: EnrollmentStatus;
  reason?: string;
}

export interface WalletTopUpPayload {
  amount: number;
  payment_method: WalletPaymentMethod;
  reference_number?: string;
  note?: string;
}

export interface RecordPaymentPayload {
  school_month: SchoolMonth;
  year: number;
  amount: string;
}

// ---------------------------------------------------------------- credit (spec 14)

export type LedgerEntryType =
  | "deposit"
  | "withdraw"
  | "credit_charged"
  | "credit_settled"
  | "credit_waived"
  | "credit_voided";

export type CreditSettlementMethod =
  "cash" | "gcash" | "bank_transfer" | "wallet";

export type LedgerEntryFilter = "all" | "topup" | "purchase" | "credit";

export interface LedgerEntry {
  id: string;
  date: string;
  entry_type: LedgerEntryType;
  entry_label: string;
  direction: "debit" | "credit";
  amount: number;
  payment_method: CreditSettlementMethod | null;
  reference_number: string | null;
  note: string | null;
  performed_by: string | null;
}

export interface StudentLedgerResponse {
  data: LedgerEntry[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface StudentLedgerParams {
  entry_type?: LedgerEntryFilter;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface SettleCreditPayload {
  amount: number;
  payment_method: CreditSettlementMethod;
  reference_number?: string;
  note?: string;
}

export interface WaiveCreditPayload {
  amount: number;
  reason: string;
}

export interface CreditMutationResponse {
  message: string;
  amount_settled?: number;
  amount_waived?: number;
  credit_balance: number;
  wallet_balance: number;
  transaction: {
    id: string;
    date: string | null;
    type: string | null;
    amount: number;
    payment_method: CreditSettlementMethod | null;
    reference_number: string | null;
    note: string | null;
  };
}
