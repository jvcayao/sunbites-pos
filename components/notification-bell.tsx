"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useEcho } from "@/components/providers/echo-provider";
import { staffNotificationApi } from "@/lib/api/staff-notifications";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function NotificationBell({ className }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const echo = useEcho();
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["staff-unread-count"],
    queryFn: () => staffNotificationApi.unreadCount(),
    enabled: !!user,
  });

  const unreadCount = data?.count ?? 0;

  useEffect(() => {
    if (!echo || !user) return;

    const channel = echo
      .private(`staff.${user.id}`)
      .listen("AnnouncementNotification", () => {
        queryClient.invalidateQueries({ queryKey: ["staff-unread-count"] });
      })
      .listen("PreRegistrationNotification", () => {
        queryClient.invalidateQueries({ queryKey: ["staff-unread-count"] });
      });

    return () => {
      channel.stopListening("AnnouncementNotification");
      channel.stopListening("PreRegistrationNotification");
    };
  }, [echo, user, queryClient]);

  return (
    <button
      type="button"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
      onClick={() => router.push("/notifications")}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted",
        className
      )}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
