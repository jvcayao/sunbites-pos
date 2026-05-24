import { apiClient } from "./client";

import type { CreateContactPayload, StudentContact, UpdateContactPayload } from "@/types/contact";

export const contactApi = {
  list: (studentId: number) =>
    apiClient
      .get<{ data: StudentContact[] }>(`/students/${studentId}/contacts`)
      .then((res) => res.data),

  create: (studentId: number, payload: CreateContactPayload) =>
    apiClient.post<StudentContact>(`/students/${studentId}/contacts`, payload),

  update: (studentId: number, contactId: number, payload: UpdateContactPayload) =>
    apiClient.put<StudentContact>(
      `/students/${studentId}/contacts/${contactId}`,
      payload
    ),

  remove: (studentId: number, contactId: number) =>
    apiClient.delete<void>(`/students/${studentId}/contacts/${contactId}`),

  resendActivation: (studentId: number, contactId: number) =>
    apiClient.post<{ message: string }>(
      `/students/${studentId}/contacts/${contactId}/resend-activation`
    ),
};
