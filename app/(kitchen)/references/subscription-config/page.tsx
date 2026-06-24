"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { studentApi } from "@/lib/api/students";
import { subscriptionConfigApi } from "@/lib/api/pos-subscription-config";
import { systemConfigApi } from "@/lib/api/system-configurations";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type { BranchMonthlyAmountConfig } from "@/types/student";
import type { BranchSubscriptionConfig } from "@/lib/api/pos-subscription-config";

// ---------------------------------------------------------------------------
// Daily Limits Card
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<keyof BranchSubscriptionConfig, string> = {
  meal_daily_limit: "Meal",
  snack_daily_limit: "Snack",
  drink_daily_limit: "Drink",
  extra_daily_limit: "Extra",
};

function DailyLimitsCard() {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState<Partial<BranchSubscriptionConfig>>(
    {},
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pos-subscription-config"],
    queryFn: subscriptionConfigApi.show,
  });

  const limits: BranchSubscriptionConfig | null = data
    ? { ...data, ...overrides }
    : null;

  const saveMutation = useMutation({
    mutationFn: (updated: BranchSubscriptionConfig) =>
      subscriptionConfigApi.update(updated),
    onSuccess: (updated) => {
      queryClient.setQueryData(["pos-subscription-config"], updated);
      setOverrides({});
      toast.success("Daily limits saved.");
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Failed to save limits."),
  });

  function handleChange(field: keyof BranchSubscriptionConfig, raw: string) {
    const value = Math.min(10, Math.max(0, parseInt(raw, 10) || 0));
    setOverrides((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!limits) return;
    saveMutation.mutate(limits);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-1 text-base font-semibold text-foreground">
        Daily Category Limits
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Maximum items a subscription student can order per category per day.
      </p>

      {isError && (
        <p className="text-sm text-destructive">Failed to load limits.</p>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {limits && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              Object.keys(CATEGORY_LABELS) as (keyof BranchSubscriptionConfig)[]
            ).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`limit-${field}`}>
                  {CATEGORY_LABELS[field]}
                </Label>
                <Input
                  id={`limit-${field}`}
                  type="number"
                  min={0}
                  max={10}
                  value={limits[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Limits"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fallback used only while the system configuration is loading. */
const DAILY_MEAL_RATE_FALLBACK = 135;
const YEAR_MIN = 2020;
const YEAR_MAX = 2099;

// ---------------------------------------------------------------------------
// Edit Days Dialog
// ---------------------------------------------------------------------------

interface EditDaysDialogProps {
  row: BranchMonthlyAmountConfig | null;
  year: number;
  dailyMealRate: number;
  onClose: () => void;
}

function EditDaysDialog({
  row,
  year,
  dailyMealRate,
  onClose,
}: EditDaysDialogProps) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(row?.days ?? 0);
  const [amountOverride, setAmountOverride] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync days input when a new row is selected (dialog re-opens for a different month)
  useEffect(() => {
    if (row) {
      startTransition(() => {
        setDays(row.days);
        setAmountOverride("");
        setError(null);
      });
    }
  }, [row]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!row) throw new Error("No row selected.");
      const overrideAmount =
        amountOverride.trim() !== "" &&
        !isNaN(parseFloat(amountOverride)) &&
        parseFloat(amountOverride) > 0
          ? parseFloat(amountOverride)
          : undefined;
      if (row.is_configured && row.id !== null) {
        return studentApi.updateBranchMonthlyAmount(row.id, {
          days,
          ...(overrideAmount !== undefined ? { amount: overrideAmount } : {}),
        });
      }
      return studentApi.createBranchMonthlyAmount({
        school_month: row.school_month,
        year,
        days,
        ...(overrideAmount !== undefined ? { amount: overrideAmount } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["branch-monthly-amounts", year],
      });
      onClose();
    },
    onError: (err: ApiError) => {
      setError(err.message ?? "An error occurred. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (days < 0 || days > 31) {
      setError("Days must be between 0 and 31.");
      return;
    }
    if (year < YEAR_MIN || year > YEAR_MAX) {
      setError(`Year must be between ${YEAR_MIN} and ${YEAR_MAX}.`);
      return;
    }
    if (amountOverride.trim() !== "") {
      const overrideNum = parseFloat(amountOverride);
      if (isNaN(overrideNum) || overrideNum <= 0) {
        setError("Amount override must be a positive number.");
        return;
      }
    }
    setError(null);
    mutation.mutate();
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError(null);
      setAmountOverride("");
      onClose();
    }
  }

  const computedAmount = days * dailyMealRate;
  const isZeroDays = days === 0;

  function handleDaysChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setDays(value);
    if (value === 0) {
      setAmountOverride("");
    }
  }

  return (
    <Dialog open={row !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {row?.label ?? ""} — {year}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-days">
              School Days <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-days"
              type="number"
              min={0}
              max={31}
              value={days}
              onChange={handleDaysChange}
              aria-invalid={!!error}
            />
            <p className="text-xs text-muted-foreground">
              Computed amount:{" "}
              <span className="font-semibold text-primary">
                ₱{computedAmount.toLocaleString()}
              </span>{" "}
              {isZeroDays ? (
                <span className="text-muted-foreground">(no charge)</span>
              ) : (
                <>
                  (₱{dailyMealRate} × {days} days)
                </>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-amount-override">
              Amount Override{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="edit-amount-override"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Leave blank to use computed amount"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              disabled={isZeroDays}
            />
            {isZeroDays ? (
              <p className="text-xs text-muted-foreground">
                No charge — month has no school activity. Students will not be
                billed for this month.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Leave blank to use computed amount.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface ConfigRowProps {
  row: BranchMonthlyAmountConfig;
  year: number;
  onEdit: (row: BranchMonthlyAmountConfig) => void;
}

function ConfigRow({ row, year, onEdit }: ConfigRowProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => studentApi.deleteBranchMonthlyAmount(row.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["branch-monthly-amounts", year],
      });
    },
  });

  function handleDelete() {
    if (!window.confirm(`Revert ${row.label} to default?`)) return;
    deleteMutation.mutate();
  }

  return (
    <tr className="border-b border-border hover:bg-muted/20">
      <td className="px-4 py-3 text-sm font-medium">{row.label}</td>
      <td className="px-4 py-3 text-sm">{row.days}</td>
      <td className="px-4 py-3 text-sm">
        ₱{Number(row.amount).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "text-[11px] font-bold px-2.5 py-1 rounded-full border",
            row.is_configured
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          {row.is_configured ? "Configured" : "Default"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(row)}
          >
            Edit
          </Button>
          {row.is_configured && row.id !== null && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              {deleteMutation.isPending ? "Reverting…" : "Revert"}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2 mt-4">
      {[1, 2, 3].map((k) => (
        <Skeleton key={k} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SubscriptionConfigPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") === true;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [editingRow, setEditingRow] =
    useState<BranchMonthlyAmountConfig | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branch-monthly-amounts", year],
    queryFn: () => studentApi.getBranchMonthlyAmounts(year),
    enabled: isAdmin,
  });

  const { data: systemConfigs } = useQuery({
    queryKey: ["system-configurations"],
    queryFn: systemConfigApi.list,
    enabled: isAdmin,
  });

  const dailyMealRate =
    Number(systemConfigs?.find((c) => c.key === "daily_meal_rate")?.value) ||
    DAILY_MEAL_RATE_FALLBACK;

  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6">
      <p className="mt-1 text-sm text-muted-foreground">
        Daily meal rate: ₱{dailyMealRate}. Amount = days × rate.
      </p>

      <DailyLimitsCard />

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <Label htmlFor="config-year" className="shrink-0">
          School Year
        </Label>
        <Input
          id="config-year"
          type="number"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Failed to load configuration. Please try again.
        </p>
      ) : isLoading ? (
        <TableSkeleton />
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">
          No configuration data found for {year}.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Month
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <ConfigRow
                  key={`${row.school_month}-${year}`}
                  row={row}
                  year={year}
                  onEdit={setEditingRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditDaysDialog
        row={editingRow}
        year={year}
        dailyMealRate={dailyMealRate}
        onClose={() => setEditingRow(null)}
      />
    </div>
  );
}
