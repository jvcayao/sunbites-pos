"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { announcementApi } from "@/lib/api/announcements";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/relative-time";

import type { Announcement } from "@/types/announcement";

// ---------------------------------------------------------------------------
// Date grouping
// ---------------------------------------------------------------------------

function groupByDate(
  items: Announcement[]
): { label: string; items: Announcement[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  return [
    { label: "Today", items: items.filter((a) => new Date(a.created_at) >= startOfToday) },
    {
      label: "Yesterday",
      items: items.filter(
        (a) =>
          new Date(a.created_at) >= startOfYesterday &&
          new Date(a.created_at) < startOfToday
      ),
    },
    {
      label: "Earlier",
      items: items.filter((a) => new Date(a.created_at) < startOfYesterday),
    },
  ].filter((g) => g.items.length > 0);
}

// ---------------------------------------------------------------------------
// AnnouncementRow
// ---------------------------------------------------------------------------

function AnnouncementRow({ item }: { item: Announcement }) {
  return (
    <Link
      href={`/announcements/${item.id}`}
      className="flex items-start gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/30"
      aria-label={item.title ?? "Announcement"}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(item.created_at)}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.message_preview}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              item.recipient_type === "parents"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            )}
          >
            {item.recipient_type === "parents" ? "Parents" : "Staff"}
          </span>
          <span className="text-xs text-muted-foreground">
            by {item.sender_name} · {item.recipient_count} sent · {item.read_count} read
          </span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnnouncementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementApi.list(),
  });

  const announcements = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Announcements</h1>
        <Link href="/announcements/create" className={buttonVariants({ size: "sm" })}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New Announcement
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-md px-2 py-2.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No announcements yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first announcement to notify parents or staff.
          </p>
          <Link
            href="/announcements/create"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
          >
            Send your first announcement
          </Link>
        </div>
      ) : (
        groupByDate(announcements).map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div>
              {group.items.map((item) => (
                <AnnouncementRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
