import { apiClient } from "./client";

export interface BranchSubscriptionConfig {
  meal_daily_limit: number;
  snack_daily_limit: number;
  drink_daily_limit: number;
  extra_daily_limit: number;
}

export const subscriptionConfigApi = {
  show: () => apiClient.get<BranchSubscriptionConfig>("/pos/subscription-config"),

  update: (data: BranchSubscriptionConfig) =>
    apiClient.put<BranchSubscriptionConfig>("/pos/subscription-config", data),
};
