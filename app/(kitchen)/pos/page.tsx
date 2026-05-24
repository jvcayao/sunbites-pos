"use client";

import { useEffect, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryApi } from "@/lib/api/inventory";
import { posMenuItemApi } from "@/lib/api/pos-menu-items";
import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";
import type { AdjustStockPayload, InventoryItem, InventoryLogType } from "@/types/inventory";
import type { MenuCategory, PosMenuItem } from "@/types/pos-menu-item";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORIES: MenuCategory[] = ["meal", "snack", "drink", "extra"];
const LOG_TYPES: InventoryLogType[] = ["restock", "waste", "manual", "sale"];

function CategoryBadge({ category }: { category: MenuCategory }) {
  const styles: Record<MenuCategory, string> = {
    meal: "bg-primary/10 text-primary",
    snack: "bg-amber-50 text-amber-700",
    drink: "bg-blue-50 text-blue-700",
    extra: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[category]}`}
    >
      {category}
    </span>
  );
}

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

const createMenuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid price"),
  category: z.enum(["meal", "snack", "drink", "extra"] as const, {
    error: "Category is required",
  }),
});

type CreateMenuItemForm = z.infer<typeof createMenuItemSchema>;

const adjustStockSchema = z.object({
  direction: z.enum(["add", "deduct"] as const),
  type: z.enum(["restock", "waste", "manual", "sale"] as const),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Must be greater than 0"),
  reason: z.string().min(1, "Reason is required"),
});

type AdjustStockForm = z.infer<typeof adjustStockSchema>;

// ---------------------------------------------------------------------------
// Stock Adjustment Modal
// ---------------------------------------------------------------------------

interface StockAdjustmentModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

function StockAdjustmentModal({ item, onClose }: StockAdjustmentModalProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AdjustStockForm>({
    direction: "add",
    type: "restock",
    quantity: "",
    reason: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  useEffect(() => {
    if (item) {
      setValues({ direction: "add", type: "restock", quantity: "", reason: "" });
      setErrors({});
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (payload: AdjustStockPayload) =>
      inventoryApi.adjust(item!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["references-inventory"] });
      toast.success("Stock adjusted successfully.");
      onClose();
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to adjust stock.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = adjustStockSchema.safeParse(values);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(result.data);
  }

  const currentQty = parseFloat(item?.quantity ?? "0");
  const inputQty = parseFloat(values.quantity) || 0;
  const newTotal =
    values.direction === "add"
      ? currentQty + inputQty
      : Math.max(0, currentQty - inputQty);

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup
              value={values.direction}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, direction: v as "add" | "deduct" }))
              }
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="add" id="dir-add" />
                <Label htmlFor="dir-add">Add</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="deduct" id="dir-deduct" />
                <Label htmlFor="dir-deduct">Deduct</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-type">Type</Label>
            <Select
              value={values.type}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, type: v as InventoryLogType }))
              }
            >
              <SelectTrigger id="adj-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">
              Quantity ({item?.unit})
            </Label>
            <Input
              id="adj-qty"
              type="number"
              min="0"
              step="0.01"
              value={values.quantity}
              onChange={(e) => setValues((prev) => ({ ...prev, quantity: e.target.value }))}
              aria-invalid={!!errors.quantity}
            />
            {errors.quantity && (
              <p role="alert" className="text-xs text-destructive">{errors.quantity[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <Input
              id="adj-reason"
              value={values.reason}
              onChange={(e) => setValues((prev) => ({ ...prev, reason: e.target.value }))}
              aria-invalid={!!errors.reason}
            />
            {errors.reason && (
              <p role="alert" className="text-xs text-destructive">{errors.reason[0]}</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-semibold text-foreground">{item?.quantity} {item?.unit}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              New Total: <span className="font-semibold text-foreground">{newTotal.toFixed(2)} {item?.unit}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Adjustment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Menu Management Tab
// ---------------------------------------------------------------------------

function MenuMgmtTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CreateMenuItemForm>>({ name: "", price: "" });
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string[]>>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["pos-menu-items"],
    queryFn: posMenuItemApi.list,
  });

  const addMutation = useMutation({
    mutationFn: posMenuItemApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setForm({ name: "", price: "" });
      toast.success("Menu item added.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to add item."),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => posMenuItemApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] }),
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to toggle item."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => posMenuItemApi.destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setDeletingId(null);
      toast.success("Menu item deleted.");
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to delete item.");
      setDeletingId(null);
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const result = createMenuItemSchema.safeParse(form);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      return;
    }
    setFormErrors({});
    addMutation.mutate(result.data);
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load menu items.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Item grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-24 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : !items?.length ? (
        <p className="text-sm text-muted-foreground">No menu items yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onToggle={() => toggleMutation.mutate(item.id)}
              onDelete={() => setDeletingId(item.id)}
              isToggling={toggleMutation.isPending && toggleMutation.variables === item.id}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Add New Item</h3>
        <form onSubmit={handleAdd} noValidate className="flex flex-wrap gap-3">
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={form.name ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              aria-invalid={!!formErrors.name}
            />
            {formErrors.name && (
              <p role="alert" className="text-xs text-destructive">{formErrors.name[0]}</p>
            )}
          </div>
          <div className="w-28 space-y-1">
            <Label htmlFor="new-price">Price (₱)</Label>
            <Input
              id="new-price"
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              aria-invalid={!!formErrors.price}
            />
            {formErrors.price && (
              <p role="alert" className="text-xs text-destructive">{formErrors.price[0]}</p>
            )}
          </div>
          <div className="w-36 space-y-1">
            <Label htmlFor="new-category">Category</Label>
            <Select
              value={form.category ?? ""}
              onValueChange={(v) => setForm((p) => ({ ...p, category: v as MenuCategory }))}
            >
              <SelectTrigger id="new-category" aria-invalid={!!formErrors.category}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.category && (
              <p role="alert" className="text-xs text-destructive">{formErrors.category[0]}</p>
            )}
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "+ Add Item"}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this menu item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
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

interface MenuItemCardProps {
  item: PosMenuItem;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}

function MenuItemCard({ item, onToggle, onDelete, isToggling }: MenuItemCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">₱{item.price}</p>
        </div>
        <CategoryBadge category={item.category} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          role="switch"
          aria-checked={item.is_available}
          aria-label={`Toggle availability for ${item.name}`}
          onClick={onToggle}
          disabled={isToggling}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            item.is_available ? "bg-primary" : "bg-muted"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-3 w-3 translate-x-1 rounded-full bg-white transition-transform ${
              item.is_available ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span className="text-xs text-muted-foreground">
          {item.is_available ? "Available" : "Unavailable"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory Tab
// ---------------------------------------------------------------------------

function InventoryTab() {
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["pos-inventory"],
    queryFn: inventoryApi.listForPos,
  });

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load inventory.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Threshold</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(6)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdjustingItem(item)}
                  >
                    Adjust
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <StockAdjustmentModal
        item={adjustingItem}
        onClose={() => setAdjustingItem(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PosPage() {
  const user = useAuthStore((state) => state.user);

  const canManageMenu =
    user?.roles.includes("admin") || user?.roles.includes("manager");
  const canViewInventory =
    user?.roles.includes("admin") ||
    user?.roles.includes("manager") ||
    user?.roles.includes("supervisor");

  return (
    <div className="p-6">
      <div>
        <p className="text-xs text-muted-foreground">POS</p>
        <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
      </div>

      <Tabs defaultValue="pos" className="mt-6">
        <TabsList>
          <TabsTrigger value="pos">POS</TabsTrigger>
          <TabsTrigger value="transaction-history">Transaction History</TabsTrigger>
          <TabsTrigger value="menu-mgmt">Menu Management</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-4">
          <p className="text-sm text-muted-foreground">
            POS checkout will be available in the next update.
          </p>
        </TabsContent>

        <TabsContent value="transaction-history" className="mt-4">
          <p className="text-sm text-muted-foreground">
            Transaction history will be available in the next update.
          </p>
        </TabsContent>

        <TabsContent value="menu-mgmt" className="mt-4">
          {canManageMenu ? (
            <MenuMgmtTab />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only admins and managers can manage menu items.
            </p>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          {canViewInventory ? (
            <InventoryTab />
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have access to inventory.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
