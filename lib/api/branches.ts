import { apiClient } from "./client";

import type { Branch } from "@/types/auth";

export const branchApi = {
  list: () => apiClient.get<Branch[]>("/branches"),
};
