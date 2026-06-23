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

import { studentApi } from "@/lib/api/students";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import { getCardAccentColors } from "@/lib/utils/card-accent-colors";

import type { ApiError } from "@/types/auth";
import type {
  EnrollmentStatus,
  MonthlyPayment,
  SchoolMonth,
  Student,
  WalletPaymentMethod,
} from "@/types/student";
import { toast } from "sonner";

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
      setSuccessMsg(
        `Wallet topped up. New balance: ₱${Number(data.new_balance).toFixed(2)}`,
      );
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
                        : "border-border hover:bg-muted/40",
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
          {(Object.keys(ENROLLMENT_STATUS_CONFIG) as EnrollmentStatus[]).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelected(status)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                  selected === status
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "border-border hover:bg-muted/40",
                )}
              >
                {STATUS_EMOJI[status]}
              </button>
            ),
          )}
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

function getSchoolYear(enrollmentDate: string): string {
  const [year, month] = enrollmentDate.split("-").map(Number);
  return month >= 6 ? `${year}–${year + 1}` : `${year - 1}–${year}`;
}

function PrintCard({ student }: { student: Student }) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!student.photo_url) return;
    let objectUrl: string | null = null;
    const { token, activeBranch } = useAuthStore.getState();
    const headers: Record<string, string> = { Accept: "image/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBranch) headers["X-Branch-Id"] = String(activeBranch.id);
    fetch(student.photo_url, { headers })
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPhotoSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [student.photo_url]);

  const colors = getCardAccentColors(student.student_type);

  const parts = student.enrollment_date?.split("-") ?? [];
  const enrolledFormatted =
    parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : null;

  return (
    <div
      data-qr-card
      style={{
        width: "53.98mm",
        height: "85.6mm",
        display: "flex",
        flexDirection: "column",
        border: `1.5px solid ${colors.borderColor}`,
        borderRadius: "3mm",
        overflow: "hidden",
        backgroundColor: "white",
        fontFamily: "sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: colors.headerBg,
          padding: "2mm 3mm",
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: colors.headerText,
            fontWeight: 800,
            fontSize: "8px",
            letterSpacing: "0.3px",
          }}
        >
          🍽 SUNBITES KITCHEN
        </div>
        <div
          style={{
            color: colors.headerSubText,
            fontSize: "7px",
            marginTop: "0.5mm",
          }}
        >
          Student Canteen ID
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "3mm 3mm 2mm",
          gap: "1.5mm",
          overflow: "hidden",
        }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={student.full_name}
            style={{
              width: "18mm",
              height: "18mm",
              objectFit: "cover",
              borderRadius: "2mm",
              border: `1px solid ${colors.accentColor}`,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "18mm",
              height: "18mm",
              borderRadius: "2mm",
              border: `1px solid ${colors.accentColor}`,
              backgroundColor: colors.avatarBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8mm",
              fontWeight: 800,
              color: colors.accentColor,
              flexShrink: 0,
            }}
          >
            {student.first_name.charAt(0).toUpperCase()}
          </div>
        )}
        <p
          style={{
            fontWeight: 700,
            fontSize: "9px",
            textAlign: "center",
            margin: 0,
            color: "#111",
          }}
        >
          {student.full_name}
        </p>
        <p
          style={{
            color: colors.accentColor,
            fontSize: "8px",
            margin: 0,
            fontWeight: 600,
          }}
        >
          {student.grade_level}
        </p>
        <p style={{ color: "#555", fontSize: "7px", margin: 0 }}>
          🍽 {student.student_type_label}
        </p>
        {enrolledFormatted && (
          <p style={{ fontSize: "6.5px", color: "#444", margin: 0 }}>
            Enrolled: {enrolledFormatted}
          </p>
        )}
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "2mm",
            padding: "1.5mm",
            marginTop: "1mm",
          }}
        >
          <QRCode
            value={student.qr_code}
            size={85}
            style={{ width: "22mm", height: "22mm" }}
          />
        </div>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "5px",
            color: "#888",
            margin: 0,
            textAlign: "center",
          }}
        >
          {student.qr_code}
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: colors.footerBg,
          borderTop: `1px solid ${colors.footerBorder}`,
          padding: "1.5mm 3mm",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "5.5px", color: "#666", margin: 0 }}>
          Scan QR to view wallet balance
          {student.enrollment_date
            ? ` • Valid S.Y. ${getSchoolYear(student.enrollment_date)}`
            : ""}
        </p>
      </div>
    </div>
  );
}

