"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Plus, Users, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { announcementApi } from "@/lib/api/announcements";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/relative-time";

import type { Announcement } from "@/types/announcement";

function AnnouncementRow({ item }: { item: Announcement }) {
  const recipientLabel = item.recipient_type === "parents" ? "Parents" : "Staff";
  const RecipientIcon = item.recipient_type === "parents" ? Users : UserRound;

  return (
    <Link
      href={`/announcements/${item.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {item.title && (
            <p className="truncate text-sm font-semibold">{item.title}</p>
          )}
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.message_preview}
          </p>
          <p className="text-xs text-muted-foreground">
            Sent by {item.sender_name} · {item.recipient_count} sent · {item.read_count} read
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              item.recipient_type === "parents"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            <RecipientIcon className="h-3 w-3" aria-hidden="true" />
            {recipientLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {relativeTime(item.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

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
            <div key={i} className="rounded-lg border border-border p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border py-16 text-center">
          <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
          <Link href="/announcements/create" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
            Send your first announcement
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((item) => (
            <AnnouncementRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
