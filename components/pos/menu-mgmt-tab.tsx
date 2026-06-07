"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { posMenuItemApi } from "@/lib/api/pos-menu-items";
import { inventoryApi } from "@/lib/api/inventory";
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

import type { ApiError } from "@/types/auth";
import type { MenuCategory, PosMenuItem, UpdateMenuItemPayload } from "@/types/pos-menu-item";
import type { InventoryIngredient, InventoryItem } from "@/types/inventory";

const CATEGORIES: MenuCategory[] = ["meal", "snack", "drink", "extra"];

const CATEGORY_BADGE_STYLES: Record<MenuCategory, string> = {
  meal: "bg-primary/10 text-primary",
  snack: "bg-amber-50 text-amber-700",
  drink: "bg-blue-50 text-blue-700",
  extra: "bg-muted text-muted-foreground",
};

function CategoryBadge({ category }: { category: MenuCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        CATEGORY_BADGE_STYLES[category]
      )}
    >
      {category}
    </span>
  );
}

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
      "Must be a valid price"
    ),
  category: z.enum(["meal", "snack", "drink", "extra"] as const, {
    error: "Category is required",
  }),
});

type MenuItemForm = z.infer<typeof menuItemSchema>;

// ---------------------------------------------------------------------------
// Ingredient mapping panel
// ---------------------------------------------------------------------------

interface IngredientsPanelProps {
  menuItem: PosMenuItem;
  inventoryItems: InventoryItem[];
}

