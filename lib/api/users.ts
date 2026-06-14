import { apiClient } from "./client";

import type { PaginatedStaffUsers, StaffUser } from "@/types/user";

interface UserListParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

interface CreateUserPayload {
  first_name: string;
  last_name: string;
  middle_name?: string;
  nickname?: string;
  birthday?: string;
  gender?: string;
  civil_status?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  address_line?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  position?: string;
  employment_type?: string;
  date_hired?: string;
  daily_rate?: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  branch_ids?: number[];
  sss_number?: string;
  pagibig_number?: string;
  philhealth_number?: string;
  tin_number?: string;
}

type UpdateUserPayload = Omit<
  CreateUserPayload,
  "password" | "password_confirmation"
>;

export const userApi = {
  list: (params?: UserListParams) =>
    apiClient.get<PaginatedStaffUsers>("/users", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  show: (id: number) => apiClient.get<StaffUser>(`/users/${id}`),

  create: (data: CreateUserPayload) =>
    apiClient.post<StaffUser>("/users", data),

  update: (id: number, data: UpdateUserPayload) =>
    apiClient.put<StaffUser>(`/users/${id}`, data),

  deactivate: (id: number) =>
    apiClient.post<{ message: string }>(`/users/${id}/deactivate`),

  reactivate: (id: number) =>
    apiClient.post<StaffUser>(`/users/${id}/reactivate`),

  sendResetEmail: (id: number) =>
    apiClient.post<{ message: string }>(`/users/${id}/reset-password`),
};
