"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { posMenuItemApi } from "@/lib/api/pos-menu-items";
import { useCartStore } from "@/lib/store/cart";

import type { MenuCategory } from "@/types/pos-menu-item";

type CategoryFilter = "all" | MenuCategory;

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "meal", label: "Meal" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drink" },
  { value: "extra", label: "Extra" },
];

const CATEGORY_BADGE_STYLES: Record<MenuCategory, string> = {
  meal: "bg-primary/10 text-primary",
  snack: "bg-amber-50 text-amber-700",
  drink: "bg-blue-50 text-blue-700",
  extra: "bg-muted text-muted-foreground",
};

function MenuItemSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
      <div className="mb-3 h-6 w-1/2 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
    </div>
  );
}

interface Props {
  className?: string;
}

export function MenuGrid({ className }: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }

  const { data: allItems, isLoading, isError } = useQuery({
    queryKey: ["pos-menu-items"],
    queryFn: posMenuItemApi.list,
  });

  const availableItems = allItems?.filter((item) => item.is_available) ?? [];

  const filteredItems = availableItems.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !debouncedSearch ||
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function getCartQty(itemId: number): number {
    return cartItems.find((ci) => ci.id === itemId)?.quantity ?? 0;
  }

  if (isError) {
    return (
      <div className={cn("rounded-xl border border-border p-6 text-center", className)}>
        <p className="text-sm text-destructive">Failed to load menu items.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Search */}
      <input
        id="pos-item-search"
        type="text"
        placeholder="Search menu items…"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
      />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "rounded-full px-3.5 py-1 text-sm font-medium transition-colors",
              activeCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:border-primary/50"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MenuItemSkeleton key={i} />
          ))}
        </div>
      ) : !filteredItems.length ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item) => {
            const qty = getCartQty(item.id);
            const inCart = qty > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  addItem({ id: item.id, name: item.name, price: parseFloat(item.price) })
                }
                className={cn(
                  "relative rounded-xl border p-4 text-left transition-all",
                  inCart
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                {inCart && (
                  <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                    {qty}
                  </span>
                )}
                <p className="mb-1 text-sm font-bold leading-tight text-foreground">
                  {item.name}
                </p>
                <p className="text-xl font-extrabold text-primary">
                  ₱{parseFloat(item.price).toFixed(2)}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    CATEGORY_BADGE_STYLES[item.category]
                  )}
                >
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