function QrCard({ student }: { student: Student }) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!student.photo_url) return;
    let objectUrl: string | null = null;
    const { token, activeBranch } = useAuthStore.getState();
    const headers: Record<string, string> = { Accept: "image/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBranch) headers["X-Branch-Id"] = String(activeBranch.id);
    fetch(student.photo_url, { headers })
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPhotoSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [student.photo_url]);

  const parts = student.enrollment_date?.split("-") ?? [];
  const enrolledFormatted =
    parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        borderRadius: "6px",
        border: "2px solid oklch(0.577 0.245 27.325)",
        overflow: "hidden",
        backgroundColor: "white",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: "oklch(0.577 0.245 27.325)",
          padding: "4px 6px",
        }}
      >
        <p
          style={{
            color: "white",
            fontWeight: 800,
            fontSize: "8px",
            letterSpacing: "0.3px",
            margin: 0,
          }}
        >
          🍽 Sunbites Kitchen
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "6.5px",
            margin: "1px 0 0",
          }}
        >
          Student Canteen ID
        </p>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "6px",
          gap: "3px",
          overflow: "hidden",
        }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={student.full_name}
            style={{
              width: "44px",
              height: "44px",
              objectFit: "cover",
              borderRadius: "5px",
              border: "2px solid oklch(0.577 0.245 27.325)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "5px",
              border: "2px solid oklch(0.577 0.245 27.325)",
              backgroundColor: "#fff3f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px",
              color: "oklch(0.577 0.245 27.325)",
              flexShrink: 0,
            }}
          >
            {student.first_name.charAt(0).toUpperCase()}
          </div>
        )}
        <p
          style={{
            fontWeight: 700,
            fontSize: "9px",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {student.full_name}
        </p>
        <p
          style={{
            color: "oklch(0.577 0.245 27.325)",
            fontSize: "8px",
            margin: 0,
            fontWeight: 700,
          }}
        >
          {student.grade_level}
        </p>
        <p style={{ color: "#555", fontSize: "7px", margin: 0 }}>
          🍽 {student.student_type_label}
        </p>
        {enrolledFormatted && (
          <p style={{ fontSize: "6.5px", color: "#444", margin: 0 }}>
            Enrolled: {enrolledFormatted}
          </p>
        )}
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "5px",
            padding: "3px",
            marginTop: "2px",
          }}
        >
          <QRCode
            value={student.qr_code}
            style={{ width: "58px", height: "58px", display: "block" }}
          />
        </div>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "5.5px",
            color: "#888",
            margin: 0,
          }}
        >
          {student.qr_code}
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: "#fff3f0",
          borderTop: "1px solid #fdd8cc",
          padding: "3px 4px",
        }}
      >
        <p
          style={{
            fontSize: "5px",
            color: "#666",
            margin: 0,
            textAlign: "center",
          }}
        >
          Scan QR to view wallet balance
          {student.enrollment_date
            ? ` • Valid S.Y. ${getSchoolYear(student.enrollment_date)}`
            : ""}
        </p>
      </div>
    </div>
  );
}

