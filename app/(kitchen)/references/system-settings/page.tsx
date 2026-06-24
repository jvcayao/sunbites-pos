"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { systemConfigApi } from "@/lib/api/system-configurations";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type { SystemConfiguration } from "@/types/system-configuration";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CURRENCY_KEYS = new Set([
  "credit_limit",
  "daily_meal_rate",
  "loyalty_point_threshold",
]);

function formatValue(config: SystemConfiguration): string {
  if (config.type === "decimal" || config.type === "integer") {
    const num = Number(config.value);
    if (CURRENCY_KEYS.has(config.key)) {
      return `₱${num.toLocaleString("en-PH", {
        minimumFractionDigits: config.type === "decimal" ? 2 : 0,
        maximumFractionDigits: config.type === "decimal" ? 2 : 0,
      })}`;
    }
    return num.toLocaleString("en-PH");
  }
  return config.value;
}

// ---------------------------------------------------------------------------
// EditConfigDialog
// ---------------------------------------------------------------------------

interface EditConfigDialogProps {
  config: SystemConfiguration | null;
  onClose: () => void;
}

function EditConfigDialog({ config, onClose }: EditConfigDialogProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(config?.value ?? "");
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      startTransition(() => {
        setValue(config.value);
        setError(null);
        setSavedIndicator(false);
      });
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!config) throw new Error("No config selected.");
      return systemConfigApi.update(config.key, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-configurations"] });
      setSavedIndicator(true);
      setTimeout(() => {
        setSavedIndicator(false);
        onClose();
      }, 1500);
    },
    onError: (err: ApiError) => {
      setError(err.message ?? "An error occurred. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError("Value is required.");
      return;
    }
    if (
      (config?.type === "integer" || config?.type === "decimal") &&
      isNaN(Number(value))
    ) {
      setError("Please enter a valid number.");
      return;
    }
    if (
      (config?.type === "integer" || config?.type === "decimal") &&
      Number(value) < 0
    ) {
      setError("Value must be 0 or greater.");
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

  const inputStep =
    config?.type === "decimal"
      ? "0.01"
      : config?.type === "integer"
        ? "1"
        : undefined;
  const inputType =
    config?.type === "decimal" || config?.type === "integer"
      ? "number"
      : "text";

  return (
    <Dialog open={config !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit: {config?.label ?? ""}</DialogTitle>
        </DialogHeader>

        {config?.description && (
          <p className="text-sm text-muted-foreground">{config.description}</p>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-config-value">
              New Value <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-config-value"
              type={inputType}
              step={inputStep}
              min={inputType === "number" ? "0" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "edit-config-error" : undefined}
            />
            {error && (
              <p
                id="edit-config-error"
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
            <Button
              type="submit"
              disabled={mutation.isPending || savedIndicator}
            >
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Config row
// ---------------------------------------------------------------------------

interface ConfigTableRowProps {
  config: SystemConfiguration;
  onEdit: (config: SystemConfiguration) => void;
}

function ConfigTableRow({ config, onEdit }: ConfigTableRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/20">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">{config.label}</p>
        {config.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {config.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm font-semibold">{formatValue(config)}</td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEdit(config)}
        >
          Edit
        </Button>
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
        <Skeleton key={k} className="h-16 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SystemSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("admin") === true;
  const [editingConfig, setEditingConfig] =
    useState<SystemConfiguration | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-configurations"],
    queryFn: systemConfigApi.list,
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6">
      <p className="mt-1 text-sm text-muted-foreground">
        Configure system-wide business rules and rate constants.
      </p>

      {isError ? (
        <p className="text-sm text-destructive">
          Failed to load system settings. Please try again.
        </p>
      ) : isLoading ? (
        <TableSkeleton />
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">
          No system configurations found.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Current Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={cn("divide-y divide-border")}>
              {data.map((config) => (
                <ConfigTableRow
                  key={config.key}
                  config={config}
                  onEdit={setEditingConfig}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Changes take effect immediately across the system.
      </p>

      <EditConfigDialog
        config={editingConfig}
        onClose={() => setEditingConfig(null)}
      />
    </div>
  );
}
