export type FeedbackCategory =
  | "FoodQuality"
  | "Service"
  | "PortionSize"
  | "Cleanliness"
  | "General";

export interface Feedback {
  id: number;
  student_id: number | null;
  branch_id: number;
  category: FeedbackCategory;
  message: string;
  admin_reply: string | null;
  replied_at: string | null;
  is_read: boolean;
  created_at: string;
  student: {
    id: number;
    full_name: string;
    student_number: string;
  } | null;
}

/** Response shape of POST /references/feedback/{id}/reply. */
export interface FeedbackReplyResponse {
  id: number;
  admin_reply: string;
  replied_at: string;
}

export interface PaginatedFeedback {
  data: Feedback[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}
