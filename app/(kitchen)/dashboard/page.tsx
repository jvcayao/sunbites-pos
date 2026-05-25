"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UtensilsCrossed,
  DollarSign,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { reportApi } from "@/lib/api/reports";
import { cn } from "@/lib/utils";

import type { DashboardData } from "@/lib/api/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
}

function StatCard({ label, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", colorClass)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment badge
// ---------------------------------------------------------------------------

function PaymentBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = {
    cash: "bg-green-100 text-green-700 border-green-300",
    gcash: "bg-blue-100 text-blue-700 border-blue-300",
    wallet: "bg-purple-100 text-purple-700 border-purple-300",
    subscription: "bg-orange-100 text-orange-700 border-orange-300",
  };
  const cls = map[method.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize", cls)}>
      {method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Staff status badge
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
  Working: "bg-green-100 text-green-700 border-green-300",
  Off: "bg-muted text-muted-foreground border-border",
  OnLeave: "bg-blue-100 text-blue-700 border-blue-300",
  Emergency: "bg-red-100 text-red-700 border-red-300",
  OnBreak: "bg-yellow-100 text-amber-700 border-yellow-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", cls)}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Staff Roster Widget
// ---------------------------------------------------------------------------

interface StaffRosterWidgetProps {
  roster: DashboardData["staff_roster"];
}

function StaffRosterWidget({ roster }: StaffRosterWidgetProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) =>
      reportApi.updateStaffStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">Staff Roster</h2>
        <p className="text-xs text-muted-foreground">Update staff status</p>
      </div>
      <div className="divide-y divide-border">
        {roster.map((staff) => (
          <div key={staff.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {staff.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {staff.full_name}
              </p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {staff.roles.join(", ")}
              </p>
            </div>
            <StatusBadge status={staff.status} />
            <Select
              value={staff.status}
              onValueChange={(val) => {
                if (val) mutation.mutate({ userId: staff.id, status: val });
              }}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs" aria-label={`Status for ${staff.full_name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Working", "Off", "OnLeave", "Emergency", "OnBreak"].map(
                  (s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        ))}
        {roster.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No staff on roster.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Low Stock Widget
// ---------------------------------------------------------------------------

function LowStockWidget({ items }: { items: DashboardData["low_stock"] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50">
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <h2 className="font-semibold text-amber-800">Low Stock Alerts</h2>
        </div>
        <Link
          href="/references/inventory"
          className="text-xs font-medium text-amber-700 hover:underline"
        >
          Manage Inventory
        </Link>
      </div>
      <div className="divide-y divide-amber-200">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-amber-900">{item.name}</p>
              <p className="text-xs text-amber-700">
                {item.quantity} {item.unit} remaining
              </p>
            </div>
            <span
              className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                item.status === "out"
                  ? "bg-red-100 text-red-700 border-red-300"
                  : "bg-yellow-100 text-amber-700 border-yellow-300"
              )}
            >
              {item.status === "out" ? "OUT" : "LOW"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credit Alerts Widget
// ---------------------------------------------------------------------------

function CreditAlertsWidget({ alerts }: { alerts: DashboardData["credit_alerts"] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-300 bg-red-50">
      <div className="border-b border-red-200 px-4 py-3">
        <h2 className="font-semibold text-red-800">Outstanding Credit Alerts</h2>
        <p className="text-xs text-red-600">Students with unpaid credit</p>
      </div>
      <div className="divide-y divide-red-200">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-red-900">{alert.full_name}</p>
              <p className="text-xs text-red-700">{alert.grade_level}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-red-700">
                {formatPeso(alert.credit_balance)}
              </span>
              <Link
                href={`/students/${alert.id}`}
                className="text-xs font-medium text-red-600 hover:underline"
                aria-label={`View ${alert.full_name}'s profile`}
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top Items Widget
// ---------------------------------------------------------------------------

function TopItemsWidget({ items }: { items: DashboardData["top_items"] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">Top Items Today</h2>
        </div>
      </div>
      <ol className="divide-y divide-border" aria-label="Top selling items">
        {items.map((item, idx) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {item.name}
            </span>
            <span className="text-sm font-bold text-primary">
              {item.quantity_sold} sold
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No sales data yet.
          </li>
        )}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: reportApi.dashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">
          Failed to load dashboard. Please refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Students"
          value={data.total_students}
          icon={Users}
          colorClass="border-blue-200 bg-blue-50"
        />
        <StatCard
          label="Enrolled"
          value={data.enrolled_count}
          icon={UserCheck}
          colorClass="border-green-200 bg-green-50"
        />
        <StatCard
          label="Meals Today"
          value={data.meals_today}
          icon={UtensilsCrossed}
          colorClass="border-orange-200 bg-orange-50"
        />
        <StatCard
          label="Revenue Today"
          value={formatPeso(data.revenue_today)}
          icon={DollarSign}
          colorClass="border-purple-200 bg-purple-50"
        />
        <StatCard
          label="Walk-in Orders"
          value={data.walk_in_orders}
          icon={ShoppingBag}
          colorClass="border-amber-200 bg-amber-50"
        />
        <StatCard
          label="Wallet Orders"
          value={data.wallet_payment_orders}
          icon={Wallet}
          colorClass="border-teal-200 bg-teal-50"
        />
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold text-foreground">Today's Orders</h2>
          <p className="text-xs text-muted-foreground">10 most recent</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                Receipt #
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                Customer
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                Items
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                Payment
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.recent_orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No orders today yet.
                </td>
              </tr>
            ) : (
              data.recent_orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                    {order.receipt_number}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatTime(order.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    {order.student ?? (
                      <span className="text-muted-foreground italic">Walk-In</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate text-muted-foreground">
                    {order.items
                      .map((i) => `${i.name} ×${i.quantity}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <PaymentBadge method={order.payment_method} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {formatPeso(order.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StaffRosterWidget roster={data.staff_roster} />
        <TopItemsWidget items={data.top_items} />
        <div className="space-y-4">
          <LowStockWidget items={data.low_stock} />
          <CreditAlertsWidget alerts={data.credit_alerts} />
        </div>
      </div>
    </div>
  );
}
