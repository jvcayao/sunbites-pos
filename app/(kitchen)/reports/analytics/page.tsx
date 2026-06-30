"use client";

import { useState } from "react";

import { AnalyticsFilterBar } from "@/components/analytics/analytics-filter-bar";
import { SectionBilling } from "@/components/analytics/section-billing";
import { SectionCredits } from "@/components/analytics/section-credits";
import { SectionInventory } from "@/components/analytics/section-inventory";
import { SectionSales } from "@/components/analytics/section-sales";
import { SectionStudents } from "@/components/analytics/section-students";
import { SectionWallet } from "@/components/analytics/section-wallet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";

import type { AnalyticsParams } from "@/types/analytics";

// ---------------------------------------------------------------------------
// Default: current school year (June of SY start → March of SY end)
// ---------------------------------------------------------------------------

function defaultParams(): AnalyticsParams {
  const now = new Date();
  const syStart = now.getMonth() + 1 >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from_month: "june",
    from_year:  syStart,
    to_month:   "march",
    to_year:    syStart + 1,
  };
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border bg-card p-6">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [params, setParams] = useState<AnalyticsParams>(defaultParams);

  const { data, isLoading, isError, error } = useAnalytics(params);

  return (
    <div className="space-y-6 p-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">Reports</p>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Branch-wide performance overview across all domains.
        </p>
      </div>

      {/* Sticky filter bar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 -mx-6 border-b px-6 py-3 backdrop-blur">
        <AnalyticsFilterBar params={params} onChange={setParams} />
      </div>

      {/* Period label */}
      {data && data.period.months.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {data.period.months[0]} — {data.period.months[data.period.months.length - 1]}
          &nbsp;·&nbsp;{data.period.months.length} month
          {data.period.months.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* States */}
      {isLoading && <AnalyticsSkeleton />}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load analytics.{" "}
          {error instanceof Error ? error.message : "Please try again."}
        </div>
      )}

      {/* Sections */}
      {data && (
        <div className="space-y-10">
          <SectionSales      data={data.sales}     />
          <SectionStudents   data={data.students}  />
          <SectionBilling    data={data.billing}   />
          <SectionWallet     data={data.wallet}    />
          <SectionCredits    data={data.credits}   />
          <SectionInventory  data={data.inventory} />
        </div>
      )}
    </div>
  );
}
