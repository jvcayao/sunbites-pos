"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { preRegistrationApi } from "@/lib/api/pre-registrations";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected" | "expired";

const TABS: { value: Status; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const STATUS_COLORS: Record<Status, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PreRegistrationsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["pre-registrations", { status }],
    queryFn: () => preRegistrationApi.list({ status }),
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          Pre-Registrations
        </h2>
        <p className="text-sm text-muted-foreground">
          Review and process parent pre-registration submissions
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              status === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No {status} pre-registrations found.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Submitted
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/pre-registrations/${item.id}`)}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.student_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.contact_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.enrollment_type === "subscription"
                      ? "Subscription"
                      : "Non-Subscription"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_COLORS[item.status]
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(item.submitted_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(item.expires_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
