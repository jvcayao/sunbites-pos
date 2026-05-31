import { apiClient } from "./client";

import type {
  MealPlannerResponse,
  SaveMealPlanPayload,
  SchoolMonthKey,
  UpdateWeekVisibilityResponse,
} from "@/types/meal-planner";

export const mealPlannerApi = {
  show: (month: SchoolMonthKey, week: number) =>
    apiClient.get<MealPlannerResponse>("/references/meal-planner", {
      params: { month, week },
    }),

  update: (payload: SaveMealPlanPayload) =>
    apiClient.patch<{ message: string }>("/references/meal-planner", payload),

  reset: (month: SchoolMonthKey, week: number) =>
    apiClient.post<{ message: string }>("/references/meal-planner/reset", { month, week }),

  updateWeekVisibility: (
    month: SchoolMonthKey,
    week: number,
    visibleToParents: boolean,
  ): Promise<UpdateWeekVisibilityResponse> =>
    apiClient.patch<UpdateWeekVisibilityResponse>(
      "/references/meal-planner/week-visibility",
      { month, week, visible_to_parents: visibleToParents },
    ),
};
