import { apiClient } from "@/lib/api/client";
import type {
  ApproveResponse,
  PaginatedPreRegistrations,
  PreRegistrationDetail,
  PreRegistrationListParams,
} from "@/types/pre-registration";

export const preRegistrationApi = {
  list: (params?: PreRegistrationListParams) =>
    apiClient.get<PaginatedPreRegistrations>("/pre-registrations", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  show: (id: number) =>
    apiClient.get<{ data: PreRegistrationDetail }>(`/pre-registrations/${id}`),

  update: (id: number, payload: Record<string, unknown>) =>
    apiClient.patch<{ message: string; data: PreRegistrationDetail }>(
      `/pre-registrations/${id}`,
      payload
    ),

  approve: (id: number) =>
    apiClient.post<ApproveResponse>(`/pre-registrations/${id}/approve`),

  reject: (id: number, rejectionReason: string) =>
    apiClient.post<{ message: string }>(`/pre-registrations/${id}/reject`, {
      rejection_reason: rejectionReason,
    }),

  reactivate: (id: number) =>
    apiClient.post<{ message: string }>(`/pre-registrations/${id}/reactivate`),
};
