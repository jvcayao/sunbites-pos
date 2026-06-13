"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Square, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import type { EligibleParent } from "@/types/reminder";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ wasSent }: { wasSent: boolean }) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
        wasSent
          ? "bg-green-100 text-green-700 border-green-300"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      {wasSent ? "Sent ✓" : "Unsent"}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-8 w-16 rounded-md" /></td>
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

  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;
  const canSend = isAdmin || isManager;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["eligible-parents", search],
    queryFn: () => reminderApi.eligibleParents({ search: search || undefined }),
  });

  const parents = data?.data ?? [];
  const unsentParents = parents.filter((p) => !p.was_sent);

  const isAllSelected =
    unsentParents.length > 0 && unsentParents.every((p) => selectedIds.has(p.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unsentParents.map((p) => p.id)));
    }
  }

  function toggleRow(parent: EligibleParent) {
    if (parent.was_sent) return;
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
      queryClient.invalidateQueries({ queryKey: ["eligible-parents"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-bell-count"] });
    },
    onError: () => {
      toast.error("Failed to send reminders. Please try again.");
    },
  });

  function handleSendClick() {
    const ids = Array.from(selectedIds);
    const alreadySent = parents.filter((p) => ids.includes(p.id) && p.was_sent);

    if (alreadySent.length > 0) {
      setDuplicateNames(alreadySent.map((p) => p.full_name));
      setDuplicateDialog(true);
    } else {
      sendMutation.mutate({ ids });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Payment Reminders</h2>
          <p className="text-sm text-muted-foreground">
            Send payment reminders to parents with subscription students.
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

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search parents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {canSend && (
                <th className="px-4 py-3 w-10">
                  <button
                    type="button"
                    aria-label={isAllSelected ? "Deselect all" : "Select all unsent"}
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
                  colSpan={canSend ? 6 : 5}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No eligible parents found.
                </td>
              </tr>
            ) : (
              parents.map((parent) => {
                const isSelected = selectedIds.has(parent.id);
                return (
                  <tr
                    key={parent.id}
                    className={cn(
                      "border-b border-border transition-colors",
                      parent.was_sent
                        ? "opacity-50"
                        : "hover:bg-muted/30",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    {canSend && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-label={isSelected ? `Deselect ${parent.full_name}` : `Select ${parent.full_name}`}
                          onClick={() => toggleRow(parent)}
                          disabled={parent.was_sent}
                          className={cn("text-primary", parent.was_sent && "cursor-not-allowed opacity-40")}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Square className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{parent.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{parent.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {parent.subscription_students.map((s) => s.full_name).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge wasSent={parent.was_sent} />
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

      {/* Duplicate warning dialog */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already sent to some parents</DialogTitle>
            <DialogDescription>
              The following parents already received a reminder this month:
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
