import {
  LayoutDashboard,
  ShoppingCart,
  BarChart2,
  Users,
  Wallet,
  Package,
  FileText,
  Archive,
  CalendarDays,
  UserCog,
  GitBranch,
  ClipboardList,
  ClipboardCheck,
  Settings,
  UserRound,
  MessageSquare,
  Activity,
  CreditCard,
  Bell,
  Megaphone,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Enrollment", href: "/enrollment", icon: ClipboardList },
  {
    label: "Pre-Registrations",
    href: "/pre-registrations",
    icon: ClipboardCheck,
  },
  { label: "Students", href: "/students", icon: Users },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
];

export const reportsNav: NavItem[] = [
  { label: "Analytics", href: "/reports/analytics", icon: TrendingUp },
  { label: "Sales", href: "/reports/sales", icon: BarChart2 },
  { label: "Students", href: "/reports/students", icon: Users },
  { label: "Wallet", href: "/reports/wallet", icon: Wallet },
  { label: "Inventory", href: "/reports/inventory", icon: Package },
  { label: "Daily Summary", href: "/reports/daily-summary", icon: FileText },
  { label: "Billing", href: "/reports/billing", icon: ClipboardList },
  { label: "Credits", href: "/reports/credits", icon: CreditCard },
  { label: "Subscription", href: "/reports/subscription", icon: CalendarDays },
  { label: "Activity Log", href: "/reports/activity", icon: Activity },
];

export const referencesNav: NavItem[] = [
  { label: "Inventory", href: "/references/inventory", icon: Archive },
  {
    label: "Meal Planner",
    href: "/references/meal-planner",
    icon: CalendarDays,
  },
  {
    label: "Subscription Config",
    href: "/references/subscription-config",
    icon: CalendarDays,
  },
  { label: "Users", href: "/references/users", icon: UserCog },
  { label: "Branches", href: "/references/branches", icon: GitBranch },
  { label: "Parents", href: "/references/parents", icon: UserRound },
  { label: "Feedback", href: "/references/feedback", icon: MessageSquare },
  {
    label: "System Settings",
    href: "/references/system-settings",
    icon: Settings,
  },
];

export function getPageTitle(pathname: string): string {
  const all = [...mainNav, ...reportsNav, ...referencesNav];
  return (
    all.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "Dashboard"
  );
}
