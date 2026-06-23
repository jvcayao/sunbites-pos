"use client";

import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { mealPlannerApi } from "@/lib/api/meal-planner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";
import type {
  CategoryKey,
  DayOfWeekKey,
  MealRow,
  SchoolMonthKey,
} from "@/types/meal-planner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS: Array<{ key: SchoolMonthKey; label: string }> = [
  { key: "June", label: "Jun" },
  { key: "July", label: "Jul" },
  { key: "August", label: "Aug" },
  { key: "September", label: "Sep" },
  { key: "October", label: "Oct" },
  { key: "November", label: "Nov" },
  { key: "December", label: "Dec" },
  { key: "January", label: "Jan" },
  { key: "February", label: "Feb" },
  { key: "March", label: "Mar" },
];

const DAYS: DayOfWeekKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const DEFAULT_ROWS: MealRow[] = DAYS.map((day) => ({
  day,
  day_label: day.charAt(0).toUpperCase() + day.slice(1),
  ulam: "",
  vegetables: "",
  fruit: "",
  soup: "",
  snacks: "",
}));

interface FieldConfig {
  key: CategoryKey;
  label: string;
  bg: string;
}

const FIELDS: FieldConfig[] = [
  { key: "ulam", label: "Ulam", bg: "bg-orange-50" },
  { key: "vegetables", label: "Vegetables", bg: "bg-green-50" },
  { key: "fruit", label: "Fruit", bg: "bg-blue-50" },
  { key: "soup", label: "Soup", bg: "bg-sky-50" },
  { key: "snacks", label: "Snacks", bg: "bg-purple-50" },
];

// ---------------------------------------------------------------------------
// WeekVisibilityDialog
// ---------------------------------------------------------------------------

