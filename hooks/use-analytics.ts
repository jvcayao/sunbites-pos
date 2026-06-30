import { useQuery } from "@tanstack/react-query";

import { analyticsApi } from "@/lib/api/analytics";

import type { AnalyticsParams } from "@/types/analytics";

export function useAnalytics(params: AnalyticsParams) {
  return useQuery({
    queryKey: ["analytics", params],
    queryFn: () => analyticsApi.get(params),
  });
}
