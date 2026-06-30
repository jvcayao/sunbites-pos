"use client";

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { KpiCard } from "./kpi-card";
import { SectionWrapper } from "./section-wrapper";

import type { BillingSection } from "@/types/analytics";

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  data: BillingSection;
}

export function SectionBilling({ data }: Props) {
  const { kpis, monthly_trend, by_grade } = data;

  const rateAccent =
    kpis.collection_rate >= 80
      ? "success"
      : kpis.collection_rate >= 50
        ? "warning"
        : "danger";

  return (
    <SectionWrapper title="Billing">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard
          label="Collected"
          value={fmt(kpis.total_collected)}
          accent="success"
        />
        <KpiCard
          label="Outstanding"
          value={fmt(kpis.total_outstanding)}
          accent="danger"
        />
        <KpiCard label="Void" value={fmt(kpis.total_void)} accent="warning" />
        <KpiCard label="Subscribers" value={kpis.total_subscribers} />
        <KpiCard
          label="Collection Rate"
          value={`${kpis.collection_rate}%`}
          accent={rateAccent}
        />
        <KpiCard
          label="Discrepancies"
          value={kpis.discrepancy_count}
          accent={kpis.discrepancy_count > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Fully Paid"
          value={kpis.fully_paid_count}
          accent="success"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Monthly stacked bar */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm font-semibold">Monthly Payment Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Bar
                dataKey="paid_count"
                stackId="a"
                fill="#10b981"
                name="Paid"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="unpaid_count"
                stackId="a"
                fill="#ef4444"
                name="Unpaid"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="void_count"
                stackId="a"
                fill="#6b7280"
                name="Voided"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Collection rate area */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm font-semibold">Collection Rate Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                width={36}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => [`${v}%`, "Rate"]} />
              <ReferenceLine
                y={95}
                stroke="#10b981"
                strokeDasharray="4 2"
                label={{ value: "95%", position: "right", fontSize: 10 }}
              />
              <Area
                dataKey="collection_rate"
                stroke="#3b82f6"
                fill="#3b82f620"
                strokeWidth={2}
                name="Collection Rate"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* By grade stacked bar */}
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold">Payments by Grade</p>
          {by_grade.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No data
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Grade</th>
                    <th className="pb-2 pr-4 text-right font-medium text-green-600">
                      Paid
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium text-red-500">
                      Unpaid
                    </th>
                    <th className="pb-2 text-right font-medium text-gray-400">
                      Voided
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {by_grade.map((r) => (
                    <tr key={r.grade_level} className="tabular-nums">
                      <td className="py-1.5 pr-4">{r.grade_level}</td>
                      <td className="py-1.5 pr-4 text-right text-green-600">
                        {r.paid}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-red-500">
                        {r.unpaid}
                      </td>
                      <td className="py-1.5 text-right text-gray-400">
                        {r.void}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
