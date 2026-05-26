"use client";

import { startTransition, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Printer, X } from "lucide-react";
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
import { studentApi } from "@/lib/api/students";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type {
  EnrollmentStatus,
  MonthlyPayment,
  SchoolMonth,
  Student,
  WalletPaymentMethod,
} from "@/types/student";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHOOL_MONTHS: { value: SchoolMonth; label: string; short: string }[] = [
  { value: "june", label: "June", short: "Jun" },
  { value: "july", label: "July", short: "Jul" },
  { value: "august", label: "August", short: "Aug" },
  { value: "september", label: "September", short: "Sep" },
  { value: "october", label: "October", short: "Oct" },
  { value: "november", label: "November", short: "Nov" },
  { value: "december", label: "December", short: "Dec" },
  { value: "january", label: "January", short: "Jan" },
  { value: "february", label: "February", short: "Feb" },
  { value: "march", label: "March", short: "Mar" },
];

const ENROLLMENT_STATUS_CONFIG: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  enrolled: {
    label: "Enrolled",
    className:
      "bg-green-100 text-green-700 border-green-300 text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer",
  },
  paused: {
    label: "Paused",
    className:
      "bg-yellow-100 text-amber-700 border-yellow-300 text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer",
  },
  unenrolled: {
    label: "Unenrolled",
    className:
      "bg-muted text-muted-foreground border-border text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer",
  },
  banned: {
    label: "Banned",
    className:
      "bg-red-100 text-destructive border-red-300 text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer",
  },
  graduated: {
    label: "Graduated",
    className:
      "bg-purple-100 text-purple-700 border-purple-300 text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer",
  },
};

const STATUS_EMOJI: Record<EnrollmentStatus, string> = {
  enrolled: "Enrolled",
  paused: "Paused",
  unenrolled: "Unenrolled",
  banned: "Banned",
  graduated: "Graduated",
};

// ---------------------------------------------------------------------------
// Wallet top-up schema
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
// WalletTopUpModal
// ---------------------------------------------------------------------------

interface WalletTopUpModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
}

