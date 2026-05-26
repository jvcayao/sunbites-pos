"use client";

import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

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

import type { ApiError } from "@/types/auth";
import type {
  CreateInventoryItemPayload,
  InventoryItem,
  InventoryLog,
  UpdateInventoryItemPayload,
} from "@/types/inventory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OK: "bg-green-100 text-green-700 border-green-300",
    LOW: "bg-yellow-100 text-amber-700 border-yellow-300",
    OUT: "bg-red-100 text-destructive border-red-300",
  };
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid number"),
  unit: z.string().min(1, "Unit is required"),
  restock_threshold: z
    .string()
    .min(1, "Threshold is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid number"),
});

const editItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  restock_threshold: z
    .string()
    .min(1, "Threshold is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid number"),
});

type CreateItemForm = z.infer<typeof createItemSchema>;
type EditItemForm = z.infer<typeof editItemSchema>;

// ---------------------------------------------------------------------------
// Edit Dialog
// ---------------------------------------------------------------------------

interface EditDialogProps {
  item: InventoryItem | null;
  onClose: () => void;
}

function EditDialog({ item, onClose }: EditDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<EditItemForm>({ name: "", unit: "", restock_threshold: "" });
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  useEffect(() => {
    if (item) {
      startTransition(() => {
        setValues({ name: item.name, unit: item.unit, restock_threshold: item.restock_threshold });
        setErrors({});
      });
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data: UpdateInventoryItemPayload) =>
      inventoryApi.update(item!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
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
    mutation.mutate(result.data);
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          {(
            [
              { id: "edit-name", field: "name", label: "Name" },
              { id: "edit-unit", field: "unit", label: "Unit" },
              { id: "edit-threshold", field: "restock_threshold", label: "Restock Threshold" },
            ] as const
          ).map(({ id, field, label }) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                value={values[field]}
                onChange={(e) => setValues((p) => ({ ...p, [field]: e.target.value }))}
                aria-invalid={!!errors[field]?.length}
              />
              {errors[field] && (
                <p role="alert" className="text-xs text-destructive">
                  {errors[field]![0]}
                </p>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Logs Dialog
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
          <DialogTitle>Adjustment Logs — {item?.name}</DialogTitle>
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
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: InventoryLog) => (
                <TableRow key={log.id}>
                  <TableCell className="capitalize">{log.type}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={parseFloat(log.quantity_change) >= 0 ? "text-green-600" : "text-destructive"}>
                      {parseFloat(log.quantity_change) >= 0 ? "+" : ""}{log.quantity_change}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{log.stock_after}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.reason}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </TableCell>
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
  const [form, setForm] = useState<Partial<CreateItemForm>>({
    name: "",
    quantity: "",
    unit: "",
    restock_threshold: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  const mutation = useMutation({
    mutationFn: (data: CreateInventoryItemPayload) => inventoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      setForm({ name: "", quantity: "", unit: "", restock_threshold: "" });
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
    mutation.mutate(result.data);
  }

  const fields: Array<{ id: string; field: keyof CreateItemForm; label: string; type?: string }> = [
    { id: "add-name", field: "name", label: "Item Name" },
    { id: "add-qty", field: "quantity", label: "Initial Qty", type: "number" },
    { id: "add-unit", field: "unit", label: "Unit" },
    { id: "add-threshold", field: "restock_threshold", label: "Threshold", type: "number" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Add New Item</h3>
      <form onSubmit={handleSubmit} noValidate className="flex flex-wrap gap-3">
        {fields.map(({ id, field, label, type }) => (
          <div key={field} className="min-w-[120px] flex-1 space-y-1">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              type={type ?? "text"}
              min={type === "number" ? "0" : undefined}
              step={type === "number" ? "0.01" : undefined}
              value={(form[field] as string) ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
              aria-invalid={!!errors[field]?.length}
            />
            {errors[field] && (
              <p role="alert" className="text-xs text-destructive">
                {errors[field]![0]}
              </p>
            )}
          </div>
        ))}
        <div className="flex items-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "+ Add"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReferencesInventoryPage() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [logsItem, setLogsItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["references-inventory"],
    queryFn: inventoryApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      setDeletingId(null);
      setDeleteError(null);
      toast.success("Item deleted.");
    },
    onError: (err: ApiError) => {
      setDeleteError(err.message ?? "Failed to delete item.");
    },
  });

  return (
    <div className="p-6">
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
      </div>

      <div className="mt-6 rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-destructive">
                  Failed to load inventory.
                </TableCell>
              </TableRow>
            ) : !items?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No inventory items.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{item.restock_threshold}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setLogsItem(item)}>
                        Logs
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setDeletingId(item.id); setDeleteError(null); }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <AddItemForm />
      </div>

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
            Are you sure you want to delete this item? Items with adjustment history cannot be deleted.
          </p>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setDeletingId(null); setDeleteError(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingId !== null && deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
