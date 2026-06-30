"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { KpiCard } from "./kpi-card";
import { SectionWrapper } from "./section-wrapper";

import type { StudentsSection } from "@/types/analytics";

interface Props {
  data: StudentsSection;
}

export function SectionStudents({ data }: Props) {
  const { kpis, by_grade, switch_trend } = data;

  const typeDist = [
    { name: "Subscription", value: kpis.subscription_count, fill: "#3b82f6" },
    {
      name: "Non-Subscription",
      value: kpis.non_subscription_count,
      fill: "#10b981",
    },
  ];

  return (
    <SectionWrapper title="Students">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Total" value={kpis.total_students} />
        <KpiCard label="Enrolled" value={kpis.enrolled} accent="success" />
        <KpiCard label="Subscription" value={kpis.subscription_count} />
        <KpiCard label="Non-Sub" value={kpis.non_subscription_count} />
        <KpiCard
          label="New (period)"
          value={kpis.new_enrollments}
          accent="success"
        />
        <KpiCard
          label="Upgrades"
          value={kpis.subscription_upgrades}
          accent="success"
        />
        <KpiCard
          label="Downgrades"
          value={kpis.subscription_downgrades}
          accent="warning"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Type distribution donut */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm font-semibold">
            Student Type Distribution
          </p>
          <div className="flex items-center gap-4">
            <PieChart width={140} height={140}>
              <Pie
                data={typeDist}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={65}
              >
                {typeDist.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
            <ul className="space-y-1 text-sm">
              {typeDist.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: d.fill }}
                  />
                  {d.name}
                  <span className="text-muted-foreground tabular-nums">
                    {d.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* By grade */}
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold">Enrolled by Grade</p>
          {by_grade.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={by_grade}>
                <XAxis dataKey="grade_level" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} />
                <Tooltip />
                <Bar dataKey="enrolled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Switch trend diverging bar */}
        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
          <p className="mb-4 text-sm font-semibold">
            Subscription Switch Trend
          </p>
          {switch_trend.every((p) => p.upgrades === 0 && p.downgrades === 0) ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No switches in this period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={switch_trend}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} />
                <Tooltip />
                <ReferenceLine y={0} stroke="#e5e7eb" />
                <Bar
                  dataKey="upgrades"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Upgrades"
                />
                <Bar
                  dataKey="downgrades"
                  fill="#ef4444"
                  radius={[0, 0, 4, 4]}
                  name="Downgrades"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
