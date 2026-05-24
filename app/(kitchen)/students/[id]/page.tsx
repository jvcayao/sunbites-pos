"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronLeft, MoreHorizontal, Printer, RefreshCw } from "lucide-react";
import { QRCode } from "react-qr-code";

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
import { studentApi } from "@/lib/api/students";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type {
  EnrollmentStatus,
  MonthlyPayment,
  SchoolMonth,
  Student,
  SubscriptionPeriodPayload,
  UpdateStudentPayload,
  WalletPaymentMethod,
} from "@/types/student";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHOOL_MONTHS: { value: SchoolMonth; label: string }[] = [
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

const ENROLLMENT_STATUS_CONFIG: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  enrolled: {
    label: "Enrolled",
    className:
      "bg-green-100 text-green-700 border-green-300 text-[11px] font-bold px-3 py-1 rounded-full border",
  },
  paused: {
    label: "Paused",
    className:
      "bg-yellow-100 text-amber-700 border-yellow-300 text-[11px] font-bold px-3 py-1 rounded-full border",
  },
  unenrolled: {
    label: "Unenrolled",
    className:
      "bg-muted text-muted-foreground border-border text-[11px] font-bold px-3 py-1 rounded-full border",
  },
  banned: {
    label: "Banned",
    className:
      "bg-red-100 text-destructive border-red-300 text-[11px] font-bold px-3 py-1 rounded-full border",
  },
  graduated: {
    label: "Graduated",
    className:
      "bg-purple-100 text-purple-700 border-purple-300 text-[11px] font-bold px-3 py-1 rounded-full border",
  },
};

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
];

// ---------------------------------------------------------------------------
// Wallet top-up validation schema (mirrors students/page.tsx)
// ---------------------------------------------------------------------------

const topUpSchema = z.object({
  amount: z
    .number({ error: "Amount is required" })
    .min(1, "Amount must be at least ₱1")
    .max(100_000, "Amount cannot exceed ₱100,000"),
  payment_method: z.enum(["cash", "gcash", "bank_transfer"]),
  reference_number: z.string().optional(),
  note: z.string().max(255, "Note must be 255 characters or fewer").optional(),
});

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditProfileForm
// ---------------------------------------------------------------------------

interface EditProfileFormProps {
  student: Student;
  onSubmit: (payload: UpdateStudentPayload) => void;
  onCancel: () => void;
  isPending: boolean;
  errors: Record<string, string[]>;
}

