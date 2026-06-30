import { apiClient } from "./client";

import type { AnalyticsData, AnalyticsParams } from "@/types/analytics";

export const analyticsApi = {
  get: (params: AnalyticsParams) =>
    apiClient.get<AnalyticsData>("/reports/analytics", {
      params: params as unknown as Record<string, string | number | boolean | undefined>,
    }),
};
