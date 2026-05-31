"use client";

import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inventoryApi } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type {
  CreateInventoryItemPayload,
  InventoryHistoryFilters,
  InventoryHistoryLog,
  InventoryItem,
  InventoryLog,
  UpdateInventoryItemPayload,
} from "@/types/inventory";

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES: Record<string, string> = {
  OK: "bg-green-100 text-green-700 border-green-300",
  LOW: "bg-yellow-100 text-amber-700 border-yellow-300",
  OUT: "bg-red-100 text-destructive border-red-300",
  OVER: "bg-orange-100 text-orange-700 border-orange-300",
};

const STATUS_LABEL: Record<string, string> = {
  OK: "OK ✓",
  LOW: "LOW ⚠",
  OUT: "OUT ✕",
  OVER: "OVER ▲",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${STATUS_BADGE_STYLES[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Log Type Badge (for history)
// ---------------------------------------------------------------------------

const LOG_TYPE_STYLES: Record<string, string> = {
  restock: "bg-green-100 text-green-700 border-green-300",
  sale: "bg-red-100 text-red-700 border-red-300",
  waste: "bg-red-100 text-red-700 border-red-300",
  manual: "bg-muted text-muted-foreground border-border",
};

function LogTypeBadge({ type, label }: { type: string; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium capitalize ${LOG_TYPE_STYLES[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {label ?? type}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// History row color helper
// ---------------------------------------------------------------------------

function historyRowClass(type: string): string {
  if (type === "restock") return "bg-green-50";
  if (type === "sale" || type === "waste") return "bg-red-50";
  return "bg-muted/30";
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const optionalPositiveNumber = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine(
    (v) => v === undefined || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    "Must be a valid number"
  );

const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid number"),
  unit: z.string().min(1, "Unit is required"),
  restock_threshold: z
    .string()
    .min(1, "Low alert quantity is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid number"),
  overstock_threshold: optionalPositiveNumber,
  cost_per_unit: optionalPositiveNumber,
});

const editItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  restock_threshold: z
    .string()
    .min(1, "Low alert quantity is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid number"),
  overstock_threshold: optionalPositiveNumber,
  cost_per_unit: optionalPositiveNumber,
});

type CreateItemForm = {
  name: string;
  quantity: string;
  unit: string;
  restock_threshold: string;
  overstock_threshold?: string;
  cost_per_unit?: string;
};

type EditItemForm = {
  name: string;
  unit: string;
  restock_threshold: string;
  overstock_threshold?: string;
  cost_per_unit?: string;
};

// ---------------------------------------------------------------------------
// Edit Dialog
// ---------------------------------------------------------------------------

interface EditDialogProps {
  item: InventoryItem | null;
  onClose: () => void;
}

function EditDialog({ item, onClose }: EditDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<EditItemForm>({
    name: "",
    unit: "",
    restock_threshold: "",
    overstock_threshold: "",
    cost_per_unit: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  useEffect(() => {
    if (item) {
      startTransition(() => {
        setValues({
          name: item.name,
          unit: item.unit,
          restock_threshold: item.restock_threshold,
          overstock_threshold: item.overstock_threshold ?? "",
          cost_per_unit: item.cost_per_unit ?? "",
        });
        setErrors({});
      });
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data: UpdateInventoryItemPayload) =>
      inventoryApi.update(item!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      toast.success("Item updated.");
      onClose();
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to update item."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = editItemSchema.safeParse(values);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    const { name, unit, restock_threshold, overstock_threshold, cost_per_unit } = result.data;
    mutation.mutate({
      name,
      unit,
      restock_threshold,
      overstock_threshold: overstock_threshold ?? null,
      cost_per_unit: cost_per_unit ?? null,
    });
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit: {item?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={values.name}
                onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
                aria-invalid={!!errors.name?.length}
              />
              {errors.name && (
                <p role="alert" className="text-xs text-destructive">{errors.name[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-unit">Unit *</Label>
              <Input
                id="edit-unit"
                value={values.unit}
                onChange={(e) => setValues((p) => ({ ...p, unit: e.target.value }))}
                aria-invalid={!!errors.unit?.length}
              />
              {errors.unit && (
                <p role="alert" className="text-xs text-destructive">{errors.unit[0]}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-threshold">Low Alert Qty *</Label>
              <Input
                id="edit-threshold"
                type="number"
                min="0"
                step="0.01"
                value={values.restock_threshold}
                onChange={(e) => setValues((p) => ({ ...p, restock_threshold: e.target.value }))}
                aria-invalid={!!errors.restock_threshold?.length}
              />
              {errors.restock_threshold && (
                <p role="alert" className="text-xs text-destructive">{errors.restock_threshold[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-overstock">Overstock Qty</Label>
              <Input
                id="edit-overstock"
                type="number"
                min="0"
                step="0.01"
                value={values.overstock_threshold ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, overstock_threshold: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cost">Cost per Unit (₱)</Label>
              <Input
                id="edit-cost"
                type="number"
                min="0"
                step="0.01"
                value={values.cost_per_unit ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, cost_per_unit: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Logs Dialog (per-item history)
// ---------------------------------------------------------------------------

interface LogsDialogProps {
  item: InventoryItem | null;
  onClose: () => void;
}

function LogsDialog({ item, onClose }: LogsDialogProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["inventory-logs", item?.id],
    queryFn: () => inventoryApi.logs(item!.id),
    enabled: item !== null,
  });

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stock History: {item?.name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((k) => <Skeleton key={k} className="h-8 w-full" />)}
          </div>
        ) : !logs?.length ? (
          <p className="py-4 text-sm text-muted-foreground">No adjustment logs.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Adjusted By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: InventoryLog) => (
                <TableRow key={log.id} className={historyRowClass(log.type)}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <LogTypeBadge type={log.type} label={log.type_label} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={parseFloat(log.quantity_change) >= 0 ? "text-green-600" : "text-destructive"}>
                      {parseFloat(log.quantity_change) >= 0 ? "+" : ""}{log.quantity_change}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{log.stock_after}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.reason}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.adjusted_by ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Item Form
// ---------------------------------------------------------------------------

function AddItemForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateItemForm>({
    name: "",
    quantity: "",
    unit: "",
    restock_threshold: "",
    overstock_threshold: "",
    cost_per_unit: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  const mutation = useMutation({
    mutationFn: (data: CreateInventoryItemPayload) => inventoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      setForm({ name: "", quantity: "", unit: "", restock_threshold: "", overstock_threshold: "", cost_per_unit: "" });
      toast.success("Item added.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to add item."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = createItemSchema.safeParse(form);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    const { name, quantity, unit, restock_threshold, overstock_threshold, cost_per_unit } = result.data;
    mutation.mutate({
      name,
      quantity,
      unit,
      restock_threshold,
      overstock_threshold: overstock_threshold ?? null,
      cost_per_unit: cost_per_unit ?? null,
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Add New Inventory Item</h3>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label htmlFor="add-name">Name *</Label>
            <Input
              id="add-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              aria-invalid={!!errors.name?.length}
            />
            {errors.name && (
              <p role="alert" className="text-xs text-destructive">{errors.name[0]}</p>
            )}
          </div>
          <div className="w-28 space-y-1">
            <Label htmlFor="add-unit">Unit *</Label>
            <Input
              id="add-unit"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              aria-invalid={!!errors.unit?.length}
            />
            {errors.unit && (
              <p role="alert" className="text-xs text-destructive">{errors.unit[0]}</p>
            )}
          </div>
          <div className="w-28 space-y-1">
            <Label htmlFor="add-qty">Initial Qty *</Label>
            <Input
              id="add-qty"
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              aria-invalid={!!errors.quantity?.length}
            />
            {errors.quantity && (
              <p role="alert" className="text-xs text-destructive">{errors.quantity[0]}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-32 space-y-1">
            <Label htmlFor="add-threshold">Low Alert Qty *</Label>
            <Input
              id="add-threshold"
              type="number"
              min="0"
              step="0.01"
              value={form.restock_threshold}
              onChange={(e) => setForm((p) => ({ ...p, restock_threshold: e.target.value }))}
              aria-invalid={!!errors.restock_threshold?.length}
            />
            {errors.restock_threshold && (
              <p role="alert" className="text-xs text-destructive">{errors.restock_threshold[0]}</p>
            )}
          </div>
          <div className="w-32 space-y-1">
            <Label htmlFor="add-overstock">Overstock Qty</Label>
            <Input
              id="add-overstock"
              type="number"
              min="0"
              step="0.01"
              value={form.overstock_threshold ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, overstock_threshold: e.target.value }))}
            />
          </div>
          <div className="w-36 space-y-1">
            <Label htmlFor="add-cost">Cost per Unit (₱)</Label>
            <Input
              id="add-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.cost_per_unit ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, cost_per_unit: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "+ Add Item"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-Item History Section
// ---------------------------------------------------------------------------

const HISTORY_LOG_TYPES = [
  { value: "", label: "All Types" },
  { value: "restock", label: "Restock" },
  { value: "waste", label: "Waste" },
  { value: "manual", label: "Manual" },
  { value: "sale", label: "Sale" },
];

interface HistorySectionProps {
  items: InventoryItem[];
}

function HistorySection({ items }: HistorySectionProps) {
  const [filters, setFilters] = useState<InventoryHistoryFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<InventoryHistoryFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory-history", appliedFilters, page],
    queryFn: () => inventoryApi.history({ ...appliedFilters, page }),
  });

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  const meta = data?.meta;
  const logs = data?.data;

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Inventory History</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="hist-from">From</Label>
          <Input
            id="hist-from"
            type="date"
            className="w-38"
            value={filters.from ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value || undefined }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hist-to">To</Label>
          <Input
            id="hist-to"
            type="date"
            className="w-38"
            value={filters.to ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value || undefined }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hist-type">Type</Label>
          <Select
            value={filters.type ?? ""}
            onValueChange={(v) => setFilters((p) => ({ ...p, type: v || undefined }))}
          >
            <SelectTrigger id="hist-type" className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_LOG_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="hist-item">Item</Label>
          <Select
            value={filters.item_id !== undefined ? String(filters.item_id) : ""}
            onValueChange={(v) =>
              setFilters((p) => ({ ...p, item_id: v ? Number(v) : undefined }))
            }
          >
            <SelectTrigger id="hist-item" className="w-44">
              <SelectValue placeholder="All Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Items</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={applyFilters}>
          Apply Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">After</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Adjusted By</TableHead>
              <TableHead>Order #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-destructive">
                  Failed to load history.
                </TableCell>
              </TableRow>
            ) : !logs?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No history records found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: InventoryHistoryLog) => (
                <TableRow key={log.id} className={historyRowClass(log.type)}>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{log.item_name_snapshot}</TableCell>
                  <TableCell>
                    <LogTypeBadge type={log.type} label={log.type_label} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={parseFloat(log.quantity_change) >= 0 ? "text-green-600" : "text-destructive"}>
                      {parseFloat(log.quantity_change) >= 0 ? "+" : ""}{log.quantity_change}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{log.stock_after}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.reason}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.adjusted_by ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.order_id ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * (meta.per_page) + 1}–{Math.min(page * meta.per_page, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReferencesInventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"inventory" | "history">("inventory");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [logsItem, setLogsItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["references-inventory"],
    queryFn: inventoryApi.list,
  });

  const activeItems = items?.filter((item) => !item.is_archived) ?? [];
  const archivedItems = items?.filter((item) => item.is_archived) ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setDeletingId(null);
      setDeleteError(null);
      toast.success("Item deleted.");
    },
    onError: (err: ApiError) => {
      setDeleteError(err.message ?? "Failed to delete item.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setArchivingId(null);
      toast.success("Item archived.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to archive item."),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      toast.success("Item unarchived.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to unarchive item."),
  });

  const COLSPAN = 8;

  function renderTableRows(rows: InventoryItem[], archived = false) {
    if (!rows.length) {
      return (
        <TableRow>
          <TableCell colSpan={COLSPAN} className="text-center text-sm text-muted-foreground">
            {archived ? "No archived items." : "No inventory items."}
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((item) => (
      <TableRow key={item.id} className={archived ? "opacity-60" : undefined}>
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell className="text-right">{item.quantity}</TableCell>
        <TableCell>{item.unit}</TableCell>
        <TableCell className="text-right">{item.restock_threshold}</TableCell>
        <TableCell className="text-right">
          {item.overstock_threshold ? item.overstock_threshold : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-right">
          {item.cost_per_unit ? `₱${parseFloat(item.cost_per_unit).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell>
          {item.status ? <StatusBadge status={item.status} /> : <span className="text-muted-foreground text-xs">—</span>}
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            {!archived && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setLogsItem(item)}>
                  History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { setDeletingId(item.id); setDeleteError(null); }}
                >
                  Delete
                </Button>
              </>
            )}
            {archived && (
              <Button
                variant="ghost"
                size="sm"
                disabled={unarchiveMutation.isPending && unarchiveMutation.variables === item.id}
                onClick={() => unarchiveMutation.mutate(item.id)}
              >
                Unarchive
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "inventory"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Inventory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "history"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          History
        </button>
      </div>

      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Add Item Form */}
          <AddItemForm />

          {/* Active Items Table */}
          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Low Alert</TableHead>
                  <TableHead className="text-right">Overstock</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(COLSPAN)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={COLSPAN} className="text-center text-sm text-destructive">
                      Failed to load inventory.
                    </TableCell>
                  </TableRow>
                ) : (
                  renderTableRows(activeItems)
                )}
              </TableBody>
            </Table>
          </div>

          {/* Archived Items — collapsible section */}
          {!isLoading && archivedItems.length > 0 && (
            <div className="rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setArchivedExpanded((p) => !p)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors rounded-xl"
              >
                <span>Archived Items ({archivedItems.length})</span>
                {archivedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {archivedExpanded && (
                <div className="border-t border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Low Alert</TableHead>
                        <TableHead className="text-right">Overstock</TableHead>
                        <TableHead className="text-right">Cost/Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderTableRows(archivedItems, true)}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <HistorySection items={activeItems} />
      )}

      {/* Edit dialog */}
      <EditDialog item={editingItem} onClose={() => setEditingItem(null)} />

      {/* Logs dialog */}
      <LogsDialog item={logsItem} onClose={() => setLogsItem(null)} />

      {/* Delete confirm dialog */}
      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => { if (!open) { setDeletingId(null); setDeleteError(null); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this item? Items with adjustment history cannot be deleted and must be archived instead.
          </p>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">{deleteError}</p>
          )}
          {deleteError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              This item has log history. Would you like to archive it instead?
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={archiveMutation.isPending}
                  onClick={() => {
                    if (deletingId !== null) {
                      setArchivingId(deletingId);
                      archiveMutation.mutate(deletingId, {
                        onSuccess: () => {
                          setDeletingId(null);
                          setDeleteError(null);
                          setArchivingId(null);
                        },
                      });
                    }
                  }}
                >
                  {archiveMutation.isPending && archivingId === deletingId ? "Archiving…" : "Archive Instead"}
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setDeletingId(null); setDeleteError(null); }}>
              Cancel
            </Button>
            {!deleteError && (
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deletingId !== null && deleteMutation.mutate(deletingId)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
