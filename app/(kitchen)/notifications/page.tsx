"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staffNotificationApi } from "@/lib/api/staff-notifications";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

import type { StaffNotification } from "@/types/staff-notification";

// ---------------------------------------------------------------------------
// Date grouping
// ---------------------------------------------------------------------------

function groupByDate(
  items: StaffNotification[]
): { label: string; items: StaffNotification[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  return [
    { label: "Today", items: items.filter((n) => new Date(n.created_at) >= startOfToday) },
    {
      label: "Yesterday",
      items: items.filter(
        (n) =>
          new Date(n.created_at) >= startOfYesterday &&
          new Date(n.created_at) < startOfToday
      ),
    },
    {
      label: "Earlier",
      items: items.filter((n) => new Date(n.created_at) < startOfYesterday),
    },
  ].filter((g) => g.items.length > 0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNotificationTitle(notification: StaffNotification): string {
  if (notification.type === "App\\Notifications\\AnnouncementNotification") {
    return notification.data.title ?? "Announcement";
  }
  return "New Pre-Registration";
}

function getNotificationPreview(notification: StaffNotification): string {
  if (notification.type === "App\\Notifications\\AnnouncementNotification") {
    const { message } = notification.data;
    return message.length > 120 ? message.slice(0, 120) + "…" : message;
  }
  const { student_name, enrollment_type, branch_name } = notification.data;
  return `${student_name} — ${enrollment_type} at ${branch_name}`;
}

function getNotificationHref(notification: StaffNotification): string {
  if (notification.type === "App\\Notifications\\AnnouncementNotification") {
    return `/announcements/${notification.data.announcement_id}`;
  }
  return `/pre-registrations/${notification.data.pre_registration_id}`;
}

// ---------------------------------------------------------------------------
// NotificationRow
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
}

function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
  isMarkingRead,
  isDeleting,
}: NotificationRowProps) {
  const router = useRouter();
  const isUnread = notification.read_at === null;
  const title = getNotificationTitle(notification);
  const preview = getNotificationPreview(notification);
  const href = getNotificationHref(notification);

  function handleRowClick() {
    if (isUnread) onMarkRead(notification.id);
    router.push(href);
  }

  return (
    <div
      role="article"
      aria-label={title}
      className={cn(
        "group relative flex cursor-pointer items-start gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/30",
        isUnread && "bg-primary/5",
        (isMarkingRead || isDeleting) && "pointer-events-none opacity-60"
      )}
      onClick={handleRowClick}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          isUnread ? "bg-primary" : "bg-transparent"
        )}
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(notification.created_at)}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{preview}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`More options for: ${title}`}
            />
          }
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          {isUnread && (
            <DropdownMenuItem
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
            >
              Mark as read
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StaffNotificationsPage() {
  const queryClient = useQueryClient();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-notifications"],
    queryFn: () => staffNotificationApi.list(),
  });

  const { data: unreadData } = useQuery({
    queryKey: ["staff-unread-count"],
    queryFn: () => staffNotificationApi.unreadCount(),
  });

  const notifications = data?.data ?? [];
  const unreadCount = unreadData?.count ?? 0;

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["staff-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["staff-unread-count"] });
  }

  const markReadMutation = useMutation({
    mutationFn: (id: string) => staffNotificationApi.markRead(id),
    onSuccess: invalidateAll,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => staffNotificationApi.markAllRead(),
    onSuccess: () => {
      invalidateAll();
      toast.success("All notifications marked as read.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffNotificationApi.destroy(id),
    onSuccess: invalidateAll,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await staffNotificationApi.markAllRead();
      await Promise.all(notifications.map((n) => staffNotificationApi.destroy(n.id)));
    },
    onSuccess: () => {
      invalidateAll();
      setClearDialogOpen(false);
      toast.success("All notifications cleared.");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <NotificationSkeleton />
      </div>
    );
  }

  const displayed =
    activeTab === "unread"
      ? notifications.filter((n) => n.read_at === null)
      : notifications;

  const groups = groupByDate(displayed);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>Mark all read</span>
            </Button>
          )}

          {notifications.length > 0 && (
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Clear all notifications"
                  />
                }
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Clear all</span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your notifications. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => clearAllMutation.mutate()}
                    disabled={clearAllMutation.isPending}
                  >
                    {clearAllMutation.isPending ? "Clearing…" : "Clear all"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "all"}
          className={cn(
            "px-3 py-2 text-sm transition-colors",
            activeTab === "all"
              ? "-mb-px border-b-2 border-primary font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "unread"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
            activeTab === "unread"
              ? "-mb-px border-b-2 border-primary font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("unread")}
        >
          Unread
          {unreadCount > 0 && (
            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">You&apos;re all caught up</p>
        </div>
      )}

      {/* Grouped list */}
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
            {group.label}
          </p>
          <div>
            {group.items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
                isMarkingRead={
                  markReadMutation.isPending && markReadMutation.variables === n.id
                }
                isDeleting={deleteMutation.isPending && deleteMutation.variables === n.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