function WalletTopUpModal({ open, onClose, student }: WalletTopUpModalProps) {
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
      studentApi.topUp(student.id, {
        amount: Number(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        note: note || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", student.id] });
      setSuccessMsg(`Wallet topped up. New balance: ₱${data.new_balance.toFixed(2)}`);
      setAmount("");
      setReferenceNumber("");
      setNote("");
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

  const currentBalance = student.wallet_balance ?? 0;
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
          <DialogDescription>
            Add funds to {student.full_name}&apos;s wallet.
          </DialogDescription>
        </DialogHeader>

        {successMsg ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topup-amount">Amount (₱)</Label>
              <Input
                id="topup-amount"
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
                <Label htmlFor="topup-ref">Reference Number</Label>
                <Input
                  id="topup-ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction reference…"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="topup-note">Note (optional)</Label>
              <Input
                id="topup-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Weekly allowance"
              />
            </div>

            {mutation.isError && !Object.keys(errors).length && (
              <p className="text-sm text-destructive">
                {(mutation.error as ApiError)?.message ??
                  "An error occurred."}
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

        {successMsg && (
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
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
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      onClose();
    },
  });

  const needsReason =
    selected === "banned" || selected === "unenrolled";

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
              {STATUS_EMOJI[status]}
            </button>
          ))}
        </div>

        {needsReason && (
          <div className="space-y-1.5">
            <Label htmlFor="status-reason">Reason (optional)</Label>
            <Input
              id="status-reason"
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
// BatchQrModal
// ---------------------------------------------------------------------------

interface BatchQrModalProps {
  open: boolean;
  onClose: () => void;
  students: Student[];
}

function QrCard({ student, branchName }: { student: Student; branchName: string }) {
  const gradeSection = [student.grade_level, student.section].filter(Boolean).join(" · ");
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border-[3px] border-amber-400 bg-white text-center">
      {/* Header banner */}
      <div className="shrink-0 bg-red-700 px-2 py-1">
        <p className="text-[10px] font-extrabold uppercase leading-none tracking-wide text-white">
          Sunbites
        </p>
        <p className="text-[8px] font-semibold uppercase tracking-widest text-red-200">
          {branchName}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center justify-between px-2 py-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400">
            <span className="text-xs font-extrabold text-white">
              {student.first_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold leading-snug">{student.full_name}</p>
            {gradeSection && (
              <p className="text-[9px] text-muted-foreground">{gradeSection}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <QRCode value={student.qr_code} style={{ width: "80%", height: "auto" }} />
          <p className="text-[7px] font-mono text-muted-foreground">{student.qr_code}</p>
        </div>
      </div>
    </div>
  );
}

function BatchQrModal({ open, onClose, students }: BatchQrModalProps) {
  const [cols, setCols] = useState<2 | 4>(2);
  const [printRoot, setPrintRoot] = useState<HTMLDivElement | null>(null);
  const activeBranch = useAuthStore((s) => s.activeBranch);
  const branchName = activeBranch?.name ?? "Branch";

  // Mount a dedicated print container directly on <body> so window.print()
  // only shows the cards — not the dialog chrome.
  useEffect(() => {
    if (!open) return;
    const el = document.createElement("div");
    el.id = "qr-print-root";
    document.body.appendChild(el);
    startTransition(() => setPrintRoot(el));
    return () => {
      document.body.removeChild(el);
      startTransition(() => setPrintRoot(null));
    };
  }, [open]);

  const cardGrid = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 54mm)`,
        gap: "5mm",
        padding: "10mm",
      }}
    >
      {students.map((s) => (
        <div key={s.id} data-qr-card style={{ width: "54mm", height: "86mm" }}>
          <QrCard student={s} branchName={branchName} />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print QR Codes ({students.length} selected)</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cards per row:</span>
            {([2, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCols(n)}
                className={cn(
                  "rounded-lg border px-3 py-1 text-sm",
                  cols === n
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Screen preview — fixed ID card size */}
          <div
            className={cn(
              "grid gap-3 mt-2 justify-items-center",
              cols === 2 ? "grid-cols-2" : "grid-cols-4"
            )}
          >
            {students.map((s) => (
              <div key={s.id} className="w-[130px] h-[206px]">
                <QrCard student={s} branchName={branchName} />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Print All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print portal — rendered outside the dialog, at actual ID card mm dimensions */}
      {printRoot && createPortal(cardGrid, printRoot)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Month payment badges
// ---------------------------------------------------------------------------

interface MonthBadgesProps {
  studentId: number;
  payments: MonthlyPayment[];
  canToggle: boolean;
}

function MonthBadges({ studentId, payments, canToggle }: MonthBadgesProps) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (paymentId: number) =>
      studentApi.togglePayment(studentId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  return (
    <div className="flex flex-wrap gap-1.5">
      {SCHOOL_MONTHS.map((month) => {
        const payment = payments.find((p) => p.school_month === month.value);
        if (!payment) return null;
        const isPaid = payment.status === "paid";

        return (
          <button
            key={month.value}
            type="button"
            onClick={() => canToggle && toggleMutation.mutate(payment.id)}
            disabled={!canToggle || toggleMutation.isPending}
            className={cn(
              "rounded-full text-[11px] font-bold px-3 py-1 border transition-colors",
              isPaid
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-red-100 text-destructive border-red-300",
              !canToggle && "cursor-default"
            )}
          >
            {month.short} {isPaid ? "✓" : "✗"}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StudentCard
// ---------------------------------------------------------------------------

interface StudentCardProps {
  student: Student;
  selected: boolean;
  onSelect: (id: number, selected: boolean) => void;
  onTopUp: (student: Student) => void;
  onStatusClick: (student: Student) => void;
  onRemove: (student: Student) => void;
  canTogglePayment: boolean;
}

function StudentCard({
  student,
  selected,
  onSelect,
  onTopUp,
  onStatusClick,
  onRemove,
  canTogglePayment,
}: StudentCardProps) {
  const isSubscription = student.student_type === "subscription";
  const primaryContact = student.contacts?.find((c) => c.is_primary);
  const statusConfig = ENROLLMENT_STATUS_CONFIG[student.enrollment_status];
  const creditOwed = parseFloat(student.credit_balance) > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 relative",
        isSubscription ? "border-l-4 border-l-orange-400" : "border-l-4 border-l-purple-500"
      )}
    >
      {/* Checkbox */}
      <div className="absolute top-3 left-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(student.id, !!checked)}
          aria-label={`Select ${student.full_name}`}
        />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 pl-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {student.first_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground truncate">
              {student.full_name}
            </p>
            <button
              type="button"
              onClick={() => onStatusClick(student)}
              className={statusConfig.className}
            >
              {statusConfig.label}
            </button>
            <span
              className={cn(
                "text-[11px] font-bold px-3 py-1 rounded-full border",
                isSubscription
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-purple-100 text-purple-700 border-purple-300"
              )}
            >
              {student.student_type_label}
            </span>
            {creditOwed && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-red-100 text-destructive border-red-300">
                ₱{student.credit_balance} Credit Owed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {student.grade_level}
            {student.section ? ` · ${student.section}` : ""}
            {primaryContact ? ` · ${primaryContact.full_name}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Enrolled {student.enrollment_date} · Wallet: ₱
            {(student.wallet_balance ?? 0).toFixed(2)} · {student.points} pts
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1.5 flex-wrap">
          <Link
            href={`/students/${student.id}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/40"
          >
            Edit
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onTopUp(student)}
          >
            Wallet
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRemove(student)}
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="border-t border-border mt-3 pt-3">
        {isSubscription ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Monthly Subscription
            </p>
            <MonthBadges
              studentId={student.id}
              payments={student.monthly_payments ?? []}
              canToggle={canTogglePayment}
            />
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700 flex-1">
              Wallet-only account — loads wallet to purchase food items
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTopUp(student)}
              className="bg-purple-600 text-white hover:bg-purple-700 shrink-0"
            >
              Load Wallet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RemoveStudentDialog
// ---------------------------------------------------------------------------

interface RemoveStudentDialogProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
}

function RemoveStudentDialog({
  open,
  onClose,
  student,
}: RemoveStudentDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => studentApi.destroy(student!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {student?.full_name}?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The student record will be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Removing…" : "Remove Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type ActiveTab = "all" | "subscription" | "non_subscription";

export default function StudentsPage() {
  const user = useAuthStore((s) => s.user);

  const canTogglePayment =
    user?.roles.includes("admin") || user?.roles.includes("manager")
      ? true
      : false;

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [topUpStudent, setTopUpStudent] = useState<Student | null>(null);
  const [statusPickerState, setStatusPickerState] = useState<{
    studentId: number;
    current: EnrollmentStatus;
  } | null>(null);
  const [removeStudent, setRemoveStudent] = useState<Student | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "students",
      {
        activeTab,
        search,
        gradeFilter,
        statusFilter,
        monthFilter,
        paymentStatusFilter,
      },
    ],
    queryFn: () =>
      studentApi.list({
        search: search || undefined,
        grade: gradeFilter || undefined,
        status: statusFilter || undefined,
        type: activeTab !== "all" ? activeTab : undefined,
        month:
          activeTab === "subscription" && monthFilter
            ? (monthFilter as SchoolMonth)
            : undefined,
        payment_status:
          activeTab === "subscription" && paymentStatusFilter
            ? paymentStatusFilter
            : undefined,
      }),
  });

  const allStudents = data?.data ?? [];
  const subscriptionStudents = allStudents.filter(
    (s) => s.student_type === "subscription"
  );
  const nonSubStudents = allStudents.filter(
    (s) => s.student_type === "non_subscription"
  );

  const selectedStudents = allStudents.filter((s) => selectedIds.has(s.id));

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const displayedStudents =
    activeTab === "all"
      ? allStudents
      : activeTab === "subscription"
        ? subscriptionStudents
        : nonSubStudents;

  return (
    <div className="p-6 space-y-4">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <p className="text-xs text-muted-foreground">Students</p>
          <h1 className="text-xl font-bold text-foreground">Student Portal</h1>
        </div>
        <Link
          href="/enrollment"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Enroll Student
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row no-print">
        <Input
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search students"
        />
        <Select
          value={gradeFilter}
          onValueChange={(v) => setGradeFilter(v === "all" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by grade">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[
              "Nursery",
              "Kinder 1",
              "Kinder 2",
              "Grade 1",
              "Grade 2",
              "Grade 3",
              "Grade 4",
              "Grade 5",
              "Grade 6",
            ].map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="unenrolled">Unenrolled</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
          </SelectContent>
        </Select>

        {activeTab === "subscription" && (
          <>
            <Select
              value={monthFilter}
              onValueChange={(v) => setMonthFilter(v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by month">
                <SelectValue placeholder="Month" />
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
              value={paymentStatusFilter}
              onValueChange={(v) =>
                setPaymentStatusFilter(v === "all" ? "" : (v ?? ""))
              }
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by payment status">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 no-print">
        {(
          [
            { value: "all", label: "All" },
            {
              value: "subscription",
              label: `Subscription (${subscriptionStudents.length})`,
            },
            {
              value: "non_subscription",
              label: `Non-Subscription (${nonSubStudents.length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:bg-muted/40 text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isError ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-destructive">
          Failed to load students. Please try again.
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !displayedStudents.length ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No students found.
        </div>
      ) : activeTab === "all" ? (
        <div className="space-y-6">
          {subscriptionStudents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-orange-600">
                Subscription Students ({subscriptionStudents.length})
              </h2>
              {subscriptionStudents.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  selected={selectedIds.has(s.id)}
                  onSelect={toggleSelect}
                  onTopUp={setTopUpStudent}
                  onStatusClick={(st) =>
                    setStatusPickerState({
                      studentId: st.id,
                      current: st.enrollment_status,
                    })
                  }
                  onRemove={setRemoveStudent}
                  canTogglePayment={canTogglePayment}
                />
              ))}
            </div>
          )}

          {nonSubStudents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-purple-600">
                Non-Subscription Students ({nonSubStudents.length})
              </h2>
              {nonSubStudents.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  selected={selectedIds.has(s.id)}
                  onSelect={toggleSelect}
                  onTopUp={setTopUpStudent}
                  onStatusClick={(st) =>
                    setStatusPickerState({
                      studentId: st.id,
                      current: st.enrollment_status,
                    })
                  }
                  onRemove={setRemoveStudent}
                  canTogglePayment={canTogglePayment}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedStudents.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              selected={selectedIds.has(s.id)}
              onSelect={toggleSelect}
              onTopUp={setTopUpStudent}
              onStatusClick={(st) =>
                setStatusPickerState({
                  studentId: st.id,
                  current: st.enrollment_status,
                })
              }
              onRemove={setRemoveStudent}
              canTogglePayment={canTogglePayment}
            />
          ))}
        </div>
      )}

      {/* Floating action bar */}
      {selectedIds.size >= 1 && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg border border-border rounded-2xl bg-white px-6 py-3 flex items-center gap-4 z-50">
          <span className="bg-primary text-primary-foreground rounded-full px-3 py-0.5 text-sm font-bold">
            {selectedIds.size}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowBatchModal(true)}
          >
            <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Print QR Codes
          </Button>
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear selection"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Modals */}
      <BatchQrModal
        open={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        students={selectedStudents}
      />

      {topUpStudent && (
        <WalletTopUpModal
          open={!!topUpStudent}
          onClose={() => setTopUpStudent(null)}
          student={topUpStudent}
        />
      )}

      {statusPickerState && (
        <StatusPickerDialog
          open={!!statusPickerState}
          onClose={() => setStatusPickerState(null)}
          studentId={statusPickerState.studentId}
          currentStatus={statusPickerState.current}
        />
      )}

      <RemoveStudentDialog
        open={!!removeStudent}
        onClose={() => setRemoveStudent(null)}
        student={removeStudent}
      />
    </div>
  );
}
