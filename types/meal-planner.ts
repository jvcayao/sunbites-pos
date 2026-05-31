export type SchoolMonthKey =
  | "june"
  | "july"
  | "august"
  | "september"
  | "october"
  | "november"
  | "december"
  | "january"
  | "february"
  | "march";

export type DayOfWeekKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type CategoryKey = "ulam" | "vegetables" | "fruit" | "soup" | "snacks";

export interface MealRow {
  day: DayOfWeekKey;
  day_label: string;
  ulam: string;
  vegetables: string;
  fruit: string;
  soup: string;
  snacks: string;
}

export interface MealPlannerResponse {
  days: MealRow[];
  visible_to_parents: boolean;
}

export interface SaveMealPlanPayload {
  month: SchoolMonthKey;
  week: number;
  rows: Array<{
    day: DayOfWeekKey;
    ulam: string;
    vegetables: string;
    fruit: string;
    soup: string;
    snacks: string;
  }>;
}

export interface UpdateWeekVisibilityResponse {
  visible_to_parents: boolean;
}
