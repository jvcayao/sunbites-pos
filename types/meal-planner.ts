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

export interface MealRow {
  day: DayOfWeekKey;
  day_label: string;
  ulam: string;
  vegetables: string;
  fruit: string;
  soup: string;
}

export interface MealPlannerResponse {
  grid: MealRow[];
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
  }>;
}
