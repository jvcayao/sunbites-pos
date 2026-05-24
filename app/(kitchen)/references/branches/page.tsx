"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { branchApi } from "@/lib/api/branches";
import { useAuthStore } from "@/lib/store/auth";

import type { AdminBranch } from "@/types/branch";
import type { ApiError } from "@/types/auth";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const editBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  gcash_number: z.string().max(20).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
});

type EditBranchForm = z.infer<typeof editBranchSchema>;

// ---------------------------------------------------------------------------
// Edit Branch Dialog
// ---------------------------------------------------------------------------

interface EditBranchDialogProps {
  branch: AdminBranch | null;
  onClose: () => void;
}

function EditBranchDialog({ branch, onClose }: EditBranchDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<EditBranchForm>({
    name: "",
    gcash_number: null,
    address: null,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  useEffect(() => {
    if (branch) {
      setValues({
        name: branch.name,
        gcash_number: branch.gcash_number ?? null,
        address: branch.address ?? null,
      });
      setErrors({});
    }
  }, [branch]);

  const mutation = useMutation({
    mutationFn: (data: EditBranchForm) =>
      branchApi.update(branch!.id, {
        name: data.name,
        gcash_number: data.gcash_number ?? null,
        address: data.address ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-admin"] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = editBranchSchema.safeParse(values);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(result.data);
  }

  return (
    <Dialog open={branch !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Branch: {branch?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">
              Branch Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="branch-name"
              value={values.name}
              onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "branch-name-error" : undefined}
            />
            {errors.name && (
              <p id="branch-name-error" role="alert" className="text-xs text-destructive">
                {errors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-gcash">GCash Number</Label>
            <Input
              id="branch-gcash"
              value={values.gcash_number ?? ""}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  gcash_number: e.target.value || null,
                }))
              }
              aria-invalid={!!errors.gcash_number}
              aria-describedby={errors.gcash_number ? "branch-gcash-error" : undefined}
            />
            {errors.gcash_number && (
              <p id="branch-gcash-error" role="alert" className="text-xs text-destructive">
                {errors.gcash_number[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address">Address</Label>
            <Input
              id="branch-address"
              value={values.address ?? ""}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  address: e.target.value || null,
                }))
              }
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "branch-address-error" : undefined}
            />
            {errors.address && (
              <p id="branch-address-error" role="alert" className="text-xs text-destructive">
                {errors.address[0]}
              </p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error != null && typeof (mutation.error as ApiError).message === "string"
                ? (mutation.error as ApiError).message
                : "An error occurred. Please try again."}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Branch Card
// ---------------------------------------------------------------------------

interface BranchCardProps {
  branch: AdminBranch;
  onEdit: (branch: AdminBranch) => void;
}

function BranchCard({ branch, onEdit }: BranchCardProps) {
  const queryClient = useQueryClient();
  const [toggleError, setToggleError] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: () => branchApi.toggle(branch.id),
    onSuccess: () => {
      setToggleError(null);
      queryClient.invalidateQueries({ queryKey: ["branches-admin"] });
    },
    onError: (err: ApiError) => {
      setToggleError(err.message ?? "Failed to update branch status.");
    },
  });

  function handleToggle() {
    const action = branch.is_active ? "deactivate" : "activate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this branch?`
    );
    if (!confirmed) return;
    setToggleError(null);
    toggleMutation.mutate();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">{branch.name}</h2>
        {branch.is_active ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </div>

      {/* Meta */}
      <div className="mt-3 space-y-1">
        <p className="text-sm text-muted-foreground">Slug: {branch.slug}</p>
        <p className="text-sm text-muted-foreground">
          GCash: {branch.gcash_number ?? "Not set"}
        </p>
        <p className="text-sm text-muted-foreground">
          Address: {branch.address ?? "No address"}
        </p>
      </div>

      {/* Stats row */}
      <p className="mt-3 text-sm font-semibold text-foreground">
        Staff: {branch.staff_count}&nbsp;&nbsp;·&nbsp;&nbsp;
        Students: {branch.student_count}&nbsp;&nbsp;·&nbsp;&nbsp;
        Orders Today: {branch.orders_today}
      </p>

      {/* Toggle error */}
      {toggleError && (
        <p className="mt-2 text-sm text-destructive">{toggleError}</p>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(branch)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
          className={
            branch.is_active
              ? "text-destructive hover:text-destructive"
              : "text-muted-foreground"
          }
        >
          {toggleMutation.isPending
            ? "Updating…"
            : branch.is_active
            ? "Deactivate"
            : "Activate"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function BranchCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-4 flex justify-end gap-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BranchesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [editingBranch, setEditingBranch] = useState<AdminBranch | null>(null);

  useEffect(() => {
    if (!user?.roles.includes("admin")) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branches-admin"],
    queryFn: () => branchApi.listForAdmin(),
    enabled: user?.roles.includes("admin") === true,
  });

  if (!user?.roles.includes("admin")) {
    return null;
  }

  return (
    <div className="p-6">
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-2xl font-bold text-foreground">Branch Management</h1>
      </div>

      {isError ? (
        <p className="mt-6 text-destructive">Failed to load branches.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <BranchCardSkeleton />
              <BranchCardSkeleton />
            </>
          ) : !data?.length ? (
            <p className="col-span-2 text-sm text-muted-foreground">No branches found.</p>
          ) : (
            data.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onEdit={setEditingBranch}
              />
            ))
          )}
        </div>
      )}

      <EditBranchDialog
        branch={editingBranch}
        onClose={() => setEditingBranch(null)}
      />
    </div>
  );
}
