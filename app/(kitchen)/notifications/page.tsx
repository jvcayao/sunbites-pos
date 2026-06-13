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

interface NotificationCardProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
}

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  isMarkingRead,
  isDeleting,
}: NotificationCardProps) {
  const router = useRouter();
  const isUnread = notification.read_at === null;
  const title = getNotificationTitle(notification);
  const preview = getNotificationPreview(notification);
  const href = getNotificationHref(notification);

  function handleCardClick() {
    if (isUnread) {
      onMarkRead(notification.id);
    }
    router.push(href);
  }

  return (
    <div
      role="article"
      aria-label={title}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30",
        isUnread && "border-primary/30 bg-primary/5",
        (isMarkingRead || isDeleting) && "pointer-events-none opacity-60"
      )}
      onClick={handleCardClick}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            isUnread ? "bg-primary" : "bg-transparent"
          )}
        />
        <div className="min-w-0 space-y-1">
          <p className={cn("text-sm", isUnread ? "font-semibold" : "font-medium")}>{title}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{preview}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(notification.created_at)}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
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
        <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function StaffNotificationsPage() {
  const queryClient = useQueryClient();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

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

  return (
    <div className="space-y-4">
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
                    This will permanently delete all your notifications. This action cannot be
                    undone.
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

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border py-16 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">You&apos;re all caught up</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationCard
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
      )}
    </div>
  );
}