interface WeekVisibilityDialogProps {
  open: boolean;
  isCurrentlyVisible: boolean;
  monthLabel: string;
  weekNumber: number;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function WeekVisibilityDialog({
  open,
  isCurrentlyVisible,
  monthLabel,
  weekNumber,
  isPending,
  onConfirm,
  onClose,
}: WeekVisibilityDialogProps) {
  const isHiding = isCurrentlyVisible;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isHiding
              ? `Hide ${monthLabel} — Week ${weekNumber} from Parents?`
              : `Publish ${monthLabel} — Week ${weekNumber} to Parents?`}
          </DialogTitle>
          <DialogDescription>
            {isHiding
              ? "Parents will no longer see this week's meal plan in the portal."
              : "Parents will be able to see this week's meal plan in the portal."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className={cn(
              isHiding
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? isHiding
                ? "Hiding…"
                : "Publishing…"
              : isHiding
                ? "Yes, Hide It"
                : "Yes, Publish It"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MealPlannerPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const canEdit =
    user?.roles.includes("admin") || user?.roles.includes("manager");

  const [activeMonth, setActiveMonth] = useState<SchoolMonthKey>("June");
  const [activeWeek, setActiveWeek] = useState(1);
  const [rows, setRows] = useState<MealRow[]>(DEFAULT_ROWS);
  const [visibleToParents, setVisibleToParents] = useState<boolean>(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showWeekVisibilityDialog, setShowWeekVisibilityDialog] =
    useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["meal-planner", activeMonth, activeWeek],
    queryFn: () => mealPlannerApi.show(activeMonth, activeWeek),
  });

  useEffect(() => {
    startTransition(() => {
      if (data?.days?.length) {
        setRows(
          DAYS.map((day) => {
            const found = data.days.find((r) => r.day === day);
            return (
              found ?? {
                day,
                day_label: day.charAt(0).toUpperCase() + day.slice(1),
                ulam: "",
                vegetables: "",
                fruit: "",
                soup: "",
                snacks: "",
              }
            );
          }),
        );
      } else if (!isLoading) {
        setRows(DEFAULT_ROWS);
      }

      if (data?.visible_to_parents !== undefined) {
        setVisibleToParents(data.visible_to_parents);
      }
    });
  }, [data, isLoading]);

  const saveMutation = useMutation({
    mutationFn: () =>
      mealPlannerApi.update({
        month: activeMonth,
        week: activeWeek,
        rows: rows.map(({ day, ulam, vegetables, fruit, soup, snacks }) => ({
          day,
          ulam: ulam ?? "",
          vegetables: vegetables ?? "",
          fruit: fruit ?? "",
          soup: soup ?? "",
          snacks: snacks ?? "",
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["meal-planner", activeMonth, activeWeek],
      });
      toast.success(`Week ${activeWeek} of ${activeMonth} menu saved.`);
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Failed to save meal plan."),
  });

  const resetMutation = useMutation({
    mutationFn: () => mealPlannerApi.reset(activeMonth, activeWeek),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["meal-planner", activeMonth, activeWeek],
      });
      setShowResetConfirm(false);
      toast.success("Week reset to default pattern.");
    },
    onError: (err: ApiError) =>
      toast.error(err.message ?? "Failed to reset meal plan."),
  });

  const weekVisibilityMutation = useMutation({
    mutationFn: (newValue: boolean) =>
      mealPlannerApi.updateWeekVisibility(activeMonth, activeWeek, newValue),
    onMutate: (newValue) => {
      setVisibleToParents(newValue);
    },
    onSuccess: (response) => {
      setVisibleToParents(response.visible_to_parents);
      setShowWeekVisibilityDialog(false);
    },
    onError: () => {
      setVisibleToParents((prev) => !prev);
      setShowWeekVisibilityDialog(false);
      toast.error("Failed to update week visibility.");
    },
  });

  function updateCell(dayKey: DayOfWeekKey, field: CategoryKey, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.day === dayKey ? { ...r, [field]: value } : r)),
    );
  }

  const activeMonthLabel =
    MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;

  return (
    <div className="p-6">
      {/* Month tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {MONTHS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveMonth(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              activeMonth === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Week tabs */}
      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4].map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setActiveWeek(w)}
            className={cn(
              "rounded-md border px-4 py-1.5 text-sm transition-colors",
              activeWeek === w
                ? "border-primary bg-primary/10 font-bold text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            Week {w}
          </button>
        ))}
      </div>

      {/* Week visibility badge */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {activeMonthLabel} — Week {activeWeek}
        </span>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setShowWeekVisibilityDialog(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              visibleToParents
                ? "border-green-300 bg-green-100 text-green-700 hover:bg-green-200"
                : "border-border bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <span>
              {visibleToParents
                ? "● Visible to Parents"
                : "○ Hidden from Parents"}
            </span>
          </button>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              visibleToParents
                ? "border-green-300 bg-green-100 text-green-700"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {visibleToParents
              ? "● Visible to Parents"
              : "○ Hidden from Parents"}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        {isError ? (
          <p className="p-4 text-sm text-destructive">
            Failed to load meal plan.
          </p>
        ) : (
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border-b border-primary/20 px-4 py-2 text-left font-semibold">
                  Day
                </th>
                {FIELDS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="border-b border-primary/20 px-4 py-2 text-left font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? DAYS.map((day) => (
                    <tr key={day} className="border-b border-border">
                      <td className="bg-muted px-4 py-2 font-bold capitalize text-primary">
                        {day}
                      </td>
                      {FIELDS.map(({ key }) => (
                        <td key={key} className="px-4 py-2">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr
                      key={row.day}
                      className="border-b border-border last:border-0"
                    >
                      <td className="bg-muted px-4 py-2 font-bold capitalize text-primary">
                        {row.day_label || row.day}
                      </td>
                      {FIELDS.map(({ key, bg }) => (
                        <td key={key} className={cn(bg, "px-4 py-1.5")}>
                          {canEdit ? (
                            <Input
                              value={row[key] ?? ""}
                              onChange={(e) =>
                                updateCell(row.day, key, e.target.value)
                              }
                              className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                              aria-label={`${row.day} ${key}`}
                            />
                          ) : (
                            <span>{row[key] ?? ""}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowResetConfirm(true)}
            disabled={resetMutation.isPending}
          >
            Reset to Default
          </Button>
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save Week"}
          </Button>
        </div>
      )}

      {/* Reset confirm dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Meal Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will reset Week {activeWeek} of {activeMonth} to the default
            pattern. Any custom entries will be overwritten.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              {resetMutation.isPending ? "Resetting…" : "Reset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Week visibility confirm dialog */}
      <WeekVisibilityDialog
        open={showWeekVisibilityDialog}
        isCurrentlyVisible={visibleToParents}
        monthLabel={activeMonthLabel}
        weekNumber={activeWeek}
        isPending={weekVisibilityMutation.isPending}
        onConfirm={() => weekVisibilityMutation.mutate(!visibleToParents)}
        onClose={() => setShowWeekVisibilityDialog(false)}
      />
    </div>
  );
}
