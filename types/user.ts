export interface StaffUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  middle_name: string | null;
  nickname: string | null;
  email: string;
  birthday: string | null;
  gender: "male" | "female" | "other" | null;
  civil_status: "single" | "married" | "widowed" | "separated" | null;
  has_photo: boolean;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  address_line: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  position: string | null;
  employment_type: "full_time" | "part_time" | "contractual" | null;
  date_hired: string | null;
  daily_rate: string | null;
  is_active: boolean;
  roles: string[];
  branches: { id: number; name: string; slug: string }[];
  // Admin-only fields (conditionally present)
  sss_number?: string | null;
  pagibig_number?: string | null;
  philhealth_number?: string | null;
  tin_number?: string | null;
}

export interface PaginatedStaffUsers {
  data: StaffUser[];
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

export type UserRole = "admin" | "manager" | "supervisor" | "cashier";
