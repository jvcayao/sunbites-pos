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
  variant?: "row" | "card";
  onCardClick?: () => void;
}

type NotifType = StaffNotification["type"];

const TYPE_CONFIG: Record<
  NotifType,
  {
    borderColor: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
    Icon: React.ElementType;
  }
> = {
  "App\\Notifications\\AnnouncementNotification": {
    borderColor: "border-l-amber-400",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-300",
    label: "Announcement",
    Icon: Megaphone,
  },
  "App\\Notifications\\PreRegistrationNotification": {
    borderColor: "border-l-blue-400",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-300",
    label: "Pre-Registration",
    Icon: UserPlus,
  },
};

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
  variant = "row",
  onCardClick,
}: NotificationItemProps) {
  const router = useRouter();
  const isUnread = notification.read_at === null;
  const config = TYPE_CONFIG[notification.type];
  const title = getTitle(notification);
  const preview = getPreview(notification);

  function handleClick() {
    if (isUnread) {
      onMarkRead(notification.id);
    }
    if (notification.type === "App\\Notifications\\AnnouncementNotification") {
      router.push(`/announcements/${notification.data.announcement_id}`);
    } else {
      router.push(
        `/pre-registrations/${notification.data.pre_registration_id}`,
      );
    }
    onNavigate?.();
  }

  const actionsMenu = (
    <div onClick={(e) => e.stopPropagation()}>
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
  );

  if (variant === "card") {
    return (
      <div
        role="button"
        aria-label={title}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && (onCardClick ?? handleClick)()}
        onClick={onCardClick ?? handleClick}
        className={cn(
          "relative cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30 border-l-4",
          config.borderColor,
          isUnread && "bg-primary/5",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              config.iconBg,
            )}
          >
            <config.Icon
              className={cn("h-4 w-4", config.iconColor)}
              aria-hidden="true"
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "truncate font-semibold text-foreground",
                  !isUnread && "font-medium text-muted-foreground",
                )}
              >
                {title}
              </p>
              {isUnread && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                  config.badgeBg,
                  config.badgeText,
                  config.badgeBorder,
                )}
              >
                {config.label}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {preview}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {relativeTime(notification.created_at)}
            </p>
          </div>

          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {actionsMenu}
          </div>
        </div>
      </div>
    );
  }

  // Row variant (default — used by notification bell dropdown)
  return (
    <div
      role="button"
      aria-label={title}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && (onCardClick ?? handleClick)()}
      onClick={onCardClick ?? handleClick}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
        isUnread && "bg-primary/5",
      )}
    >
      {/* Unread dot */}
      <span
        aria-hidden="true"
        className={cn(
          "mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full",
          isUnread ? "bg-primary" : "bg-transparent",
        )}
      />

      {/* Type icon */}
      <span
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          config.iconBg,
        )}
      >
        <config.Icon
          className={cn("h-4 w-4", config.iconColor)}
          aria-hidden="true"
        />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm",
              isUnread ? "font-semibold" : "font-medium text-muted-foreground",
            )}
          >
            {title}
          </p>
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {relativeTime(notification.created_at)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {preview}
        </p>
      </div>

      {/* ··· hover menu */}
      <div
        className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {actionsMenu}
      </div>
    </div>
  );
}
