"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, UserRound } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { announcementApi } from "@/lib/api/announcements";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-components — identical pattern to enrollment form
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-primary border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !announcement) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Link
          href="/announcements"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Announcements
        </Link>
        <p className="text-sm text-destructive">Failed to load announcement.</p>
      </div>
    );
  }

  const RecipientIcon =
    announcement.recipient_type === "parents" ? Users : UserRound;
  const recipientLabel =
    announcement.recipient_type === "parents" ? "Parents" : "Staff";

  const readCount = announcement.recipients.filter((r) => r.read_at !== null).length;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/announcements"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Announcements
      </Link>

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">
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
      <SectionCard title="Message">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {announcement.message}
        </p>
      </SectionCard>

      {/* Recipients */}
      <SectionCard title="Recipients">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Delivery report
          </p>
          <span className="text-xs font-semibold text-muted-foreground">
            {readCount} read / {announcement.recipients.length} total
          </span>
        </div>

        {announcement.recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recipients recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Read At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {announcement.recipients.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-full border",
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
      </SectionCard>
    </div>
  );
}
