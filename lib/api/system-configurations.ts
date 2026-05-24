import { apiClient } from "./client";

import type { SystemConfiguration } from "@/types/system-configuration";

export const systemConfigApi = {
  list: () => apiClient.get<SystemConfiguration[]>("/system-configurations"),
  update: (key: string, value: string) =>
    apiClient.put<SystemConfiguration>(`/system-configurations/${key}`, { value }),
};
