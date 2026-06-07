export type StudentType = "subscription" | "non_subscription";
export type EnrollmentStatus = "enrolled" | "paused" | "unenrolled" | "banned" | "graduated";
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
export type PaymentStatus = "paid" | "unpaid";
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
}

export interface Student {
  id: number;
  branch_id: number;
  student_number: string;
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
  wallet_transactions: Array<{
    id: number;
    type: string;
    amount: number;
    balance_after: number;
    note: string | null;
    created_at: string;
  }>;
  activity_logs: Array<{
    id: number;
    description: string;
    causer: string;
    properties: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface EnrolledStudentResponse {
  id: number;
  full_name: string;
  student_number: string;
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
  student_number: string;
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
