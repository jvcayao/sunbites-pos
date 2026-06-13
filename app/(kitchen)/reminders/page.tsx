"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Square, Search, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { reminderApi } from "@/lib/api/reminders";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { EligibleParent, ReminderStatus } from "@/types/reminder";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHOOL_MONTHS = [
  { value: "june", label: "June" },
  { value: "july", label: "July" },
  { value: "august", label: "August" },
  { value: "september", label: "September" },
  { value: "october", label: "October" },
  { value: "november", label: "November" },
  { value: "december", label: "December" },
  { value: "january", label: "January" },
  { value: "february", label: "February" },
  { value: "march", label: "March" },
] as const;

const STATUS_PILLS: { value: ReminderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unsent", label: "Unsent" },
  { value: "partial", label: "Partial" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
];

function getSchoolYearOptions(): { value: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= currentYear - 2; y--) {
    years.push({ value: String(y), label: `S.Y. ${y}–${y + 1}` });
  }
  return years;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAllSent(parent: EligibleParent): boolean {
  return parent.unpaid_periods.length > 0 && parent.unpaid_periods.every((p) => p.was_sent);
}

function uniqueStudentNames(parent: EligibleParent): string {
  const seen = new Set<number>();
  const names: string[] = [];
  for (const period of parent.unpaid_periods) {
    for (const s of period.students) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        names.push(s.full_name);
      }
    }
  }
  return names.join(", ") || "—";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ parent }: { parent: EligibleParent }) {
  const allSent = isAllSent(parent);
  const partiallySent = !allSent && parent.total_send_count > 0;

  if (allSent) {
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-300">
        All Sent ✓
      </span>
    );
  }
  if (partiallySent) {
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-300">
        Partial ({parent.total_send_count}×)
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
      Unsent
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-4" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-16 rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RemindersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;
  const canSend = isAdmin || isManager;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReminderStatus>("all");
  const [schoolMonth, setSchoolMonth] = useState("all");
  const [schoolYear, setSchoolYear] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);

  const queryParams = {
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    school_month: schoolMonth !== "all" ? schoolMonth : undefined,
    school_year: schoolYear !== "all" ? Number(schoolYear) : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["eligible-parents", activeBranch?.id, queryParams],
    queryFn: () => reminderApi.eligibleParents(queryParams),
    enabled: !!activeBranch,
  });

  const parents = data?.data ?? [];
  const selectableParents = parents.filter((p) => !isAllSent(p));

  const isAllSelected =
    selectableParents.length > 0 && selectableParents.every((p) => selectedIds.has(p.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableParents.map((p) => p.id)));
    }
  }

  function toggleRow(parent: EligibleParent) {
    if (isAllSent(parent)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(parent.id)) {
        next.delete(parent.id);
      } else {
        next.add(parent.id);
      }
      return next;
    });
  }

  const sendMutation = useMutation({
    mutationFn: ({ ids, force }: { ids: number[]; force?: boolean }) =>
      reminderApi.send(ids, force),
    onSuccess: (result) => {
      toast.success(`Reminders sent to ${result.sent} parent${result.sent !== 1 ? "s" : ""}.`);
      setSelectedIds(new Set());
      setDuplicateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["eligible-parents", activeBranch?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminder-bell-count"] });
    },
    onError: () => {
      toast.error("Failed to send reminders. Please try again.");
    },
  });

  function handleSendClick() {
    const ids = Array.from(selectedIds);
    const partialOrSent = parents.filter(
      (p) => ids.includes(p.id) && p.total_send_count > 0
    );

    if (partialOrSent.length > 0) {
      setDuplicateNames(partialOrSent.map((p) => p.full_name));
      setDuplicateDialog(true);
    } else {
      sendMutation.mutate({ ids });
    }
  }

  const schoolYearOptions = getSchoolYearOptions();

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Payment Reminders</h2>
          <p className="text-sm text-muted-foreground">
            Send payment reminders to parents with unpaid subscription months.
          </p>
        </div>
        {canSend && selectedIds.size > 0 && (
          <Button
            onClick={handleSendClick}
            disabled={sendMutation.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => {
                setStatus(pill.value);
                setSelectedIds(new Set());
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                status === pill.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Dropdowns + search */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={schoolMonth}
            onValueChange={(v) => {
              setSchoolMonth(v ?? "all");
              setSelectedIds(new Set());
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="School month filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {SCHOOL_MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={schoolYear}
            onValueChange={(v) => {
              setSchoolYear(v ?? "all");
              setSelectedIds(new Set());
            }}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="School year filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {schoolYearOptions.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search parents…"
              value={search}
              onChange={(e) => {
                startTransition(() => setSearch(e.target.value));
              }}
              className="h-8 pl-9 text-xs w-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {canSend && (
                <th className="px-4 py-3 w-10">
                  <button
                    type="button"
                    aria-label={isAllSelected ? "Deselect all" : "Select all"}
                    onClick={toggleSelectAll}
                    className="text-primary"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Square className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Periods</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : parents.length === 0 ? (
              <tr>
                <td
                  colSpan={canSend ? 7 : 6}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No eligible parents found.
                </td>
              </tr>
            ) : (
              parents.map((parent) => {
                const allSent = isAllSent(parent);
                const isSelected = selectedIds.has(parent.id);
                return (
                  <tr
                    key={parent.id}
                    className={cn(
                      "border-b border-border transition-colors",
                      allSent ? "opacity-50" : "hover:bg-muted/30",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    {canSend && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-label={
                            isSelected
                              ? `Deselect ${parent.full_name}`
                              : `Select ${parent.full_name}`
                          }
                          onClick={() => toggleRow(parent)}
                          disabled={allSent}
                          className={cn(
                            "text-primary",
                            allSent && "cursor-not-allowed opacity-40"
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Square className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        {parent.has_overdue && (
                          <AlertTriangle
                            className="h-3.5 w-3.5 text-destructive shrink-0"
                            aria-label="Has overdue payments"
                          />
                        )}
                        {parent.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{parent.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {uniqueStudentNames(parent)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {parent.unpaid_periods.length} unpaid
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge parent={parent} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/reminders/${parent.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Re-send warning dialog */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already sent to some parents</DialogTitle>
            <DialogDescription>
              The following parents already received at least one reminder:
              <ul className="mt-2 list-disc pl-5 text-sm">
                {duplicateNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                sendMutation.mutate({ ids: Array.from(selectedIds), force: true })
              }
              disabled={sendMutation.isPending}
            >
              Send to all anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
