"use client";

import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mealPlannerApi } from "@/lib/api/meal-planner";
import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";
import type { DayOfWeekKey, MealRow, SchoolMonthKey } from "@/types/meal-planner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS: Array<{ key: SchoolMonthKey; label: string }> = [
  { key: "june", label: "Jun" },
  { key: "july", label: "Jul" },
  { key: "august", label: "Aug" },
  { key: "september", label: "Sep" },
  { key: "october", label: "Oct" },
  { key: "november", label: "Nov" },
  { key: "december", label: "Dec" },
  { key: "january", label: "Jan" },
  { key: "february", label: "Feb" },
  { key: "march", label: "Mar" },
];

const DAYS: DayOfWeekKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const DEFAULT_ROWS: MealRow[] = DAYS.map((day) => ({
  day,
  day_label: day.charAt(0).toUpperCase() + day.slice(1),
  ulam: "",
  vegetables: "",
  fruit: "",
  soup: "",
}));

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MealPlannerPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const canEdit =
    user?.roles.includes("admin") || user?.roles.includes("manager");

  const [activeMonth, setActiveMonth] = useState<SchoolMonthKey>("june");
  const [activeWeek, setActiveWeek] = useState(1);
  const [rows, setRows] = useState<MealRow[]>(DEFAULT_ROWS);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["meal-planner", activeMonth, activeWeek],
    queryFn: () => mealPlannerApi.show(activeMonth, activeWeek),
  });

  useEffect(() => {
    startTransition(() => {
      if (data?.grid?.length) {
        setRows(
          DAYS.map((day) => {
            const found = data.grid.find((r) => r.day === day);
            return (
              found ?? {
                day,
                day_label: day.charAt(0).toUpperCase() + day.slice(1),
                ulam: "",
                vegetables: "",
                fruit: "",
                soup: "",
              }
            );
          })
        );
      } else if (!isLoading) {
        setRows(DEFAULT_ROWS);
      }
    });
  }, [data, isLoading]);

  const saveMutation = useMutation({
    mutationFn: () =>
      mealPlannerApi.update({
        month: activeMonth,
        week: activeWeek,
        rows: rows.map(({ day, ulam, vegetables, fruit, soup }) => ({
          day,
          ulam,
          vegetables,
          fruit,
          soup,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-planner", activeMonth, activeWeek] });
      toast.success(`Week ${activeWeek} of ${activeMonth} menu saved.`);
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to save meal plan."),
  });

  const resetMutation = useMutation({
    mutationFn: () => mealPlannerApi.reset(activeMonth, activeWeek),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-planner", activeMonth, activeWeek] });
      setShowResetConfirm(false);
      toast.success("Week reset to default pattern.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to reset meal plan."),
  });

  function updateCell(dayKey: DayOfWeekKey, field: keyof Omit<MealRow, "day" | "day_label">, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.day === dayKey ? { ...r, [field]: value } : r))
    );
  }

  const FIELDS: Array<{ key: keyof Omit<MealRow, "day" | "day_label">; label: string; bg: string }> = [
    { key: "ulam", label: "Ulam", bg: "bg-orange-50" },
    { key: "vegetables", label: "Vegetables", bg: "bg-green-50" },
    { key: "fruit", label: "Fruit", bg: "bg-blue-50" },
    { key: "soup", label: "Soup", bg: "bg-sky-50" },
  ];

  return (
    <div className="p-6">
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-2xl font-bold text-foreground">Meal Planner</h1>
      </div>

      {/* Month tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {MONTHS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveMonth(key)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              activeMonth === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
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
            className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
              activeWeek === w
                ? "border-primary bg-primary/10 font-bold text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        {isError ? (
          <p className="p-4 text-sm text-destructive">Failed to load meal plan.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border-b border-primary/20 px-4 py-2 text-left font-semibold">Day</th>
                {FIELDS.map(({ label }) => (
                  <th key={label} className="border-b border-primary/20 px-4 py-2 text-left font-semibold">
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
                    <tr key={row.day} className="border-b border-border last:border-0">
                      <td className="bg-muted px-4 py-2 font-bold capitalize text-primary">
                        {row.day_label || row.day}
                      </td>
                      {FIELDS.map(({ key, bg }) => (
                        <td key={key} className={`${bg} px-4 py-1.5`}>
                          {canEdit ? (
                            <Input
                              value={row[key]}
                              onChange={(e) => updateCell(row.day, key, e.target.value)}
                              className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                              aria-label={`${row.day} ${key}`}
                            />
                          ) : (
                            <span>{row[key]}</span>
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
            This will reset Week {activeWeek} of {activeMonth} to the default pattern. Any custom entries will be overwritten.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
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
    </div>
  );
}
