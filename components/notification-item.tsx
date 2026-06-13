"use client";

import { useRouter } from "next/navigation";
import { Megaphone, MoreHorizontal, UserPlus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

import type { StaffNotification } from "@/types/staff-notification";

interface NotificationItemProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
  onNavigate?: () => void;
}

function TypeIcon({ notification }: { notification: StaffNotification }) {
  if (notification.type === "App\\Notifications\\AnnouncementNotification") {
    return (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
        <Megaphone className="h-4 w-4 text-amber-600" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
      <UserPlus className="h-4 w-4 text-blue-600" aria-hidden="true" />
    </span>
  );
}

function getTitle(notification: StaffNotification): string {
  if (notification.type === "App\\Notifications\\AnnouncementNotification") {
    return notification.data.title ?? "Announcement";
  }
  return "New Pre-Registration";
}

function getPreview(notification: StaffNotification): string {
  if (notification.type === "App\\Notifications\\AnnouncementNotification") {
    return notification.data.message;
  }
  const { student_name, enrollment_type, branch_name } = notification.data;
  return `${student_name} — ${enrollment_type} · ${branch_name}`;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  isMarkingRead,
  isDeleting,
  onNavigate,
}: NotificationItemProps) {
  const router = useRouter();
  const isUnread = notification.read_at === null;

  function handleClick() {
    if (isUnread) {
      onMarkRead(notification.id);
    }
    if (notification.type === "App\\Notifications\\AnnouncementNotification") {
      router.push(`/announcements/${notification.data.announcement_id}`);
    } else {
      router.push(`/pre-registrations/${notification.data.pre_registration_id}`);
    }
    onNavigate?.();
  }

  return (
    <div
      role="button"
      aria-label={getTitle(notification)}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onClick={handleClick}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
        isUnread && "bg-primary/5"
      )}
    >
      {/* Unread dot */}
      <span
        aria-hidden="true"
        className={cn(
          "mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full",
          isUnread ? "bg-primary" : "bg-transparent"
        )}
      />

      {/* Type icon */}
      <TypeIcon notification={notification} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm",
              isUnread ? "font-semibold" : "font-medium text-muted-foreground"
            )}
          >
            {getTitle(notification)}
          </p>
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {relativeTime(notification.created_at)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {getPreview(notification)}
        </p>
      </div>

      {/* ··· hover menu */}
      <div
        className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Notification actions"
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
              />
            }
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isUnread && (
              <DropdownMenuItem
                disabled={isMarkingRead}
                onClick={() => onMarkRead(notification.id)}
              >
                Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={isDeleting}
              onClick={() => onDelete(notification.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
