import type { Branch } from "@/types/auth";

export interface AdminBranch extends Branch {
  address: string | null;
  gcash_number: string | null;
  is_active: boolean;
  staff_count: number;
  student_count: number;
  orders_today: number;
  deleted_at: string | null;
}

export interface UpdateBranchPayload {
  name: string;
  address?: string | null;
  gcash_number?: string | null;
}