function BatchQrModal({ open, onClose, students }: BatchQrModalProps) {
  const [cols, setCols] = useState<1 | 2 | 3>(2);
  const [printRoot, setPrintRoot] = useState<HTMLDivElement | null>(null);

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
    <>
      <style>{`
        @media screen { #qr-print-root { display: none !important; } }
        @media print {
          body * { visibility: hidden; }
          #qr-print-root { visibility: visible; position: absolute; top: 0; left: 0; width: 100%; background: white; }
          #qr-print-root * { visibility: visible; }
        }
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 53.98mm)`,
          gap: "4mm",
          padding: "8mm",
          justifyContent: "center",
        }}
      >
        {students.map((s) => (
          <PrintCard key={s.id} student={s} />
        ))}
      </div>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Print QR Codes ({students.length} selected)
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Cards per row:
            </span>
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCols(n)}
                className={cn(
                  "rounded-lg border px-3 py-1 text-sm",
                  cols === n
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-border hover:bg-muted/40",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Screen preview — portrait card aspect ratio */}
          <div
            className={cn(
              "grid gap-3 mt-2 justify-items-center",
              cols === 1
                ? "grid-cols-1"
                : cols === 2
                  ? "grid-cols-2"
                  : "grid-cols-3",
            )}
          >
            {students.map((s) => (
              <div key={s.id} className="w-[152px] h-[240px]">
                <QrCard student={s} />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
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
              !canToggle && "cursor-default",
            )}
          >
            {month.short} &apos;{String(payment.year).slice(-2)}{" "}
            {isPaid ? "✓" : "✗"}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeletedStudentCard
// ---------------------------------------------------------------------------

function DeletedStudentCard({ student }: { student: Student }) {
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: () => studentApi.restore(student.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student restored.");
    },
  });

  const removedDate = student.deleted_at
    ? new Date(student.deleted_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-4 opacity-75">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {student.first_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate line-through text-muted-foreground">
            {student.full_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {student.grade_level}
            {student.section ? ` · ${student.section}` : ""}
          </p>
          {removedDate && (
            <p className="text-xs text-destructive mt-0.5">
              Removed: {removedDate}
            </p>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => restoreMutation.mutate()}
          disabled={restoreMutation.isPending}
          className="shrink-0"
        >
          {restoreMutation.isPending ? "Restoring…" : "Restore"}
        </Button>
      </div>
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

  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!student.photo_url) return;
    let objectUrl: string | null = null;
    const { token, activeBranch } = useAuthStore.getState();
    const headers: Record<string, string> = { Accept: "image/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBranch) headers["X-Branch-Id"] = String(activeBranch.id);
    fetch(student.photo_url, { headers })
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPhotoSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [student.photo_url]);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 relative",
        isSubscription
          ? "border-l-4 border-l-orange-400"
          : "border-l-4 border-l-purple-500",
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
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={student.full_name}
            className="h-10 w-10 shrink-0 rounded-full object-cover border border-primary/20"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {student.first_name.charAt(0).toUpperCase()}
          </div>
        )}
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
                  : "bg-purple-100 text-purple-700 border-purple-300",
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

  const [showDeleted, setShowDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
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
        showDeleted,
        activeTab,
        search,
        gradeFilter,
        statusFilter,
        monthFilter,
        yearFilter,
        paymentStatusFilter,
      },
    ],
    queryFn: () =>
      studentApi.list(
        showDeleted
          ? {
              deleted: 1,
              search: search || undefined,
              grade: gradeFilter || undefined,
            }
          : {
              search: search || undefined,
              grade: gradeFilter || undefined,
              status: statusFilter || undefined,
              type: activeTab !== "all" ? activeTab : undefined,
              month:
                activeTab === "subscription" && monthFilter
                  ? (monthFilter as SchoolMonth)
                  : undefined,
              year:
                activeTab === "subscription" && yearFilter
                  ? Number(yearFilter)
                  : undefined,
              payment_status:
                activeTab === "subscription" && paymentStatusFilter
                  ? paymentStatusFilter
                  : undefined,
            },
      ),
  });

  const allStudents = data?.data ?? [];
  const subscriptionStudents = allStudents.filter(
    (s) => s.student_type === "subscription",
  );
  const nonSubStudents = allStudents.filter(
    (s) => s.student_type === "non_subscription",
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
          <SelectTrigger
            className="w-full sm:w-40"
            aria-label="Filter by grade"
          >
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

        {!showDeleted && (
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v ?? ""))}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter by status"
            >
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
        )}

        {!showDeleted && activeTab === "subscription" && (
          <>
            <Select
              value={monthFilter}
              onValueChange={(v) =>
                setMonthFilter(v === "all" ? "" : (v ?? ""))
              }
            >
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Filter by month"
              >
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
              value={yearFilter}
              onValueChange={(v) => setYearFilter(v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger
                className="w-full sm:w-32"
                aria-label="Filter by year"
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - 2 + i,
                ).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
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
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Filter by payment status"
              >
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

        <button
          type="button"
          onClick={() => setShowDeleted((prev) => !prev)}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-colors sm:ml-auto",
            showDeleted
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-border hover:bg-muted/40 text-muted-foreground",
          )}
        >
          {showDeleted ? "Hide Deleted" : "Show Deleted"}
        </button>
      </div>

      {/* Type tabs — hidden in deleted mode */}
      {!showDeleted && (
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
                  : "border-border hover:bg-muted/40 text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

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
      ) : showDeleted ? (
        !allStudents.length ? (
          <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            No removed students found.
          </div>
        ) : (
          <div className="space-y-3">
            {allStudents.map((s) => (
              <DeletedStudentCard key={s.id} student={s} />
            ))}
          </div>
        )
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
