"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ParentStatusBadge } from "@/components/parents/parent-status-badge";
import { parentApi } from "@/lib/api/parents";

import type { ApiError } from "@/types/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePositiveInt(raw: string | undefined | null): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n > 0 ? n : null;
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">
        {value ?? "—"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ParentDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const parentId = parsePositiveInt(rawId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: parent,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["parent", parentId],
    queryFn: () => parentApi.show(parentId!),
    enabled: parentId !== null,
  });

  const resendMutation = useMutation({
    mutationFn: () => parentApi.resendActivation(parentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent", parentId] });
      toast.success("Activation email resent.");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to resend activation email.");
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => parentApi.disable(parentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent", parentId] });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent access disabled.");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to disable parent.");
    },
  });

  const enableMutation = useMutation({
    mutationFn: () => parentApi.enable(parentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent", parentId] });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent access enabled. Activation email queued.");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to enable parent.");
    },
  });

  const destroyMutation = useMutation({
    mutationFn: () => parentApi.destroy(parentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent account deleted.");
      router.push("/references/parents");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to delete parent.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => parentApi.restore(parentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent", parentId] });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent account restored. Activation email queued.");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to restore parent.");
    },
  });

  const anyPending =
    resendMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending ||
    destroyMutation.isPending ||
    restoreMutation.isPending;

  if (parentId === null) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-destructive">Invalid parent ID.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !parent) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-destructive">
            Failed to load parent. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/references/parents")}
          >
            Back to Parents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/references/parents"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Parents
        </Link>

        <div className="flex items-center gap-2">
          {!parent.is_activated && !parent.deleted_at && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => resendMutation.mutate()}
              disabled={anyPending}
            >
              <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {resendMutation.isPending
                ? "Sending…"
                : "Resend Activation Email"}
            </Button>
          )}

          {!parent.is_disabled && !parent.deleted_at && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => disableMutation.mutate()}
              disabled={anyPending}
            >
              {disableMutation.isPending ? "Disabling…" : "Disable"}
            </Button>
          )}

          {parent.is_disabled && !parent.deleted_at && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => enableMutation.mutate()}
              disabled={anyPending}
            >
              {enableMutation.isPending ? "Enabling…" : "Enable"}
            </Button>
          )}

          {!parent.deleted_at && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={anyPending}
                  />
                }
              >
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete parent account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disable portal access and remove the account from
                    active lists. The account can be restored later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => destroyMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {destroyMutation.isPending ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {parent.deleted_at !== null && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => restoreMutation.mutate()}
              disabled={anyPending}
            >
              {restoreMutation.isPending ? "Restoring…" : "Restore"}
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {parent.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {parent.full_name}
              </h1>
              <ParentStatusBadge
                deletedAt={parent.deleted_at}
                isDisabled={parent.is_disabled}
                isActivated={parent.is_activated}
              />
            </div>
            <p className="text-sm text-muted-foreground">{parent.email}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-8 sm:grid-cols-2 divide-y divide-border">
          <InfoRow label="Phone" value={parent.phone} />
          <InfoRow label="Address" value={parent.address} />
          <InfoRow
            label="Member Since"
            value={new Date(parent.created_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          {parent.deleted_at && (
            <InfoRow
              label="Deleted At"
              value={new Date(parent.deleted_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          )}
        </div>
      </div>

      {/* Linked Students */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3 pb-2 border-b border-border">
          Linked Students ({parent.students.length})
        </h2>

        {parent.students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No linked students.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Student No.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Grade
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Branch
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Wallet Alert
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Linked At
                  </th>
                </tr>
              </thead>
              <tbody>
                {parent.students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-border hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {student.student_number}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {student.full_name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.grade_level}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.branch_name}
                    </td>
                    <td className="px-3 py-2">
                      PHP {student.wallet_alert_threshold.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(student.linked_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
