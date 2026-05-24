import { apiClient } from "./client";

import type {
  BranchMonthlyAmountConfig,
  EnrolledStudentResponse,
  EnrollStudentPayload,
  MonthlyPayment,
  PaginatedStudents,
  RecordPaymentPayload,
  SchoolMonth,
  SchoolMonthDefault,
  Student,
  StudentShowResponse,
  SubscriptionPeriodPayload,
  UpdateStatusPayload,
  UpdateStudentPayload,
  WalletTopUpPayload,
} from "@/types/student";

interface StudentListParams {
  search?: string;
  grade?: string;
  status?: string;
  type?: string;
  month?: SchoolMonth;
  payment_status?: string;
  page?: number;
}

export const studentApi = {
  enrollmentFormData: () =>
    apiClient.get<{
      branches: Array<{ id: number; name: string; slug: string }>;
      grade_levels: string[];
      school_month_defaults: SchoolMonthDefault[];
    }>("/enrollment"),

  enroll: (payload: EnrollStudentPayload) =>
    apiClient.post<EnrolledStudentResponse>("/enrollment", payload),

  list: (params?: StudentListParams) =>
    apiClient.get<PaginatedStudents>("/students", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  show: (id: number) => apiClient.get<StudentShowResponse>(`/students/${id}`),

  update: (id: number, payload: UpdateStudentPayload) =>
    apiClient.put<Student>(`/students/${id}`, payload),

  destroy: (id: number) =>
    apiClient.delete<{ message: string }>(`/students/${id}`),

  regenerateQr: (id: number) =>
    apiClient.post<{ qr_code: string }>(`/students/${id}/regenerate-qr`),

  updateStatus: (id: number, payload: UpdateStatusPayload) =>
    apiClient.patch<Student>(`/students/${id}/status`, payload),

  topUp: (id: number, payload: WalletTopUpPayload) =>
    apiClient.post<{ message: string; new_balance: number }>(
      `/students/${id}/wallet/top-up`,
      payload
    ),

  /**
   * Settle outstanding credit for a student.
   *
   * AUTHORIZATION NOTE: This action must only be called from UI surfaces
   * that have already confirmed the user holds the "admin" or "manager" role.
   * The Laravel API enforces this server-side, but callers must also gate the
   * UI to prevent supervisors and cashiers from triggering this mutation.
   *
   * @example
   * // Correct usage — always check role before calling:
   * if (user?.roles.includes("admin") || user?.roles.includes("manager")) {
   *   await studentApi.settleCredit(studentId);
   * }
   */
  settleCredit: (id: number) =>
    apiClient.post<{ message: string; amount_settled: number }>(
      `/students/${id}/credit/settle`
    ),

  payments: (id: number) =>
    apiClient.get<MonthlyPayment[]>(`/students/${id}/payments`),

  togglePayment: (studentId: number, paymentId: number) =>
    apiClient.patch<MonthlyPayment>(
      `/students/${studentId}/payments/${paymentId}`
    ),

  updatePaymentAmount: (studentId: number, paymentId: number, amount: number) =>
    apiClient.patch<{ id: number; status: string; amount: string }>(
      `/students/${studentId}/payments/${paymentId}/amount`,
      { amount }
    ),

  recordPayment: (studentId: number, payload: RecordPaymentPayload) =>
    apiClient.post<MonthlyPayment>(`/students/${studentId}/payments`, payload),

  addSubscriptionRange: (studentId: number, payload: SubscriptionPeriodPayload) =>
    apiClient.post<{
      created: number;
      skipped: string[];
      payments: MonthlyPayment[];
    }>(`/students/${studentId}/payments/range`, payload),

  getBranchMonthlyAmounts: (year?: number) =>
    apiClient.get<BranchMonthlyAmountConfig[]>("/branch-monthly-amounts", {
      params: year ? { year } : undefined,
    }),

  createBranchMonthlyAmount: (payload: {
    school_month: SchoolMonth;
    year: number;
    days: number;
    amount?: number;
  }) => apiClient.post<BranchMonthlyAmountConfig>("/branch-monthly-amounts", payload),

  updateBranchMonthlyAmount: (id: number, payload: { days: number; amount?: number }) =>
    apiClient.put<BranchMonthlyAmountConfig>(
      `/branch-monthly-amounts/${id}`,
      payload
    ),

  deleteBranchMonthlyAmount: (id: number) =>
    apiClient.delete<{ message: string }>(`/branch-monthly-amounts/${id}`),
};
