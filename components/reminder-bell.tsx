"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { reminderApi } from "@/lib/api/reminders";
import { cn } from "@/lib/utils";

export function ReminderBell({ className }: { className?: string }) {
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ["reminder-bell-count"],
    queryFn: () => reminderApi.bellCount(),
    refetchInterval: 60_000,
  });

  const count = data?.count ?? 0;

  return (
    <button
      type="button"
      aria-label={count > 0 ? `${count} parents pending payment reminder` : "Payment reminders"}
      onClick={() => router.push("/reminders")}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted",
        className
      )}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
