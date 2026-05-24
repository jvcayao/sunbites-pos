"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { posMenuItemApi } from "@/lib/api/pos-menu-items";
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

interface MenuItemCardProps {
  item: PosMenuItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling: boolean;
}

function MenuItemCard({ item, onToggle, onEdit, onDelete, isToggling }: MenuItemCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">₱{parseFloat(item.price).toFixed(2)}</p>
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
    </div>
  );
}

export function MenuMgmtTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<MenuItemForm>>({
    name: "",
    price: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string[]>>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<PosMenuItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItemForm>>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<string, string[]>>>({});

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
      return;
    }
    setFormErrors({});
    addMutation.mutate(result.data);
  }

  function openEdit(item: PosMenuItem) {
    setEditingItem(item);
    setEditForm({ name: item.name, price: item.price, category: item.category });
    setEditErrors({});
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    const result = menuItemSchema.safeParse(editForm);
    if (!result.success) {
      setEditErrors(result.error.flatten().fieldErrors);
      return;
    }
    setEditErrors({});
    updateMutation.mutate({ id: editingItem.id, payload: result.data });
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load menu items.</p>;
  }

  return (
    <div className="space-y-6">
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
              <p role="alert" className="text-xs text-destructive">
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
              <p role="alert" className="text-xs text-destructive">
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
              <p role="alert" className="text-xs text-destructive">
                {formErrors.category[0]}
              </p>
            )}
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "+ Add Item"}
            </Button>
          </div>
        </form>
      </div>

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
                <p role="alert" className="text-xs text-destructive">{editErrors.name[0]}</p>
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
                <p role="alert" className="text-xs text-destructive">{editErrors.price[0]}</p>
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
                <p role="alert" className="text-xs text-destructive">{editErrors.category[0]}</p>
              )}
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
