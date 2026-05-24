import { apiClient } from "./client";

import type { MealPlannerResponse, SaveMealPlanPayload, SchoolMonthKey } from "@/types/meal-planner";

export const mealPlannerApi = {
  show: (month: SchoolMonthKey, week: number) =>
    apiClient.get<MealPlannerResponse>("/references/meal-planner", {
      params: { month, week },
    }),

  update: (payload: SaveMealPlanPayload) =>
    apiClient.patch<{ message: string }>("/references/meal-planner", payload),

  reset: (month: SchoolMonthKey, week: number) =>
    apiClient.post<{ message: string }>("/references/meal-planner/reset", { month, week }),
};
