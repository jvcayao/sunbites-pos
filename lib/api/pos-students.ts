import { apiClient } from "./client";

import type { PosStudent, StudentLookupPayload, StudentLookupResult } from "@/types/order";

export const posStudentApi = {
  lookup: (payload: StudentLookupPayload) =>
    apiClient.post<StudentLookupResult>("/pos/students/lookup", payload),

  show: (studentId: number) =>
    apiClient.get<{ student: PosStudent }>(`/pos/students/${studentId}`),
};
