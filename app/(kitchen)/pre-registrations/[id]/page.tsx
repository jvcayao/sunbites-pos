"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { preRegistrationApi } from "@/lib/api/pre-registrations";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type { PreRegistrationDetail } from "@/types/pre-registration";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_LEVELS = [
  "Nursery",
  "Kinder 1",
  "Kinder 2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

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
];

type PreRegStatus = "pending" | "approved" | "rejected" | "expired";

const STATUS_CONFIG: Record<
  PreRegStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  expired: {
    label: "Expired",
    icon: Clock,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

interface ContactCardProps {
  contact: PreRegistrationDetail["contacts"][number];
}

function ContactCard({ contact }: ContactCardProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {contact.full_name}
        </span>
        <div className="flex items-center gap-2">
          {contact.is_primary && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Primary
            </span>
          )}
          <span className="text-xs text-muted-foreground capitalize">
            {contact.relationship}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{contact.phone}</span>
        {contact.email && <span>{contact.email}</span>}
        {contact.address && (
          <span className="col-span-2">{contact.address}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form state type
// ---------------------------------------------------------------------------

type EditableFields = Pick<
  PreRegistrationDetail,
  | "first_name"
  | "last_name"
  | "grade_level"
  | "section"
  | "birthday"
  | "allergies"
  | "notes"
  | "subscription_start_month"
  | "subscription_start_year"
  | "subscription_end_month"
  | "subscription_end_year"
>;

function buildEditableFields(detail: PreRegistrationDetail): EditableFields {
  return {
    first_name: detail.first_name,
    last_name: detail.last_name,
    grade_level: detail.grade_level,
    section: detail.section,
    birthday: detail.birthday,
    allergies: detail.allergies,
    notes: detail.notes,
    subscription_start_month: detail.subscription_start_month,
    subscription_start_year: detail.subscription_start_year,
    subscription_end_month: detail.subscription_end_month,
    subscription_end_year: detail.subscription_end_year,
  };
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PreRegistrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") ?? false;
  const isManager = user?.roles.includes("manager") ?? false;
  const isSupervisor = user?.roles.includes("supervisor") ?? false;
  const canEdit = isAdmin || isManager || isSupervisor;
  const canActOnPending = isAdmin || isManager;

  const [fields, setFields] = useState<EditableFields | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["pre-registration", id],
    queryFn: () => preRegistrationApi.show(id),
    enabled: !Number.isNaN(id),
  });

  const detail = data?.data ?? null;
  const isPending = detail?.status === "pending";
  const isExpired = detail?.status === "expired";
  const isEditable = isPending && canEdit;

  // Initialise edit fields once detail loads
  if (detail && fields === null) {
    setFields(buildEditableFields(detail));
  }

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      preRegistrationApi.update(id, payload),
    onSuccess: (res) => {
      toast.success("Changes saved.");
      setFields(buildEditableFields(res.data));
      void queryClient.invalidateQueries({
        queryKey: ["pre-registration", id],
      });
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to save changes.");
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => preRegistrationApi.approve(id),
    onSuccess: (res) => {
      toast.success(res.message ?? "Pre-registration approved.");
      router.push(`/students/${res.data.id}`);
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to approve pre-registration.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => preRegistrationApi.reject(id, reason),
    onSuccess: () => {
      toast.success("Pre-registration rejected.");
      setRejectDialogOpen(false);
      setRejectionReason("");
      void queryClient.invalidateQueries({
        queryKey: ["pre-registration", id],
      });
      void queryClient.invalidateQueries({ queryKey: ["pre-registrations"] });
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to reject pre-registration.");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => preRegistrationApi.reactivate(id),
    onSuccess: () => {
      toast.success("Pre-registration reactivated.");
      void queryClient.invalidateQueries({
        queryKey: ["pre-registration", id],
      });
      void queryClient.invalidateQueries({ queryKey: ["pre-registrations"] });
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to reactivate pre-registration.");
    },
  });

  function handleSave() {
    if (!fields) return;
    const payload: Record<string, unknown> = {};
    Object.entries(fields).forEach(([k, v]) => {
      payload[k] = v ?? null;
    });
    updateMutation.mutate(payload);
  }

  function setField<K extends keyof EditableFields>(
    key: K,
    value: EditableFields[K],
  ) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (isLoading || !fields) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load pre-registration details.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[detail.status];
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <div className="p-6">
        {/* Back + header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/pre-registrations")}
              className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Pre-Registrations
            </button>
            <h2 className="text-xl font-bold text-foreground">
              {detail.first_name} {detail.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Submitted {formatDate(detail.acknowledged_at)} · Expires{" "}
              {formatDate(detail.expires_at)}
            </p>
          </div>

          {/* Status badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize",
              statusConfig.className,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {statusConfig.label}
          </span>
        </div>

        {/* Duplicate warning */}
        {detail.duplicate_warning && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Potential duplicate detected
              </p>
              {detail.existing_student_name && (
                <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                  An existing student named &ldquo;
                  {detail.existing_student_name}&rdquo; was found. Review
                  carefully before approving.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {detail.status === "rejected" && detail.rejection_reason && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              Rejection reason
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              {detail.rejection_reason}
            </p>
            {detail.rejected_by && (
              <p className="mt-1 text-xs text-red-600/70 dark:text-red-500/70">
                Rejected by {detail.rejected_by}
                {detail.processed_at
                  ? ` on ${formatDate(detail.processed_at)}`
                  : ""}
              </p>
            )}
          </div>
        )}

        {/* Approved info */}
        {detail.status === "approved" && detail.approved_by && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Approved by {detail.approved_by}
              {detail.processed_at
                ? ` on ${formatDate(detail.processed_at)}`
                : ""}
            </p>
            {detail.student_number && (
              <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
                Student number assigned: {detail.student_number}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: editable student info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Student Details */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Student Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name">
                  <Input
                    value={fields.first_name}
                    onChange={(e) => setField("first_name", e.target.value)}
                    disabled={!isEditable}
                    className="h-9"
                  />
                </FormField>
                <FormField label="Last Name">
                  <Input
                    value={fields.last_name}
                    onChange={(e) => setField("last_name", e.target.value)}
                    disabled={!isEditable}
                    className="h-9"
                  />
                </FormField>
                <FormField label="Grade Level">
                  <Select
                    value={fields.grade_level}
                    onValueChange={(v) => v && setField("grade_level", v)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Section">
                  <Input
                    value={fields.section ?? ""}
                    onChange={(e) =>
                      setField("section", e.target.value || null)
                    }
                    disabled={!isEditable}
                    placeholder="Optional"
                    className="h-9"
                  />
                </FormField>
                <FormField label="Birthday">
                  <Input
                    type="date"
                    value={fields.birthday}
                    onChange={(e) => setField("birthday", e.target.value)}
                    disabled={!isEditable}
                    className="h-9"
                  />
                </FormField>
                <FormField label="Enrollment Type">
                  <Input
                    value={
                      detail.enrollment_type === "subscription"
                        ? "Subscription"
                        : "Non-Subscription"
                    }
                    disabled
                    className="h-9"
                  />
                </FormField>
                <FormField label="Allergies">
                  <Input
                    value={fields.allergies ?? ""}
                    onChange={(e) =>
                      setField("allergies", e.target.value || null)
                    }
                    disabled={!isEditable}
                    placeholder="None"
                    className="h-9"
                  />
                </FormField>
              </div>
              <div className="mt-4">
                <FormField label="Notes">
                  <Textarea
                    value={fields.notes ?? ""}
                    onChange={(e) => setField("notes", e.target.value || null)}
                    disabled={!isEditable}
                    placeholder="Additional notes…"
                    rows={3}
                    className="resize-none"
                  />
                </FormField>
              </div>
            </section>

            {/* Subscription Period (only for subscription type) */}
            {detail.enrollment_type === "subscription" && (
              <section className="rounded-xl border bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Subscription Period
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Start Month">
                    <Select
                      value={fields.subscription_start_month ?? ""}
                      onValueChange={(v) =>
                        setField("subscription_start_month", v || null)
                      }
                      disabled={!isEditable}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Start Year">
                    <Input
                      type="number"
                      value={fields.subscription_start_year ?? ""}
                      onChange={(e) =>
                        setField(
                          "subscription_start_year",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={!isEditable}
                      placeholder="e.g. 2025"
                      className="h-9"
                    />
                  </FormField>
                  <FormField label="End Month">
                    <Select
                      value={fields.subscription_end_month ?? ""}
                      onValueChange={(v) =>
                        setField("subscription_end_month", v || null)
                      }
                      disabled={!isEditable}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="End Year">
                    <Input
                      type="number"
                      value={fields.subscription_end_year ?? ""}
                      onChange={(e) =>
                        setField(
                          "subscription_end_year",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={!isEditable}
                      placeholder="e.g. 2026"
                      className="h-9"
                    />
                  </FormField>
                </div>
              </section>
            )}

            {/* Contacts */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Contacts
              </h3>
              {detail.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contacts provided.
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.contacts.map((contact, index) => (
                    <ContactCard key={contact.id ?? index} contact={contact} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right: meta + actions */}
          <div className="space-y-4">
            {/* Security info */}
            <section className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Submission Info
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Signatory</dt>
                  <dd className="text-right font-medium text-foreground">
                    {detail.signatory_name}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(detail.acknowledged_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(detail.expires_at)}
                  </dd>
                </div>
                {detail.recaptcha_score !== null && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">reCAPTCHA</dt>
                    <dd
                      className={cn(
                        "text-right font-medium",
                        Number(detail.recaptcha_score) >= 0.7
                          ? "text-green-700 dark:text-green-400"
                          : "text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {detail.recaptcha_score}
                    </dd>
                  </div>
                )}
                {detail.submitter_ip && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">IP</dt>
                    <dd className="text-right font-mono text-xs text-foreground">
                      {detail.submitter_ip}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Actions */}
            <section className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </h3>
              <div className="space-y-2">
                {/* Save Changes */}
                {isPending && canEdit && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                )}

                {/* Approve & Enroll */}
                {isPending && canActOnPending && (
                  <Button
                    className="w-full"
                    onClick={() => approveMutation.mutate()}
                    disabled={
                      approveMutation.isPending || detail.duplicate_warning
                    }
                    title={
                      detail.duplicate_warning
                        ? "Resolve the duplicate warning before approving"
                        : undefined
                    }
                  >
                    {approveMutation.isPending
                      ? "Approving…"
                      : "Approve & Enroll"}
                  </Button>
                )}

                {/* Reject */}
                {isPending && canActOnPending && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                )}

                {/* Reactivate */}
                {isExpired && canEdit && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                  >
                    {reactivateMutation.isPending
                      ? "Reactivating…"
                      : "Reactivate"}
                  </Button>
                )}

                {!isPending && !isExpired && (
                  <p className="text-center text-xs text-muted-foreground">
                    No actions available for {detail.status} submissions.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Pre-Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this pre-registration. The parent
              will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rejection-reason">Rejection reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this pre-registration is being rejected…"
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectionReason)}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