function EditProfileForm({ student, onSubmit, onCancel, isPending, errors }: EditProfileFormProps) {
  const [firstName, setFirstName] = useState(student.first_name);
  const [lastName, setLastName] = useState(student.last_name);
  const [gradeLevel, setGradeLevel] = useState(student.grade_level);
  const [section, setSection] = useState(student.section ?? "");
  const [birthday, setBirthday] = useState(student.birthday ?? "");
  const [allergies, setAllergies] = useState(student.allergies ?? "");
  const [notes, setNotes] = useState(student.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      first_name: firstName,
      last_name: lastName,
      grade_level: gradeLevel,
      section: section || undefined,
      birthday,
      allergies: allergies || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-first-name">First Name</Label>
          <Input
            id="edit-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-last-name">Last Name</Label>
          <Input
            id="edit-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-grade-level">Grade Level</Label>
          <Select value={gradeLevel} onValueChange={(v) => { if (v) setGradeLevel(v); }}>
            <SelectTrigger id="edit-grade-level">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.grade_level && (
            <p className="text-xs text-destructive">{errors.grade_level[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-section">Section</Label>
          <Input
            id="edit-section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Section Mabini"
          />
          {errors.section && (
            <p className="text-xs text-destructive">{errors.section[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-birthday">Birthday</Label>
          <Input
            id="edit-birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          {errors.birthday && (
            <p className="text-xs text-destructive">{errors.birthday[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-allergies">Allergies</Label>
        <Textarea
          id="edit-allergies"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Any food allergies or dietary restrictions…"
          rows={2}
        />
        {errors.allergies && (
          <p className="text-xs text-destructive">{errors.allergies[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes…"
          rows={2}
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes[0]}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// WalletTopUpModal
// ---------------------------------------------------------------------------

interface WalletTopUpModalProps {
  open: boolean;
  onClose: () => void;
  studentId: number;
  currentBalance: number;
}

function WalletTopUpModal({
  open,
  onClose,
  studentId,
  currentBalance,
}: WalletTopUpModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<WalletPaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [successMsg, setSuccessMsg] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      studentApi.topUp(studentId, {
        amount: Number(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        note: note || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      setSuccessMsg(
        `Wallet topped up. New balance: ₱${Number(data.new_balance).toFixed(2)}`
      );
    },
    onError: (err: ApiError) => {
      if (err.errors) setErrors(err.errors);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = topUpSchema.safeParse({
      amount: Number(amount),
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      note: note || undefined,
    });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setErrors({});
    setSuccessMsg("");
    mutation.mutate();
  }

  const newBalance = currentBalance + (Number(amount) || 0);

  function handleClose() {
    setAmount("");
    setPaymentMethod("cash");
    setReferenceNumber("");
    setNote("");
    setErrors({});
    setSuccessMsg("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>Add funds to this student&apos;s wallet.</DialogDescription>
        </DialogHeader>

        {successMsg ? (
          <>
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
              {successMsg}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="detail-topup-amount">Amount (₱)</Label>
              <Input
                id="detail-topup-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!!errors.amount?.length}
                className={cn(errors.amount?.length && "border-destructive")}
              />
              {errors.amount?.[0] && (
                <p className="text-xs text-destructive">{errors.amount[0]}</p>
              )}
            </div>

            {Number(amount) > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                New Balance After Top-Up:{" "}
                <span className="font-bold">₱{newBalance.toFixed(2)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    { value: "cash", label: "Cash" },
                    { value: "gcash", label: "GCash" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm transition-colors",
                      paymentMethod === m.value
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {(paymentMethod === "gcash" ||
              paymentMethod === "bank_transfer") && (
              <div className="space-y-1.5">
                <Label htmlFor="detail-topup-ref">Reference Number</Label>
                <Input
                  id="detail-topup-ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction reference…"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="detail-topup-note">Note (optional)</Label>
              <Input
                id="detail-topup-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Weekly allowance"
              />
            </div>

            {mutation.isError && !Object.keys(errors).length && (
              <p className="text-sm text-destructive">
                {(mutation.error as ApiError)?.message ?? "An error occurred."}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Processing…" : "Top Up Wallet"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// StatusPickerDialog
// ---------------------------------------------------------------------------

interface StatusPickerDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: number;
  currentStatus: EnrollmentStatus;
}

function StatusPickerDialog({
  open,
  onClose,
  studentId,
  currentStatus,
}: StatusPickerDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<EnrollmentStatus>(currentStatus);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      studentApi.updateStatus(studentId, {
        enrollment_status: selected,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      onClose();
    },
  });

  const needsReason = selected === "banned" || selected === "unenrolled";

  function handleClose() {
    setSelected(currentStatus);
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Enrollment Status</DialogTitle>
          <DialogDescription>
            Select the new enrollment status for this student.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(
            Object.keys(ENROLLMENT_STATUS_CONFIG) as EnrollmentStatus[]
          ).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelected(status)}
              className={cn(
                "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                selected === status
                  ? "border-primary bg-primary/5 font-semibold text-primary"
                  : "border-border hover:bg-muted/40"
              )}
            >
              {ENROLLMENT_STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>

        {needsReason && (
          <div className="space-y-1.5">
            <Label htmlFor="detail-status-reason">Reason (optional)</Label>
            <Input
              id="detail-status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reason for this status change…"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Subscription Period dialog
// ---------------------------------------------------------------------------

const PAYMENT_SCHOOL_MONTHS: { value: SchoolMonth; label: string }[] = [
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

const SUBSCRIPTION_YEAR_MIN = 2020;
const SUBSCRIPTION_YEAR_MAX = 2099;

interface AddSubscriptionPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: number;
}

function AddSubscriptionPeriodDialog({
  open,
  onClose,
  studentId,
}: AddSubscriptionPeriodDialogProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [startMonth, setStartMonth] = useState<SchoolMonth | "">("");
  const [startYear, setStartYear] = useState<number>(currentYear);
  const [endMonth, setEndMonth] = useState<SchoolMonth | "">("");
  const [endYear, setEndYear] = useState<number>(currentYear);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: SubscriptionPeriodPayload) =>
      studentApi.addSubscriptionRange(studentId, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["student-payments", studentId],
      });
      const skippedNote =
        result.skipped.length > 0
          ? ` ${result.skipped.length} already existed and were skipped.`
          : "";
      setSuccessMsg(
        `${result.created} ${result.created === 1 ? "month" : "months"} added.${skippedNote}`
      );
    },
  });

  function handleClose() {
    setStartMonth("");
    setStartYear(currentYear);
    setEndMonth("");
    setEndYear(currentYear);
    setValidationError(null);
    setSuccessMsg(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startMonth || !endMonth) {
      setValidationError("Both start and end months are required.");
      return;
    }
    if (
      startYear < SUBSCRIPTION_YEAR_MIN ||
      startYear > SUBSCRIPTION_YEAR_MAX ||
      endYear < SUBSCRIPTION_YEAR_MIN ||
      endYear > SUBSCRIPTION_YEAR_MAX
    ) {
      setValidationError(
        `Year must be between ${SUBSCRIPTION_YEAR_MIN} and ${SUBSCRIPTION_YEAR_MAX}.`
      );
      return;
    }
    setValidationError(null);
    mutation.mutate({
      subscription_start_month: startMonth as SchoolMonth,
      subscription_start_year: startYear,
      subscription_end_month: endMonth as SchoolMonth,
      subscription_end_year: endYear,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subscription Period</DialogTitle>
          <DialogDescription>
            Add payment records for a new school month range.
          </DialogDescription>
        </DialogHeader>

        {successMsg ? (
          <>
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
              {successMsg}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-period-start-month">Start Month</Label>
                <Select
                  value={startMonth}
                  onValueChange={(v) => setStartMonth((v as SchoolMonth) ?? "")}
                >
                  <SelectTrigger id="add-period-start-month">
                    <SelectValue placeholder="Month…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SCHOOL_MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-period-start-year">Start Year</Label>
                <Input
                  id="add-period-start-year"
                  type="number"
                  min={SUBSCRIPTION_YEAR_MIN}
                  max={SUBSCRIPTION_YEAR_MAX}
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-period-end-month">End Month</Label>
                <Select
                  value={endMonth}
                  onValueChange={(v) => setEndMonth((v as SchoolMonth) ?? "")}
                >
                  <SelectTrigger id="add-period-end-month">
                    <SelectValue placeholder="Month…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SCHOOL_MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-period-end-year">End Year</Label>
                <Input
                  id="add-period-end-year"
                  type="number"
                  min={SUBSCRIPTION_YEAR_MIN}
                  max={SUBSCRIPTION_YEAR_MAX}
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                />
              </div>
            </div>

            {validationError && (
              <p role="alert" className="text-sm text-destructive">
                {validationError}
              </p>
            )}

            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {(mutation.error as ApiError)?.message ??
                  "An error occurred. Please try again."}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding…" : "Add Period"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditAmountDialog
// ---------------------------------------------------------------------------

interface EditAmountDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: number;
  payment: MonthlyPayment;
}

function EditAmountDialog({
  open,
  onClose,
  studentId,
  payment,
}: EditAmountDialogProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(payment.amount);
  const [error, setError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(payment.amount);
      setError(null);
      setSavedIndicator(false);
    }
  }, [open, payment.amount]);

  const mutation = useMutation({
    mutationFn: () =>
      studentApi.updatePaymentAmount(studentId, payment.id, parseFloat(amount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-payments", studentId] });
      setSavedIndicator(true);
      setTimeout(() => {
        setSavedIndicator(false);
        onClose();
      }, 1200);
    },
    onError: (err: ApiError) => {
      setError(err.message ?? "An error occurred. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    setError(null);
    mutation.mutate();
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError(null);
      setSavedIndicator(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Adjust Amount for {payment.school_month_label} {payment.year}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-payment-amount">
              Amount (₱) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "edit-payment-amount-error" : undefined}
            />
            {error && (
              <p
                id="edit-payment-amount-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          {savedIndicator && (
            <p className="text-sm font-semibold text-green-600" role="status">
              Saved
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || savedIndicator}>
              {mutation.isPending ? "Saving…" : "Save Amount"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Payment tab
// ---------------------------------------------------------------------------

interface PaymentTabProps {
  studentId: number;
  canToggle: boolean;
  studentType: string;
}

function PaymentTab({ studentId, canToggle, studentType }: PaymentTabProps) {
  const queryClient = useQueryClient();
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [editingPayment, setEditingPayment] = useState<MonthlyPayment | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["student-payments", studentId],
    queryFn: () => studentApi.payments(studentId),
  });

  const toggleMutation = useMutation({
    mutationFn: (paymentId: number) =>
      studentApi.togglePayment(studentId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-payments", studentId],
      });
    },
  });

  if (studentType !== "subscription") {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        This student has no monthly subscription fee.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((k) => (
          <Skeleton key={k} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!payments?.length) {
    return (
      <div className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          No payment records found.
        </p>
        {canToggle && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddPeriod(true)}
            >
              + Add Subscription Period
            </Button>
            <AddSubscriptionPeriodDialog
              open={showAddPeriod}
              onClose={() => setShowAddPeriod(false)}
              studentId={studentId}
            />
          </>
        )}
      </div>
    );
  }

  // Group payments by year
  const paymentsByYear = payments.reduce<Record<number, MonthlyPayment[]>>(
    (acc, payment) => {
      const year = payment.year;
      if (!acc[year]) acc[year] = [];
      acc[year].push(payment);
      return acc;
    },
    {}
  );
  const sortedYears = Object.keys(paymentsByYear)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="mt-4 space-y-5">
      {canToggle && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowAddPeriod(true)}
          >
            + Add Subscription Period
          </Button>
        </div>
      )}

      {sortedYears.map((year) => (
        <div key={year} className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
            {year}
          </p>
          {paymentsByYear[year].map((payment) => {
            const isPaid = payment.status === "paid";
            return (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {payment.school_month_label} {payment.year}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₱{payment.amount}
                    {payment.recorded_at
                      ? ` · Paid ${new Date(payment.recorded_at).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold px-3 py-1 rounded-full border",
                      isPaid
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-red-100 text-destructive border-red-300"
                    )}
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </span>
                  {canToggle && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => toggleMutation.mutate(payment.id)}
                        disabled={toggleMutation.isPending}
                      >
                        Toggle
                      </Button>
                      {!isPaid && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPayment(payment)}
                        >
                          Edit Amount
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <AddSubscriptionPeriodDialog
        open={showAddPeriod}
        onClose={() => setShowAddPeriod(false)}
        studentId={studentId}
      />

      {editingPayment && (
        <EditAmountDialog
          open={editingPayment !== null}
          onClose={() => setEditingPayment(null)}
          studentId={studentId}
          payment={editingPayment}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface StudentDetailPageProps {
  params: { id: string };
}

/** Parses a URL segment as a positive integer. Returns null for any non-integer input (float strings, "1.5", "abc", negative numbers). */
function parsePositiveInt(raw: string | undefined | null): number | null {
  if (!raw) return null;
  // Reject anything that isn't purely decimal digits (no sign, no decimal point)
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n > 0 ? n : null;
}

export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const routerParams = useParams<{ id: string }>();
  const rawId = routerParams?.id ?? params.id;
  const studentId = parsePositiveInt(rawId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const canTogglePayment =
    user?.roles.includes("admin") === true || user?.roles.includes("manager") === true;

  const canManageStatus =
    user?.roles.includes("admin") === true || user?.roles.includes("manager") === true;

  const canDeleteStudent = user?.roles.includes("admin") === true;

  const [showTopUp, setShowTopUp] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentApi.show(studentId!),
    enabled: studentId !== null,
  });

  const student = data?.student;
  const displayQr = qrCode ?? student?.qr_code ?? "";

  const regenerateQrMutation = useMutation({
    mutationFn: () => studentApi.regenerateQr(studentId!),
    onSuccess: (result) => {
      setQrCode(result.qr_code);
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => studentApi.destroy(studentId!),
    onSuccess: () => {
      router.push("/students");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateStudentPayload) =>
      studentApi.update(studentId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      setIsEditing(false);
      setEditErrors({});
    },
    onError: (err: ApiError) => {
      if (err.errors) setEditErrors(err.errors as Record<string, string[]>);
    },
  });

  if (studentId === null) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-destructive">Invalid student ID.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !student) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-destructive">
            Failed to load student. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/students")}
          >
            Back to Students
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = ENROLLMENT_STATUS_CONFIG[student.enrollment_status];

  return (
    <div className="p-6 space-y-6">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Back + actions */}
      <div className="flex items-center justify-between no-print">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/students")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Students
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Student actions" />
            }
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManageStatus && (
              <DropdownMenuItem onClick={() => setShowStatusPicker(true)}>
                Change Enrollment Status
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowTopUp(true)}>
              Top Up Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>
              Print QR Code
            </DropdownMenuItem>
            {canDeleteStudent && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Remove Student
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
              {student.first_name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">
                {student.full_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {student.grade_level}
                {student.section ? ` · ${student.section}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={statusConfig.className}>
                  {statusConfig.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold px-3 py-1 rounded-full border",
                    student.student_type === "subscription"
                      ? "bg-orange-100 text-orange-700 border-orange-300"
                      : "bg-purple-100 text-purple-700 border-purple-300"
                  )}
                >
                  {student.student_type_label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground block">Wallet</span>
              <span className="font-bold">
                ₱{Number(student.wallet_balance ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground block">QR ID</span>
              <span className="font-mono text-xs">{student.qr_code.slice(0, 12)}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowTopUp(true)}
            >
              + Top Up
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              aria-label="Print QR Code"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="flex-col">
        <TabsList className="no-print w-full justify-start h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Personal Information
                </h2>
                {!isEditing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                ) : null}
              </div>

              {isEditing ? (
                <EditProfileForm
                  student={student}
                  onSubmit={(payload) => updateMutation.mutate(payload)}
                  onCancel={() => { setIsEditing(false); setEditErrors({}); }}
                  isPending={updateMutation.isPending}
                  errors={editErrors}
                />
              ) : (
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  <div className="divide-y divide-border">
                    <InfoRow label="First Name" value={student.first_name} />
                    <InfoRow label="Last Name" value={student.last_name} />
                    <InfoRow label="Grade Level" value={student.grade_level} />
                    <InfoRow label="Section" value={student.section} />
                    <InfoRow label="Birthday" value={student.birthday} />
                  </div>
                  <div className="divide-y divide-border">
                    <InfoRow label="Student Number" value={student.student_number} />
                    <InfoRow label="Student Type" value={student.student_type_label} />
                    <InfoRow label="Allergies" value={student.allergies} />
                    <InfoRow label="Notes" value={student.notes} />
                  </div>
                </div>
              )}
            </div>

            {/* Contacts */}
            {student.contacts && student.contacts.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3 pb-2 border-b border-border">
                  Contacts
                </h2>
                <div className="space-y-3">
                  {student.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">
                          {contact.full_name}
                        </p>
                        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                          {contact.relationship}
                        </span>
                        {contact.is_primary && (
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {contact.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contact.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contact.address}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center gap-4">
              <h2 className="self-start text-xs font-extrabold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border w-full">
                QR Code
              </h2>
              <QRCode value={displayQr || "placeholder"} size={180} />
              <p className="text-xs font-mono text-muted-foreground">
                QR ID: {displayQr}
              </p>
              <div className="flex gap-2 flex-wrap justify-center no-print">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  aria-label="Print QR Code"
                >
                  <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Print QR Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  aria-label="Download QR Code"
                >
                  Download PNG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateQrMutation.mutate()}
                  disabled={regenerateQrMutation.isPending}
                  aria-label="Regenerate QR Code"
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {regenerateQrMutation.isPending
                    ? "Regenerating…"
                    : "Regenerate QR Code"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet">
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₱{Number(student.wallet_balance ?? 0).toFixed(2)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowTopUp(true)}
                >
                  + Top Up
                </Button>
              </div>

              {data?.wallet_transactions && data.wallet_transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.wallet_transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b border-border hover:bg-muted/20"
                        >
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 capitalize">{tx.type}</td>
                          <td className="px-3 py-2 font-medium">
                            ₱{Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {tx.note ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transactions yet.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orders">
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Order history will be available in the next update.
            </p>
          </div>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment">
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <PaymentTab
              studentId={student.id}
              canToggle={canTogglePayment}
              studentType={student.student_type}
            />
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            {data?.activity_logs && data.activity_logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Actor
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Event
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activity_logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">{log.causer}</td>
                        <td className="px-3 py-2">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity logs yet.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <WalletTopUpModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        studentId={studentId!}
        currentBalance={Number(student.wallet_balance ?? 0)}
      />

      <StatusPickerDialog
        open={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        studentId={student.id}
        currentStatus={student.enrollment_status}
      />

      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(o) => !o && setShowDeleteConfirm(false)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove {student.full_name}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The student record will be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
