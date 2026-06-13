"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { reminderApi } from "@/lib/api/reminders";
import { cn } from "@/lib/utils";

import type { ReminderPaymentHistory, ReminderStudentDetail } from "@/types/reminder";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaymentStatusBadge({ status }: { status: ReminderPaymentHistory["status"] }) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
        status === "paid"
          ? "bg-green-100 text-green-700 border-green-300"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      {status === "paid" ? "Paid" : "Unpaid"}
    </span>
  );
}

function StudentPaymentTable({ student }: { student: ReminderStudentDetail }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {student.full_name}
        {student.student_number && (
          <span className="ml-2 text-muted-foreground font-normal">
            #{student.student_number}
          </span>
        )}
        <span className="ml-2 text-xs text-muted-foreground font-normal">
          {student.grade_level}
        </span>
      </h3>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {student.payment_history.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No payment records.
                </td>
              </tr>
            ) : (
              student.payment_history.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 capitalize">{p.school_month} {p.year}</td>
                  <td className="px-4 py-3">₱{p.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-PH") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ parentId: string }>;
}

export default function ReminderParentDetailPage({ params }: PageProps) {
  const { parentId } = use(params);
  const router = useRouter();

  const { data: parent, isLoading, isError } = useQuery({
    queryKey: ["reminder-parent", parentId],
    queryFn: () => reminderApi.parentDetail(Number(parentId)),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-lg border border-border p-6 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  if (isError || !parent) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Failed to load parent details.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 -ml-2">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </Button>

      {/* Parent info */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {parent.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold">{parent.full_name}</h2>
            <p className="text-sm text-muted-foreground">{parent.email}</p>
          </div>
        </div>
        {parent.phone && (
          <p className="text-sm text-muted-foreground">Phone: {parent.phone}</p>
        )}
      </div>

      {/* Payment history per student */}
      <div className="space-y-6">
        <h2 className="text-base font-semibold">Payment History</h2>
        {parent.students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscription students linked.</p>
        ) : (
          parent.students.map((student) => (
            <StudentPaymentTable key={student.id} student={student} />
          ))
        )}
      </div>
    </div>
  );
}
