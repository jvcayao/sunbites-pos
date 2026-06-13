import type { SchoolMonth } from "./student";

export interface ReminderStudent {
  id: number;
  full_name: string;
  student_number: string | null;
  amount: number | null;
}

export interface EligibleParent {
  id: number;
  full_name: string;
  email: string;
  was_sent: boolean;
  sent_at: string | null;
  subscription_students: ReminderStudent[];
}

export interface ReminderBellCount {
  count: number;
  school_month: SchoolMonth | null;
  school_year: number | null;
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

export interface EligibleParentsParams {
  search?: string;
  per_page?: number;
  page?: number;
}
