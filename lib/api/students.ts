import { apiClient } from "./client";
import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";
import type {
  BranchMonthlyAmountConfig,
  DowngradePreview,
  EnrolledStudentResponse,
  EnrollStudentPayload,
  MonthlyPayment,
  PaginatedStudents,
  RecordPaymentPayload,
  SchoolMonth,
  SchoolMonthDefault,
  CreditMutationResponse,
  SettleCreditPayload,
  Student,
  StudentLedgerParams,
  StudentLedgerResponse,
  StudentShowResponse,
  SubscriptionPeriodPayload,
  UpdateStatusPayload,
  UpdateStudentPayload,
  VoidWalletTopUpPayload,
  VoidWalletTopUpResponse,
  WaiveCreditPayload,
  WalletTopUpPayload,
} from "@/types/student";
import type { PaginatedOrders } from "@/types/order";

interface StudentListParams {
  search?: string;
  grade?: string;
  status?: string;
  type?: string;
  month?: SchoolMonth;
  payment_status?: string;
  year?: number;
  page?: number;
  deleted?: 1;
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

  restore: (id: number) => apiClient.post<Student>(`/students/${id}/restore`),

  regenerateQr: (id: number) =>
    apiClient.post<{ qr_code: string }>(`/students/${id}/regenerate-qr`),

  updateStatus: (id: number, payload: UpdateStatusPayload) =>
    apiClient.patch<Student>(`/students/${id}/status`, payload),

  updateType: (id: number, studentType: "subscription" | "non_subscription") =>
    apiClient.patch<Student>(`/students/${id}/type`, {
      student_type: studentType,
    }),

  downgradeSubscriptionPreview: (id: number) =>
    apiClient.get<DowngradePreview>(
      `/students/${id}/subscription-downgrade-preview`,
    ),

  downgradeSubscription: (id: number) =>
    apiClient.post<Student>(`/students/${id}/downgrade-subscription`),

  voidPayment: (studentId: number, paymentId: number, reason: string) =>
    apiClient.patch<MonthlyPayment>(
      `/students/${studentId}/payments/${paymentId}/void`,
      { reason },
    ),

  topUp: (id: number, payload: WalletTopUpPayload) =>
    apiClient.post<{ message: string; new_balance: number }>(
      `/students/${id}/wallet/top-up`,
      payload,
    ),

  voidTopUp: (
    studentId: number,
    walletTransactionId: number,
    payload: VoidWalletTopUpPayload,
  ) =>
    apiClient.post<VoidWalletTopUpResponse>(
      `/students/${studentId}/wallet/top-ups/${walletTransactionId}/void`,
      payload,
    ),

  /**
   * Record a payment against a student's outstanding credit.
   *
   * Open to ALL staff, including cashiers — the person taking the money at the
   * counter is usually a cashier. Every settlement records who performed it.
   *
   * Pass payment_method "wallet" to apply an existing wallet balance instead of
   * collecting new money; the API rejects it when the balance is short.
   */
  settleCredit: (id: number, payload: SettleCreditPayload) =>
    apiClient.post<CreditMutationResponse>(
      `/students/${id}/credit/settle`,
      payload,
    ),

  /**
   * Write off credit that will not be collected.
   *
   * AUTHORIZATION NOTE: admin only. The API enforces this with `role:admin`, but
   * callers must also hide the UI from non-admins — a waive destroys a
   * receivable rather than collecting it.
   */
  waiveCredit: (id: number, payload: WaiveCreditPayload) =>
    apiClient.post<CreditMutationResponse>(
      `/students/${id}/credit/waive`,
      payload,
    ),

  /**
   * The unified ledger: wallet movements and credit activity in one stream.
   * Replaces the `wallet_transactions` array that `show()` used to return.
   */
  ledger: (id: number, params?: StudentLedgerParams) =>
    apiClient.get<StudentLedgerResponse>(`/students/${id}/ledger`, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  orders: (id: number, page = 1) =>
    apiClient.get<PaginatedOrders>(`/students/${id}/orders`, {
      params: { page, per_page: 20 },
    }),

  payments: (id: number) =>
    apiClient.get<MonthlyPayment[]>(`/students/${id}/payments`),

  togglePayment: (studentId: number, paymentId: number) =>
    apiClient.patch<MonthlyPayment>(
      `/students/${studentId}/payments/${paymentId}`,
    ),

  updatePaymentAmount: (studentId: number, paymentId: number, amount: number) =>
    apiClient.patch<{ id: number; status: string; amount: string }>(
      `/students/${studentId}/payments/${paymentId}/amount`,
      { amount },
    ),

  recordPayment: (studentId: number, payload: RecordPaymentPayload) =>
    apiClient.post<MonthlyPayment>(`/students/${studentId}/payments`, payload),

  addSubscriptionRange: (
    studentId: number,
    payload: SubscriptionPeriodPayload,
  ) =>
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
  }) =>
    apiClient.post<BranchMonthlyAmountConfig>(
      "/branch-monthly-amounts",
      payload,
    ),

  updateBranchMonthlyAmount: (
    id: number,
    payload: { days: number; amount?: number },
  ) =>
    apiClient.put<BranchMonthlyAmountConfig>(
      `/branch-monthly-amounts/${id}`,
      payload,
    ),

  deleteBranchMonthlyAmount: (id: number) =>
    apiClient.delete<{ message: string }>(`/branch-monthly-amounts/${id}`),

  uploadPhoto: async (id: number, file: File): Promise<Student> => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;
    const { token, activeBranch } = useAuthStore.getState();
    const formData = new FormData();
    formData.append("photo", file);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBranch) headers["X-Branch-Id"] = String(activeBranch.id);

    const response = await fetch(`${BASE_URL}/students/${id}/photo`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw { message: "Session expired. Please log in again." } as ApiError;
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Photo upload failed." }));
      throw error as ApiError;
    }

    return response.json();
  },
};
