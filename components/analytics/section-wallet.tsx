"use client";

import {
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

import type { WalletSection } from "@/types/analytics";

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  data: WalletSection;
}

export function SectionWallet({ data }: Props) {
  const { kpis, monthly_trend } = data;

  return (
    <SectionWrapper title="Wallet">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Credits"     value={fmt(kpis.total_credits)} accent="success" />
        <KpiCard label="Total Debits"      value={fmt(kpis.total_debits)}  accent="danger"  />
        <KpiCard label="Net Flow"          value={fmt(kpis.net_flow)}      accent={kpis.net_flow >= 0 ? "success" : "danger"} />
        <KpiCard label="Low Balance (<₱100)" value={kpis.low_balance_count} accent={kpis.low_balance_count > 0 ? "warning" : "default"} />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="mb-4 text-sm font-semibold">Credits vs Debits Trend</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthly_trend}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(v, name) => [fmt(v as number), name === "credits" ? "Credits" : name === "debits" ? "Debits" : "Net"]} />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Area dataKey="credits" stroke="#10b981" fill="#10b98120" strokeWidth={2} name="credits" />
            <Area dataKey="debits"  stroke="#ef4444" fill="#ef444420" strokeWidth={2} name="debits"  />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionWrapper>
  );
}
