"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { KpiCard } from "./kpi-card";
import { SectionWrapper } from "./section-wrapper";

import type { InventorySection } from "@/types/analytics";

interface Props {
  data: InventorySection;
}

export function SectionInventory({ data }: Props) {
  const { kpis, top_consumed, stock_events } = data;

  return (
    <SectionWrapper title="Inventory">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total Items"      value={kpis.total_items} />
        <KpiCard label="Low Stock"        value={kpis.low_stock_count}   accent={kpis.low_stock_count > 0 ? "warning" : "default"} />
        <KpiCard label="Out of Stock"     value={kpis.out_of_stock_count} accent={kpis.out_of_stock_count > 0 ? "danger" : "default"} />
        <KpiCard
          label="Most Restocked"
          value={kpis.most_restocked_item ?? "—"}
          sub={kpis.most_restocked_item ? `${kpis.most_restocked_count}× restocked` : undefined}
          className="lg:col-span-2"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top consumed items */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm font-semibold">Top Consumed Items</p>
          {top_consumed.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={top_consumed}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(v, _name, entry) => [
                    `${v} ${(entry.payload as { unit?: string }).unit ?? ""}`,
                    "Consumed",
                  ]}
                />
                <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stock event trend */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm font-semibold">Stock Events (Low / Out)</p>
          {stock_events.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stock_events}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="low_events" fill="#f59e0b" stackId="a" name="Low Stock"  radius={[0, 0, 0, 0]} />
                <Bar dataKey="out_events" fill="#ef4444" stackId="a" name="Out of Stock" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