function IngredientsPanel({ menuItem, inventoryItems }: IngredientsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qtyUsed, setQtyUsed] = useState("1");
  const [addError, setAddError] = useState<string | null>(null);

  const { data: ingredients, isLoading } = useQuery({
    queryKey: ["menu-item-ingredients", menuItem.id],
    queryFn: () => inventoryApi.listIngredients(menuItem.id),
  });

  const attachMutation = useMutation({
    mutationFn: ({ inventoryItemId, quantity }: { inventoryItemId: number; quantity: number }) =>
      inventoryApi.attachIngredient(menuItem.id, { inventory_item_id: inventoryItemId, quantity_used: quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-item-ingredients", menuItem.id] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setSelectedItemId("");
      setQtyUsed("1");
      setAddError(null);
      toast.success("Stock link added.");
    },
    onError: (err: ApiError) => setAddError(err.message ?? "Failed to add ingredient."),
  });

  const detachMutation = useMutation({
    mutationFn: (inventoryItemId: number) =>
      inventoryApi.detachIngredient(menuItem.id, inventoryItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-item-ingredients", menuItem.id] });
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      toast.success("Stock link removed.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to remove ingredient."),
  });

  const mappedIds = new Set((ingredients ?? []).map((i: InventoryIngredient) => i.inventory_item_id));
  const unmappedItems = inventoryItems.filter((inv) => !mappedIds.has(inv.id));

  // Derive the display item from state. If the selected ID is no longer in unmappedItems
  // (item was just linked), treat the selection as empty — avoids both the stale-value
  // display bug and any setState-in-effect lint violation.
  const selectedInvItem = unmappedItems.find((inv) => String(inv.id) === selectedItemId);
  const effectiveSelectedItemId = selectedInvItem ? selectedItemId : "";

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!effectiveSelectedItemId) {
      setAddError("Select an inventory item.");
      return;
    }
    const qty = parseFloat(qtyUsed);
    if (isNaN(qty) || qty <= 0) {
      setAddError("Quantity must be greater than 0.");
      return;
    }
    attachMutation.mutate({ inventoryItemId: Number(effectiveSelectedItemId), quantity: qty });
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
      <p className="mb-2 font-semibold text-foreground">Linked Stock</p>

      {isLoading ? (
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      ) : !ingredients?.length ? (
        <p className="text-muted-foreground text-xs">No stock linked yet.</p>
      ) : (
        <table className="w-full mb-2">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1 font-medium">Inventory Item</th>
              <th className="pb-1 font-medium">Qty Deducted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing: InventoryIngredient) => (
              <tr key={ing.inventory_item_id} className="border-t border-border/50">
                <td className="py-1">{ing.name}</td>
                <td className="py-1 text-muted-foreground">
                  {ing.quantity_used} {ing.unit}
                </td>
                <td className="py-1 text-right">
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                    disabled={detachMutation.isPending && detachMutation.variables === ing.inventory_item_id}
                    onClick={() => detachMutation.mutate(ing.inventory_item_id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add ingredient form */}
      <form onSubmit={handleAdd} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[120px]">
          <Select value={effectiveSelectedItemId} onValueChange={(v) => setSelectedItemId(v ?? "")}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select inventory item">
                {selectedInvItem
                  ? `${selectedInvItem.name} (${selectedInvItem.unit})`
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {unmappedItems.map((inv) => (
                <SelectItem key={inv.id} value={String(inv.id)} className="text-xs">
                  {inv.name} ({inv.unit})
                </SelectItem>
              ))}
              {unmappedItems.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">All items linked</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="w-16">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            className="h-8 text-xs"
            value={qtyUsed}
            onChange={(e) => setQtyUsed(e.target.value)}
            aria-label="Quantity used per sale"
          />
        </div>
        <Button type="submit" size="sm" className="h-8" disabled={attachMutation.isPending}>
          {attachMutation.isPending ? "Linking…" : "Add Link"}
        </Button>
      </form>
      {addError && (
        <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {addError}
        </p>
      )}

      <p className="mt-3 flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-700">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        All menu items must have at least one stock item linked before they can be sold at checkout.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu Item Card
// ---------------------------------------------------------------------------

interface MenuItemCardProps {
  item: PosMenuItem;
  inventoryItems: InventoryItem[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling: boolean;
}

function MenuItemCard({ item, inventoryItems, onToggle, onEdit, onDelete, isToggling }: MenuItemCardProps) {
  const [showIngredients, setShowIngredients] = useState(false);

  return (
    <div className={cn("flex flex-col justify-between rounded-lg border border-border bg-card p-4", !item.is_available && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xl font-extrabold text-primary">₱{parseFloat(item.price).toFixed(2)}</p>
        </div>
        <CategoryBadge category={item.category} />
      </div>

      {/* Not-linked warning badge */}
      {!item.has_inventory_mapping && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
          <AlertCircle className="h-3 w-3 shrink-0" />
          Not linked
        </span>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          role="switch"
          aria-checked={item.is_available}
          aria-label={`Toggle availability for ${item.name}`}
          onClick={onToggle}
          disabled={isToggling}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50",
            item.is_available ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 translate-x-1 rounded-full bg-white transition-transform",
              item.is_available && "translate-x-5"
            )}
          />
        </button>
        <span className="text-xs text-muted-foreground">
          {item.is_available ? "Available" : "Unavailable"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIngredients((p) => !p)}
            className="text-xs"
          >
            Link Stock
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
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

      {showIngredients && (
        <IngredientsPanel menuItem={item} inventoryItems={inventoryItems} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MenuMgmtTab
// ---------------------------------------------------------------------------

export function MenuMgmtTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<MenuItemForm>>({
    name: "",
    price: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string[]>>>({});
  const [addSubscriptionItem, setAddSubscriptionItem] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<PosMenuItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItemForm>>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<string, string[]>>>({});
  const [editSubscriptionItem, setEditSubscriptionItem] = useState<boolean | null>(null);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["pos-menu-items"],
    queryFn: posMenuItemApi.list,
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["references-inventory"],
    queryFn: inventoryApi.list,
  });

  const activeInventoryItems = inventoryItems?.filter((i) => !i.is_archived) ?? [];

  const addMutation = useMutation({
    mutationFn: posMenuItemApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setForm({ name: "", price: "" });
      setAddSubscriptionItem(null);
      toast.success("Menu item added.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to add item."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMenuItemPayload }) =>
      posMenuItemApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] });
      setEditingItem(null);
      toast.success("Menu item updated.");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Failed to update item."),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => posMenuItemApi.toggle(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pos-menu-items"] }),
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
    const result = menuItemSchema.safeParse(form);
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }
    setFormErrors({});
    addMutation.mutate({ ...result.data, is_subscription_item: addSubscriptionItem });
  }

  function openEdit(item: PosMenuItem) {
    setEditingItem(item);
    setEditForm({ name: item.name, price: item.price, category: item.category });
    setEditSubscriptionItem(item.is_subscription_item);
    setEditErrors({});
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    const result = menuItemSchema.safeParse(editForm);
    if (!result.success) {
      setEditErrors(result.error.flatten().fieldErrors);
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }
    setEditErrors({});
    updateMutation.mutate({ id: editingItem.id, payload: { ...result.data, is_subscription_item: editSubscriptionItem } });
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load menu items.</p>;
  }

  return (
    <div className="space-y-6">
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
              <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {formErrors.name[0]}
              </p>
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
              <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {formErrors.price[0]}
              </p>
            )}
          </div>
          <div className="w-36 space-y-1">
            <Label htmlFor="new-category">Category</Label>
            <Select
              value={form.category ?? ""}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, category: v as MenuCategory }))
              }
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
              <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {formErrors.category[0]}
              </p>
            )}
          </div>
          <div className="w-44 space-y-1">
            <Label htmlFor="new-subscription-item">Subscription Eligible</Label>
            <Select
              value={addSubscriptionItem === true ? "true" : addSubscriptionItem === false ? "false" : "unset"}
              onValueChange={(v) =>
                setAddSubscriptionItem(v === "true" ? true : v === "false" ? false : null)
              }
            >
              <SelectTrigger id="new-subscription-item">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not configured</SelectItem>
                <SelectItem value="true">Yes — subscription covered</SelectItem>
                <SelectItem value="false">No — regular only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "+ Add Item"}
            </Button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-24 animate-pulse rounded-lg border border-border bg-muted"
            />
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
              inventoryItems={activeInventoryItems}
              onToggle={() => toggleMutation.mutate(item.id)}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeletingId(item.id)}
              isToggling={
                toggleMutation.isPending && toggleMutation.variables === item.id
              }
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} noValidate className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                aria-invalid={!!editErrors.name}
              />
              {editErrors.name && (
                <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {editErrors.name[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-price">Price (₱)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={editForm.price ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                aria-invalid={!!editErrors.price}
              />
              {editErrors.price && (
                <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {editErrors.price[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editForm.category ?? ""}
                onValueChange={(v) => setEditForm((p) => ({ ...p, category: v as MenuCategory }))}
              >
                <SelectTrigger id="edit-category" aria-invalid={!!editErrors.category}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.category && (
                <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {editErrors.category[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-subscription-item">Subscription Eligible</Label>
              <Select
                value={editSubscriptionItem === true ? "true" : editSubscriptionItem === false ? "false" : "unset"}
                onValueChange={(v) =>
                  setEditSubscriptionItem(v === "true" ? true : v === "false" ? false : null)
                }
              >
                <SelectTrigger id="edit-subscription-item">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not configured</SelectItem>
                  <SelectItem value="true">Yes — subscription covered</SelectItem>
                  <SelectItem value="false">No — regular only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
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
              onClick={() =>
                deletingId !== null && deleteMutation.mutate(deletingId)
              }
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
