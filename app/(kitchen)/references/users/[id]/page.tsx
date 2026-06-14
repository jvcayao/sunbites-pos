"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Info, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/users/role-badge";
import { branchApi } from "@/lib/api/branches";
import { userApi } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";
import type { StaffUser } from "@/types/user";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateUserSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: z.string().optional(),
  nickname: z.string().optional(),
  birthday: z.string().optional(),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  civil_status: z
    .enum(["single", "married", "widowed", "separated", ""])
    .optional(),
  phone: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  address_line: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip_code: z.string().optional(),
  position: z.string().optional(),
  employment_type: z
    .enum(["full_time", "part_time", "contractual", ""])
    .optional(),
  date_hired: z.string().optional(),
  daily_rate: z.string().optional(),
  email: z.string().email("Enter a valid email address"),
  role: z.string().min(1, "Role is required"),
  branch_ids: z.array(z.number()).optional(),
  sss_number: z.string().optional(),
  pagibig_number: z.string().optional(),
  philhealth_number: z.string().optional(),
  tin_number: z.string().optional(),
});

type EditFormData = z.infer<typeof updateUserSchema>;

function userToFormData(user: StaffUser): EditFormData {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    middle_name: user.middle_name ?? "",
    nickname: user.nickname ?? "",
    birthday: user.birthday ?? "",
    gender: (user.gender ?? "") as EditFormData["gender"],
    civil_status: (user.civil_status ?? "") as EditFormData["civil_status"],
    phone: user.phone ?? "",
    emergency_contact_name: user.emergency_contact_name ?? "",
    emergency_contact_phone: user.emergency_contact_phone ?? "",
    emergency_contact_relationship: user.emergency_contact_relationship ?? "",
    address_line: user.address_line ?? "",
    city: user.city ?? "",
    province: user.province ?? "",
    zip_code: user.zip_code ?? "",
    position: user.position ?? "",
    employment_type: (user.employment_type ??
      "") as EditFormData["employment_type"],
    date_hired: user.date_hired ?? "",
    daily_rate: user.daily_rate ?? "",
    email: user.email,
    role: user.roles[0] ?? "",
    branch_ids: user.branches.map((b) => b.id),
    sss_number: user.sss_number ?? "",
    pagibig_number: user.pagibig_number ?? "",
    philhealth_number: user.philhealth_number ?? "",
    tin_number: user.tin_number ?? "",
  };
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 border-b border-border pb-2 text-xs font-extrabold uppercase tracking-wider text-primary">
      {children}
    </h2>
  );
}

function FieldError({ error }: { error?: string[] }) {
  if (!error?.length) return null;
  return <p className="mt-1 text-xs text-destructive">{error[0]}</p>;
}

