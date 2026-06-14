import { apiClient } from "./client";

import type {
  CheckoutPayload,
  InlineReloadPayload,
  Order,
  PaginatedOrders,
  TransactionListParams,
  TransactionSummary,
  VoidPayload,
} from "@/types/order";

export const orderApi = {
  checkout: (payload: CheckoutPayload) =>
    apiClient.post<{ order: Order }>("/pos/checkout", payload),

  transactions: (params?: TransactionListParams) =>
    apiClient.get<{
      data: Order[];
      meta: PaginatedOrders["meta"];
      summary: TransactionSummary;
    }>("/pos/transactions", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  void: (orderId: number, payload: VoidPayload) =>
    apiClient.post<{ order: Order }>(
      `/pos/transactions/${orderId}/void`,
      payload,
    ),

  inlineReload: (payload: InlineReloadPayload) =>
    apiClient.post<{ message: string; new_balance: number }>(
      "/pos/inline-reload",
      payload,
    ),
};
