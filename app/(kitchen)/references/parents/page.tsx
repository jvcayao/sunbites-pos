"use client";

import { startTransition, useCallback, useState } from "react";
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
// Types & constants
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "active" | "pending" | "disabled" | "deleted";

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "disabled", label: "Disabled" },
  { value: "deleted", label: "Deleted" },
];

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

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const params = {
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    page,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["parents", params],
    queryFn: () => parentApi.list(params),
  });

  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-xl font-bold text-foreground">Parent Management</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status pills */}
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => {
              setStatus(pill.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              status === pill.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {pill.label}
          </button>
        ))}

        {/* Search */}
        <Input
          placeholder="Search by name or email…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-8 w-[220px] text-xs"
          aria-label="Search parents"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {isError ? (
          <div className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load parents. Please try again.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                  Students
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <ParentTableSkeleton />
              ) : !data?.data?.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No{status !== "all" ? ` ${status}` : ""} parents found.
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
