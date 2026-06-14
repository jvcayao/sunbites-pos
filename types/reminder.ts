import type { SchoolMonth } from "./student";

export interface UnpaidPeriodStudent {
  id: number;
  full_name: string;
  student_number: string | null;
  amount: number;
}

export interface UnpaidPeriod {
  school_month: string;
  year: number;
  was_sent: boolean;
  last_sent_at: string | null;
  send_count: number;
  total_amount: number;
  students: UnpaidPeriodStudent[];
}

export interface EligibleParent {
  id: number;
  full_name: string;
  email: string;
  total_send_count: number;
  has_overdue: boolean;
  unpaid_periods: UnpaidPeriod[];
}

export interface ReminderBellCount {
  count: number;
}

export interface ReminderSendResult {
  sent: number;
  skipped: number;
  skipped_names: string[];
}

export interface ReminderPaymentHistory {
  id: number;
  school_month: SchoolMonth;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_at: string | null;
}

export interface ReminderStudentDetail {
  id: number;
  full_name: string;
  student_number: string | null;
  grade_level: string;
  payment_history: ReminderPaymentHistory[];
}

export interface ReminderParentDetail {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_activated: boolean;
  students: ReminderStudentDetail[];
}

export type ReminderStatus = "all" | "unsent" | "partial" | "sent" | "overdue";

export interface EligibleParentsParams {
  search?: string;
  status?: ReminderStatus;
  school_month?: string;
  school_year?: number;
  per_page?: number;
  page?: number;
}
