export interface Parent {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_activated: boolean;
  students_count: number;
  students: {
    id: number;
    student_number: string;
    full_name: string;
  }[];
}

export interface ParentDetail extends Omit<Parent, "students"> {
  address: string | null;
  profile_photo_url: string | null;
  created_at: string;
  students: {
    id: number;
    student_number: string;
    full_name: string;
    grade_level: string;
    branch_name: string;
    wallet_alert_threshold: number;
    linked_at: string;
  }[];
}

export interface PaginatedParents {
  data: Parent[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}
