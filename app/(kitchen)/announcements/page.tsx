"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { announcementApi } from "@/lib/api/announcements";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

import type { Announcement } from "@/types/announcement";

type AudienceFilter = "all" | "parents" | "staff";

function groupByDate(
  items: Announcement[],
): { label: string; items: Announcement[] }[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return [
    {
      label: "Today",
      items: items.filter((a) => new Date(a.created_at) >= startOfToday),
    },
    {
      label: "Earlier",
      items: items.filter((a) => new Date(a.created_at) < startOfToday),
    },
  ].filter((g) => g.items.length > 0);
}

function audienceLabel(recipientType: Announcement["recipient_type"]): string {
  return recipientType === "parents" ? "Parents" : "Staff";
}

function AnnouncementSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border border-l-4 border-l-muted bg-card p-4"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3 flex items-center gap-4">
            <Skeleton className="h-1.5 flex-1 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const isParents = item.recipient_type === "parents";
  const readPercent =
    item.recipient_count > 0
      ? Math.round((item.read_count / item.recipient_count) * 100)
      : 0;

  return (
    <Link
      href={`/announcements/${item.id}`}
      aria-label={item.title ?? "Announcement"}
      className={cn(
        "block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30 border-l-4",
        isParents ? "border-l-orange-400" : "border-l-indigo-400",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isParents ? "bg-orange-100" : "bg-indigo-100",
          )}
        >
          <Megaphone
            className={cn(
              "h-4 w-4",
              isParents ? "text-orange-600" : "text-indigo-500",
            )}
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground truncate">
              {item.title ?? "Announcement"}
            </p>
            <span
              className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                isParents
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-indigo-100 text-indigo-700 border-indigo-300",
              )}
            >
              {audienceLabel(item.recipient_type)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.message_preview}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span>{item.sender_name}</span>
            {" · "}
            {relativeTime(item.created_at)}
          </p>
        </div>
      </div>

      {/* Footer — read progress */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Read receipt
              </span>
              <span className="text-xs text-muted-foreground">
                {readPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isParents ? "bg-orange-400" : "bg-indigo-400",
                )}
                style={{ width: `${readPercent}%` }}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            <span>{item.recipient_count} sent</span>
            <span
              className={cn(
                item.read_count > 0 && "font-medium text-foreground",
              )}
            >
              {item.read_count} read
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function AnnouncementsPage() {
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementApi.list({ per_page: 50 }),
  });

  const announcements = data?.data ?? [];

  const filtered = announcements
    .filter(
      (a) => audienceFilter === "all" || a.recipient_type === audienceFilter,
    )
    .filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (a.title ?? "").toLowerCase().includes(q) ||
        a.message_preview.toLowerCase().includes(q) ||
        a.sender_name.toLowerCase().includes(q)
      );
    });

  const groups = groupByDate(filtered);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/announcements/create"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          + New Announcement
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search announcements…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search announcements"
        />
        <Select
          value={audienceFilter}
          onValueChange={(v) => setAudienceFilter(v as AudienceFilter)}
        >
          <SelectTrigger
            className="w-full sm:w-40"
            aria-label="Filter by audience"
          >
            <SelectValue placeholder="Audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Audiences</SelectItem>
            <SelectItem value="parents">Parents</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && <AnnouncementSkeleton />}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone
            className="mb-3 h-10 w-10 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-muted-foreground">
            {search || audienceFilter !== "all"
              ? "No announcements match your filters"
              : "No announcements yet"}
          </p>
        </div>
      )}

      {/* Grouped cards */}
      {!isLoading &&
        groups.map((group) => (
          <div key={group.label} className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              <Separator className="flex-1" />
            </div>
            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
