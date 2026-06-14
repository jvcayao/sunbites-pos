"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ParentStatusBadge } from "@/components/parents/parent-status-badge";
import { parentApi } from "@/lib/api/parents";
import { cn } from "@/lib/utils";

import type { Parent } from "@/types/parent";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ParentTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-16 rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}

function ParentRow({
  parent,
  onClick,
}: {
  parent: Parent;
  onClick: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/30 cursor-pointer",
        parent.deleted_at && "opacity-60",
      )}
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {parent.full_name.charAt(0).toUpperCase()}
          </div>
          <p className="font-medium text-foreground">{parent.full_name}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {parent.email}
      </td>
      <td className="px-4 py-3 text-sm text-center">{parent.students_count}</td>
      <td className="px-4 py-3">
        <ParentStatusBadge
          deletedAt={parent.deleted_at}
          isDisabled={parent.is_disabled}
          isActivated={parent.is_activated}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          View
        </Button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ParentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["parents", { search: debouncedSearch, page, includeDeleted }],
    queryFn: () =>
      parentApi.list({
        search: debouncedSearch || undefined,
        page,
        include_deleted: includeDeleted ? 1 : undefined,
      }),
  });

  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">References</p>
          <h1 className="text-xl font-bold text-foreground">
            Parent Management
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-border"
              aria-label="Show deleted parents"
            />
            Show deleted
          </label>
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-xs"
            aria-label="Search parents"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        {isError ? (
          <div className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load parents. Please try again.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                  Students
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ParentTableSkeleton />
              ) : !data?.data?.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No parents found.
                  </td>
                </tr>
              ) : (
                data.data.map((parent) => (
                  <ParentRow
                    key={parent.id}
                    parent={parent}
                    onClick={() =>
                      router.push(`/references/parents/${parent.id}`)
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 font-medium text-foreground">
              {page} / {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={page === meta.last_page}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
