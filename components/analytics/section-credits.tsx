"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { KpiCard } from "./kpi-card";
import { SectionWrapper } from "./section-wrapper";

import type { CreditsSection } from "@/types/analytics";

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const RANGE_COLORS: Record<string, string> = {
  "₱1–₱100":   "#10b981",
  "₱101–₱200": "#f59e0b",
  "₱201–₱300": "#ef4444",
};

interface Props {
  data: CreditsSection;
}

export function SectionCredits({ data }: Props) {
  const { kpis, distribution } = data;

  const creditLimit = 300;

  return (
    <SectionWrapper title="Credits">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Total Credit Balance"
          value={fmt(kpis.total_credit_balance)}
          accent="danger"
        />
        <KpiCard
          label="Students on Credit"
          value={kpis.students_on_credit}
          accent={kpis.students_on_credit > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Avg Credit / Student"
          value={fmt(kpis.avg_credit_per_student)}
        />
        <KpiCard
          label={`Near Limit (≥₱${creditLimit * 0.8})`}
          value={kpis.near_limit_count}
          accent={kpis.near_limit_count > 0 ? "danger" : "default"}
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="mb-4 text-sm font-semibold">Credit Balance Distribution</p>
        {distribution.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No students currently on credit
          </p>
        ) : (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distribution}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Students"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((d, i) => (
                    <Cell
                      key={i}
                      fill={RANGE_COLORS[d.range] ?? "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ul className="shrink-0 space-y-2 text-sm">
              {distribution.map((d) => (
                <li key={d.range} className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: RANGE_COLORS[d.range] ?? "#6b7280" }}
                  />
                  <span>{d.range}</span>
                  <span className="text-muted-foreground tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
