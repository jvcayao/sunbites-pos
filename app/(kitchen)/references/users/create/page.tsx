"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { branchApi } from "@/lib/api/branches";
import { userApi } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createUserSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    middle_name: z.string().optional(),
    nickname: z.string().optional(),
    birthday: z.string().optional(),
    gender: z.enum(["male", "female", "other", ""]).optional(),
    civil_status: z.enum(["single", "married", "widowed", "separated", ""]).optional(),
    phone: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_relationship: z.string().optional(),
    address_line: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    zip_code: z.string().optional(),
    position: z.string().optional(),
    employment_type: z.enum(["full_time", "part_time", "contractual", ""]).optional(),
    date_hired: z.string().optional(),
    daily_rate: z.string().optional(),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    password_confirmation: z.string().min(1, "Please confirm the password"),
    role: z.string().min(1, "Role is required"),
    branch_ids: z.array(z.number()).optional(),
    sss_number: z.string().optional(),
    pagibig_number: z.string().optional(),
    philhealth_number: z.string().optional(),
    tin_number: z.string().optional(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

type FormData = z.infer<typeof createUserSchema>;

// ---------------------------------------------------------------------------
// Helpers
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateUserPage() {
  const viewer = useAuthStore((s) => s.user);
  const isAdmin = viewer?.roles.includes("admin") ?? false;

  const router = useRouter();
  const [values, setValues] = useState<Partial<FormData>>({ branch_ids: [] });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { data: branches = [], isError: isBranchError } = useQuery({
    queryKey: ["branches"],
    queryFn: branchApi.list,
  });

  const mutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: (user) => {
      router.push(`/references/users/${user.id}`);
    },
    onError: (err: ApiError) => {
      if (err.errors) setFieldErrors(err.errors);
    },
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBranch(branchId: number, checked: boolean) {
    setValues((prev) => {
      const ids = prev.branch_ids ?? [];
      return {
        ...prev,
        branch_ids: checked ? [...ids, branchId] : ids.filter((id) => id !== branchId),
      };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Normalize undefined string fields to "" so Zod min() errors show our messages
    const normalized = {
      ...values,
      first_name: values.first_name ?? "",
      last_name: values.last_name ?? "",
      email: values.email ?? "",
      password: values.password ?? "",
      password_confirmation: values.password_confirmation ?? "",
      role: values.role ?? "",
    };
    const result = createUserSchema.safeParse(normalized);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});

    const payload = { ...result.data };
    // Strip empty optional enum values
    if (!payload.gender) delete payload.gender;
    if (!payload.civil_status) delete payload.civil_status;
    if (!payload.employment_type) delete payload.employment_type;

    mutation.mutate(payload as Parameters<typeof userApi.create>[0]);
  }

  const inputClass = (field: string) =>
    cn(fieldErrors[field] && "border-destructive");

  return (
    <div className="p-6">
    <div className="mx-auto max-w-[720px] space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/references/users")}
        >
          ← Back to Users
        </Button>
      </div>
      <h1 className="text-xl font-bold text-foreground">Create New Staff Account</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* ---- Personal Information ---- */}
        <section>
          <SectionHeading>Personal Information</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First Name" required error={fieldErrors.first_name}>
              <Input
                value={values.first_name ?? ""}
                onChange={(e) => set("first_name", e.target.value)}
                className={inputClass("first_name")}
                aria-invalid={!!fieldErrors.first_name}
              />
            </FormField>
            <FormField label="Last Name" required error={fieldErrors.last_name}>
              <Input
                value={values.last_name ?? ""}
                onChange={(e) => set("last_name", e.target.value)}
                className={inputClass("last_name")}
                aria-invalid={!!fieldErrors.last_name}
              />
            </FormField>
            <FormField label="Middle Name" error={fieldErrors.middle_name}>
              <Input
                value={values.middle_name ?? ""}
                onChange={(e) => set("middle_name", e.target.value)}
              />
            </FormField>
            <FormField label="Nickname" error={fieldErrors.nickname}>
              <Input
                value={values.nickname ?? ""}
                onChange={(e) => set("nickname", e.target.value)}
              />
            </FormField>
            <FormField label="Birthday" error={fieldErrors.birthday}>
              <Input
                type="date"
                value={values.birthday ?? ""}
                onChange={(e) => set("birthday", e.target.value)}
              />
            </FormField>
            <FormField label="Gender" error={fieldErrors.gender}>
              <Select
                value={values.gender ?? ""}
                onValueChange={(v) => set("gender", v as FormData["gender"])}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Civil Status" error={fieldErrors.civil_status}>
              <Select
                value={values.civil_status ?? ""}
                onValueChange={(v) => set("civil_status", v as FormData["civil_status"])}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
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

        {/* ---- Contact Information ---- */}
        <section>
          <SectionHeading>Contact Information</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Phone" error={fieldErrors.phone}>
              <Input
                type="tel"
                value={values.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            </FormField>
            <FormField label="Emergency Contact Name" error={fieldErrors.emergency_contact_name}>
              <Input
                value={values.emergency_contact_name ?? ""}
                onChange={(e) => set("emergency_contact_name", e.target.value)}
              />
            </FormField>
            <FormField label="Emergency Contact Phone" error={fieldErrors.emergency_contact_phone}>
              <Input
                type="tel"
                value={values.emergency_contact_phone ?? ""}
                onChange={(e) => set("emergency_contact_phone", e.target.value)}
              />
            </FormField>
            <FormField label="Relationship" error={fieldErrors.emergency_contact_relationship}>
              <Input
                value={values.emergency_contact_relationship ?? ""}
                onChange={(e) => set("emergency_contact_relationship", e.target.value)}
              />
            </FormField>
          </div>
        </section>

        {/* ---- Address ---- */}
        <section>
          <SectionHeading>Address</SectionHeading>
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Address Line" error={fieldErrors.address_line}>
              <Textarea
                rows={2}
                value={values.address_line ?? ""}
                onChange={(e) => set("address_line", e.target.value)}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="City" error={fieldErrors.city}>
                <Input
                  value={values.city ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                />
              </FormField>
              <FormField label="Province" error={fieldErrors.province}>
                <Input
                  value={values.province ?? ""}
                  onChange={(e) => set("province", e.target.value)}
                />
              </FormField>
              <FormField label="Zip Code" error={fieldErrors.zip_code}>
                <Input
                  value={values.zip_code ?? ""}
                  onChange={(e) => set("zip_code", e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </section>

        {/* ---- Employment ---- */}
        <section>
          <SectionHeading>Employment</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Position (Job Title)" error={fieldErrors.position}>
              <Input
                value={values.position ?? ""}
                onChange={(e) => set("position", e.target.value)}
              />
            </FormField>
            <FormField label="Employment Type" error={fieldErrors.employment_type}>
              <Select
                value={values.employment_type ?? ""}
                onValueChange={(v) => set("employment_type", v as FormData["employment_type"])}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
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
                value={values.date_hired ?? ""}
                onChange={(e) => set("date_hired", e.target.value)}
              />
            </FormField>
            <FormField label="Daily Rate (₱)" error={fieldErrors.daily_rate}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.daily_rate ?? ""}
                onChange={(e) => set("daily_rate", e.target.value)}
              />
            </FormField>
          </div>
        </section>

        {/* ---- Account ---- */}
        <section>
          <SectionHeading>Account</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Email Address" required error={fieldErrors.email} >
              <Input
                type="email"
                autoComplete="off"
                value={values.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                className={cn("sm:col-span-2", inputClass("email"))}
                aria-invalid={!!fieldErrors.email}
              />
            </FormField>
            <FormField label="Password" required error={fieldErrors.password}>
              <Input
                type="password"
                autoComplete="new-password"
                value={values.password ?? ""}
                onChange={(e) => set("password", e.target.value)}
                className={inputClass("password")}
                aria-invalid={!!fieldErrors.password}
              />
            </FormField>
            <FormField label="Confirm Password" required error={fieldErrors.password_confirmation}>
              <Input
                type="password"
                autoComplete="new-password"
                value={values.password_confirmation ?? ""}
                onChange={(e) => set("password_confirmation", e.target.value)}
                className={inputClass("password_confirmation")}
                aria-invalid={!!fieldErrors.password_confirmation}
              />
            </FormField>
            <FormField label="Role" required error={fieldErrors.role}>
              <Select value={values.role ?? ""} onValueChange={(v) => set("role", v ?? "")}>
                <SelectTrigger aria-invalid={!!fieldErrors.role}>
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

        {/* ---- Government IDs ---- */}
        <section>
          <SectionHeading>Government IDs</SectionHeading>
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>These fields are optional. Fill in when documents are available.</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="SSS Number" error={fieldErrors.sss_number}>
              <Input
                value={values.sss_number ?? ""}
                onChange={(e) => set("sss_number", e.target.value)}
              />
            </FormField>
            <FormField label="Pag-IBIG Number" error={fieldErrors.pagibig_number}>
              <Input
                value={values.pagibig_number ?? ""}
                onChange={(e) => set("pagibig_number", e.target.value)}
              />
            </FormField>
            <FormField label="PhilHealth Number" error={fieldErrors.philhealth_number}>
              <Input
                value={values.philhealth_number ?? ""}
                onChange={(e) => set("philhealth_number", e.target.value)}
              />
            </FormField>
            <FormField label="TIN Number (BIR)" error={fieldErrors.tin_number}>
              <Input
                value={values.tin_number ?? ""}
                onChange={(e) => set("tin_number", e.target.value)}
              />
            </FormField>
          </div>
        </section>

        {/* ---- Branch Assignment ---- */}
        <section>
          <SectionHeading>Branch Assignment</SectionHeading>
          {isBranchError ? (
            <p className="text-sm text-destructive">Failed to load branches.</p>
          ) : branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading branches…</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                >
                  <Checkbox
                    checked={(values.branch_ids ?? []).includes(branch.id)}
                    onCheckedChange={(checked) => toggleBranch(branch.id, !!checked)}
                  />
                  <span className="text-sm font-medium text-foreground">{branch.name}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* ---- Actions ---- */}
        {mutation.isError && !Object.keys(fieldErrors).length && (
          <p className="text-sm text-destructive">
            {(mutation.error as ApiError)?.message ?? "An error occurred. Please try again."}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/references/users")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Staff Account"}
          </Button>
        </div>
      </form>
    </div>
    </div>
  );
}
