export interface PreRegistrationSummary {
  id: number;
  student_name: string;
  enrollment_type: "subscription" | "non_subscription";
  status: "pending" | "approved" | "rejected" | "expired";
  submitted_at: string;
  expires_at: string;
  contact_name: string | null;
}

export interface PreRegistrationContact {
  id?: number;
  full_name: string;
  relationship: string;
  phone: string;
  address: string;
  email: string | null;
  is_primary: boolean;
}

export interface PreRegistrationDetail {
  id: number;
  branch_id: number;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string;
  section: string | null;
  birthday: string;
  enrollment_type: "subscription" | "non_subscription";
  allergies: string | null;
  notes: string | null;
  subscription_start_month: string | null;
  subscription_start_year: number | null;
  subscription_end_month: string | null;
  subscription_end_year: number | null;
  signatory_name: string;
  acknowledged_at: string;
  status: "pending" | "approved" | "rejected" | "expired";
  rejection_reason: string | null;
  processed_at: string | null;
  expires_at: string;
  recaptcha_score: string | null;
  submitter_ip: string | null;
  duplicate_warning: boolean;
  existing_student_name: string | null;
  contacts: PreRegistrationContact[];
  approved_by: string | null;
  rejected_by: string | null;
}

export interface PreRegistrationListParams {
  status?: "pending" | "approved" | "rejected" | "expired";
  enrollment_type?: "subscription" | "non_subscription";
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedPreRegistrations {
  data: PreRegistrationSummary[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApproveResponse {
  message: string;
  data: {
    id: number;
    student_number: string | null;
    full_name: string;
    qr_code: string;
  };
}