function FormField({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      <FieldError error={error} />
    </div>
  );
}

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          isActive ? "bg-green-500" : "bg-muted-foreground/40",
        )}
      />
      <span className={cn("text-sm", !isActive && "text-muted-foreground")}>
        {isActive ? "Active" : "Inactive"}
      </span>
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserDetailPage() {
  const viewer = useAuthStore((s) => s.user);
  const isAdmin = viewer?.roles.includes("admin") ?? false;

  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = Number(params.id);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [editValues, setEditValues] = useState<Partial<EditFormData>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => userApi.show(userId),
  });

  const { data: branches = [], isError: isBranchError } = useQuery({
    queryKey: ["branches"],
    queryFn: branchApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof userApi.update>[1]) =>
      userApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMode("view");
    },
    onError: (err: ApiError) => {
      if (err.errors) setFieldErrors(err.errors);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => userApi.deactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeactivateOpen(false);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => userApi.reactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const resetEmailMutation = useMutation({
    mutationFn: () => userApi.sendResetEmail(userId),
    onSuccess: () => setResetEmailSent(true),
  });

  function setField<K extends keyof EditFormData>(
    key: K,
    value: EditFormData[K],
  ) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBranch(branchId: number, checked: boolean) {
    setEditValues((prev) => {
      const ids = prev.branch_ids ?? [];
      return {
        ...prev,
        branch_ids: checked
          ? [...ids, branchId]
          : ids.filter((id) => id !== branchId),
      };
    });
  }

  function enterEditMode() {
    if (user) setEditValues(userToFormData(user));
    setFieldErrors({});
    setMode("edit");
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = {
      ...editValues,
      first_name: editValues.first_name ?? "",
      last_name: editValues.last_name ?? "",
      email: editValues.email ?? "",
      role: editValues.role ?? "",
    };
    const result = updateUserSchema.safeParse(normalized);
    if (!result.success) {
      setFieldErrors(
        result.error.flatten().fieldErrors as Record<string, string[]>,
      );
      return;
    }
    setFieldErrors({});

    const payload = { ...result.data };
    if (!payload.gender) delete payload.gender;
    if (!payload.civil_status) delete payload.civil_status;
    if (!payload.employment_type) delete payload.employment_type;

    updateMutation.mutate(payload as Parameters<typeof userApi.update>[1]);
  }

  if (isNaN(userId)) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-destructive">Invalid user ID.</p>
        </div>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="p-6">
        <DetailSkeleton />
      </div>
    );

  if (isError || !user) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-destructive">
            Failed to load user. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/references/users")}
          >
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const role = user.roles[0] ?? "cashier";
  const inputClass = (field: string) =>
    cn(fieldErrors[field] && "border-destructive");

  // ---- Edit mode ----
  if (mode === "edit") {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-[720px] space-y-6">
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("view")}
            >
              ← Back to Profile
            </Button>
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Edit {user.full_name}
          </h1>

          <form onSubmit={handleEditSubmit} noValidate className="space-y-8">
            {/* Personal Information */}
            <section>
              <SectionHeading>Personal Information</SectionHeading>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="First Name"
                  required
                  error={fieldErrors.first_name}
                >
                  <Input
                    value={editValues.first_name ?? ""}
                    onChange={(e) => setField("first_name", e.target.value)}
                    className={inputClass("first_name")}
                  />
                </FormField>
                <FormField
                  label="Last Name"
                  required
                  error={fieldErrors.last_name}
                >
                  <Input
                    value={editValues.last_name ?? ""}
                    onChange={(e) => setField("last_name", e.target.value)}
                    className={inputClass("last_name")}
                  />
                </FormField>
                <FormField label="Middle Name" error={fieldErrors.middle_name}>
                  <Input
                    value={editValues.middle_name ?? ""}
                    onChange={(e) => setField("middle_name", e.target.value)}
                  />
                </FormField>
                <FormField label="Nickname" error={fieldErrors.nickname}>
                  <Input
                    value={editValues.nickname ?? ""}
                    onChange={(e) => setField("nickname", e.target.value)}
                  />
                </FormField>
                <FormField label="Birthday" error={fieldErrors.birthday}>
                  <Input
                    type="date"
                    value={editValues.birthday ?? ""}
                    onChange={(e) => setField("birthday", e.target.value)}
                  />
                </FormField>
                <FormField label="Gender" error={fieldErrors.gender}>
                  <Select
                    value={editValues.gender ?? ""}
                    onValueChange={(v) =>
                      setField("gender", v as EditFormData["gender"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  label="Civil Status"
                  error={fieldErrors.civil_status}
                >
                  <Select
                    value={editValues.civil_status ?? ""}
                    onValueChange={(v) =>
                      setField(
                        "civil_status",
                        v as EditFormData["civil_status"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <SectionHeading>Contact Information</SectionHeading>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Phone" error={fieldErrors.phone}>
                  <Input
                    type="tel"
                    value={editValues.phone ?? ""}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Emergency Contact Name"
                  error={fieldErrors.emergency_contact_name}
                >
                  <Input
                    value={editValues.emergency_contact_name ?? ""}
                    onChange={(e) =>
                      setField("emergency_contact_name", e.target.value)
                    }
                  />
                </FormField>
                <FormField
                  label="Emergency Contact Phone"
                  error={fieldErrors.emergency_contact_phone}
                >
                  <Input
                    type="tel"
                    value={editValues.emergency_contact_phone ?? ""}
                    onChange={(e) =>
                      setField("emergency_contact_phone", e.target.value)
                    }
                  />
                </FormField>
                <FormField
                  label="Relationship"
                  error={fieldErrors.emergency_contact_relationship}
                >
                  <Input
                    value={editValues.emergency_contact_relationship ?? ""}
                    onChange={(e) =>
                      setField("emergency_contact_relationship", e.target.value)
                    }
                  />
                </FormField>
              </div>
            </section>

            {/* Address */}
            <section>
              <SectionHeading>Address</SectionHeading>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  label="Address Line"
                  error={fieldErrors.address_line}
                >
                  <Textarea
                    rows={2}
                    value={editValues.address_line ?? ""}
                    onChange={(e) => setField("address_line", e.target.value)}
                  />
                </FormField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField label="City" error={fieldErrors.city}>
                    <Input
                      value={editValues.city ?? ""}
                      onChange={(e) => setField("city", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Province" error={fieldErrors.province}>
                    <Input
                      value={editValues.province ?? ""}
                      onChange={(e) => setField("province", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Zip Code" error={fieldErrors.zip_code}>
                    <Input
                      value={editValues.zip_code ?? ""}
                      onChange={(e) => setField("zip_code", e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            </section>

            {/* Employment */}
            <section>
              <SectionHeading>Employment</SectionHeading>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Position (Job Title)"
                  error={fieldErrors.position}
                >
                  <Input
                    value={editValues.position ?? ""}
                    onChange={(e) => setField("position", e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Employment Type"
                  error={fieldErrors.employment_type}
                >
                  <Select
                    value={editValues.employment_type ?? ""}
                    onValueChange={(v) =>
                      setField(
                        "employment_type",
                        v as EditFormData["employment_type"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractual">Contractual</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Date Hired" error={fieldErrors.date_hired}>
                  <Input
                    type="date"
                    value={editValues.date_hired ?? ""}
                    onChange={(e) => setField("date_hired", e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Daily Rate (₱)"
                  error={fieldErrors.daily_rate}
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues.daily_rate ?? ""}
                    onChange={(e) => setField("daily_rate", e.target.value)}
                  />
                </FormField>
              </div>
            </section>

            {/* Account */}
            <section>
              <SectionHeading>Account</SectionHeading>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Email Address"
                  required
                  error={fieldErrors.email}
                >
                  <Input
                    type="email"
                    value={editValues.email ?? ""}
                    onChange={(e) => setField("email", e.target.value)}
                    className={inputClass("email")}
                  />
                </FormField>
                <FormField label="Role" required error={fieldErrors.role}>
                  <Select
                    value={editValues.role ?? ""}
                    onValueChange={(v) => setField("role", v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role…" />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </section>

            {/* Government IDs */}
            <section>
              <SectionHeading>Government IDs</SectionHeading>
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  These fields are optional. Fill in when documents are
                  available.
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="SSS Number" error={fieldErrors.sss_number}>
                  <Input
                    value={editValues.sss_number ?? ""}
                    onChange={(e) => setField("sss_number", e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Pag-IBIG Number"
                  error={fieldErrors.pagibig_number}
                >
                  <Input
                    value={editValues.pagibig_number ?? ""}
                    onChange={(e) => setField("pagibig_number", e.target.value)}
                  />
                </FormField>
                <FormField
                  label="PhilHealth Number"
                  error={fieldErrors.philhealth_number}
                >
                  <Input
                    value={editValues.philhealth_number ?? ""}
                    onChange={(e) =>
                      setField("philhealth_number", e.target.value)
                    }
                  />
                </FormField>
                <FormField
                  label="TIN Number (BIR)"
                  error={fieldErrors.tin_number}
                >
                  <Input
                    value={editValues.tin_number ?? ""}
                    onChange={(e) => setField("tin_number", e.target.value)}
                  />
                </FormField>
              </div>
            </section>

            {/* Branch Assignment */}
            <section>
              <SectionHeading>Branch Assignment</SectionHeading>
              {isBranchError ? (
                <p className="text-sm text-destructive">
                  Failed to load branches.
                </p>
              ) : branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Loading branches…
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {branches.map((branch) => (
                    <label
                      key={branch.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={(editValues.branch_ids ?? []).includes(
                          branch.id,
                        )}
                        onCheckedChange={(checked) =>
                          toggleBranch(branch.id, !!checked)
                        }
                      />
                      <span className="text-sm font-medium text-foreground">
                        {branch.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Submit */}
            {updateMutation.isError && !Object.keys(fieldErrors).length && (
              <p className="text-sm text-destructive">
                {(updateMutation.error as ApiError)?.message ??
                  "An error occurred. Please try again."}
              </p>
            )}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("view")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---- View mode ----
  return (
    <div className="p-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/references/users")}
        >
          ← Back to Users
        </Button>
      </div>

      {/* Header card */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {user.first_name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">
              {user.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={role} />
              <StatusDot isActive={user.is_active} />
            </div>
            {user.position && (
              <p className="text-sm text-muted-foreground">{user.position}</p>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.phone && (
              <p className="text-sm text-muted-foreground">{user.phone}</p>
            )}
            {user.date_hired && (
              <p className="text-xs text-muted-foreground">
                Hired {user.date_hired}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && <Button onClick={enterEditMode}>Edit</Button>}

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More actions"
                  />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setResetEmailSent(false);
                    resetEmailMutation.mutate();
                  }}
                  disabled={resetEmailMutation.isPending}
                >
                  {resetEmailSent ? "Reset email sent!" : "Send Reset Email"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.is_active ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeactivateOpen(true)}
                  >
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                  >
                    {reactivateMutation.isPending
                      ? "Reactivating…"
                      : "Reactivate"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Deactivate confirm dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deactivate {user.full_name}?</DialogTitle>
            <DialogDescription>
              This user will no longer be able to log in. You can reactivate
              them at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="flex-col">
        <TabsList className="w-full justify-start h-auto">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="govids">Gov&apos;t IDs</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-border">
                <InfoRow label="First Name" value={user.first_name} />
                <InfoRow label="Last Name" value={user.last_name} />
                <InfoRow label="Middle Name" value={user.middle_name} />
                <InfoRow label="Nickname" value={user.nickname} />
                <InfoRow label="Birthday" value={user.birthday} />
              </div>
              <div className="divide-y divide-border">
                <InfoRow label="Gender" value={user.gender} />
                <InfoRow
                  label="Civil Status"
                  value={user.civil_status?.replace(/_/g, " ")}
                />
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow
                  label="Emergency Contact"
                  value={user.emergency_contact_name}
                />
                <InfoRow
                  label="Emergency Phone"
                  value={user.emergency_contact_phone}
                />
              </div>
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <InfoRow
                label="Address"
                value={
                  [user.address_line, user.city, user.province, user.zip_code]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employment">
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-border">
                <InfoRow label="Position" value={user.position} />
                <InfoRow
                  label="Employment Type"
                  value={user.employment_type?.replace(/_/g, " ")}
                />
              </div>
              <div className="divide-y divide-border">
                <InfoRow label="Date Hired" value={user.date_hired} />
                <InfoRow
                  label="Daily Rate"
                  value={user.daily_rate ? `₱${user.daily_rate}` : null}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="govids">
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-border">
                <InfoRow label="SSS Number" value={user.sss_number} />
                <InfoRow label="Pag-IBIG Number" value={user.pagibig_number} />
              </div>
              <div className="divide-y divide-border">
                <InfoRow
                  label="PhilHealth Number"
                  value={user.philhealth_number}
                />
                <InfoRow label="TIN Number (BIR)" value={user.tin_number} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branches">
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            {user.branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No branches assigned.
              </p>
            ) : user.roles.includes("admin") ? (
              <p className="text-sm font-medium text-primary">
                All Branches (Admin)
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.branches.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
