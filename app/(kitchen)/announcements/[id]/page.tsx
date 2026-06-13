"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, UserRound } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { announcementApi } from "@/lib/api/announcements";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["announcement", id],
    queryFn: () => announcementApi.show(Number(id)),
  });

  const announcement = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError || !announcement) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link href="/announcements" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Announcements
        </Link>
        <p className="text-sm text-destructive">Failed to load announcement.</p>
      </div>
    );
  }

  const RecipientIcon = announcement.recipient_type === "parents" ? Users : UserRound;
  const recipientLabel = announcement.recipient_type === "parents" ? "Parents" : "Staff";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/announcements"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Announcements
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold">
          {announcement.title ?? "Announcement"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Sent by {announcement.sender_name} ·{" "}
          {new Date(announcement.created_at).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <RecipientIcon className="h-4 w-4" aria-hidden="true" />
          To: {recipientLabel} · {announcement.recipient_count} sent
        </p>
      </div>

      {/* Message */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="whitespace-pre-wrap text-sm">{announcement.message}</p>
      </div>

      {/* Recipients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recipients</h2>
          <span className="text-xs text-muted-foreground">
            {announcement.recipients.filter((r) => r.read_at !== null).length} read /{" "}
            {announcement.recipients.length} total
          </span>
        </div>
        {announcement.recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recipients recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Read At</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {announcement.recipients.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                          r.read_at
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {r.read_at ? "Read ✓" : "Unread"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.read_at ? relativeTime(r.read_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
