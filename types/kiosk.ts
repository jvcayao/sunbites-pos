export interface KioskOrder {
  items: string;
  total: string;
  date: string;
}

export interface KioskStudent {
  name: string;
  initials: string;
  grade_level: string;
  student_type: "subscription" | "non_subscription";
  balance: string;
  last_orders: KioskOrder[];
}
