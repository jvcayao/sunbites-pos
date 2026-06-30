"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from "recharts";

import { KpiCard } from "./kpi-card";
import { SectionWrapper } from "./section-wrapper";

import type { SalesSection } from "@/types/analytics";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  data: SalesSection;
}

export function SectionSales({ data }: Props) {
  const { kpis, revenue_trend, payment_methods, top_items, peak_hours } = data;

  return (
    <SectionWrapper title="Sales">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total Revenue"    value={fmt(kpis.total_revenue)}    accent="success" />
        <KpiCard label="Net Revenue"      value={fmt(kpis.net_revenue)}      accent="success" />
        <KpiCard label="Total Orders"     value={kpis.total_orders} />
        <KpiCard label="Avg Order Value"  value={fmt(kpis.avg_order_value)} />
        <KpiCard label="Total Discounts"  value={fmt(kpis.total_discounts)}  accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue + Orders trend */}
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Revenue &amp; Orders Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={revenue_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="rev" orientation="left"  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} width={30} />
              <Tooltip
                formatter={(v, name) =>
                  name === "revenue" ? [fmt(v as number), "Revenue"] : [v, "Orders"]
                }
              />
              <Bar    yAxisId="rev" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="revenue" />
              <Line   yAxisId="ord" dataKey="orders"  stroke="#f59e0b" strokeWidth={2}     name="orders"  dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Payment methods donut */}
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Payment Methods</p>
          {payment_methods.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">No data</p>
          ) : (
            <div className="flex items-center gap-6">
              <PieChart width={160} height={160}>
                <Pie
                  data={payment_methods}
                  dataKey="count"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                >
                  {payment_methods.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
              </PieChart>
              <ul className="space-y-1">
                {payment_methods.map((m, i) => (
                  <li key={m.method} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="capitalize">{m.method}</span>
                    <span className="text-muted-foreground ml-1 tabular-nums">{m.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Top items */}
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Top Items by Quantity</p>
          {top_items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={top_items}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Peak hours */}
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Peak Hours (avg orders/day)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peak_hours}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} />
              <Tooltip formatter={(v) => [v, "Avg orders"]} />
              <Bar dataKey="avg_orders" radius={[4, 4, 0, 0]}>
                {peak_hours.map((h, i) => {
                  const isHighest =
                    h.avg_orders === Math.max(...peak_hours.map((x) => x.avg_orders));
                  return <Cell key={i} fill={isHighest ? "#f59e0b" : "#3b82f6"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionWrapper>
  );
}
