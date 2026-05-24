"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { feedbackApi } from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type { Feedback, FeedbackCategory } from "@/types/feedback";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<
  FeedbackCategory,
  { label: string; className: string }
> = {
  FoodQuality: {
    label: "Food Quality",
    className:
      "bg-orange-100 text-orange-700 border-orange-300",
  },
  Service: {
    label: "Service",
    className:
      "bg-blue-100 text-blue-700 border-blue-300",
  },
  Pricing: {
    label: "Pricing",
    className:
      "bg-purple-100 text-purple-700 border-purple-300",
  },
  Cleanliness: {
    label: "Cleanliness",
    className:
      "bg-green-100 text-green-700 border-green-300",
  },
  Other: {
    label: "Other",
    className:
      "bg-muted text-muted-foreground border-border",
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FeedbackSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32 mt-2" />
        </div>
      ))}
    </div>
  );
}

function CategoryBadge({ category }: { category: FeedbackCategory }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Feedback detail sheet
// ---------------------------------------------------------------------------

interface FeedbackDetailSheetProps {
  feedback: Feedback | null;
  onClose: () => void;
  onReply: (id: number, reply: string) => void;
  onMarkRead: (id: number) => void;
  isReplying: boolean;
  isMarkingRead: boolean;
}

function FeedbackDetailSheet({
  feedback,
  onClose,
  onReply,
  onMarkRead,
  isReplying,
  isMarkingRead,
}: FeedbackDetailSheetProps) {
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");

  useEffect(() => {
    if (feedback) {
      setReply(feedback.admin_reply ?? "");
      setReplyError("");
    }
  }, [feedback]);

  function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) {
      setReplyError("Reply cannot be empty.");
      return;
    }
    setReplyError("");
    if (feedback) onReply(feedback.id, reply.trim());
  }

  return (
    <Sheet open={feedback !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {feedback && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={feedback.category} />
                {!feedback.is_read && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30">
                    Unread
                  </span>
                )}
              </div>
              <SheetTitle className="text-left mt-2">
                {CATEGORY_CONFIG[feedback.category].label} Feedback
              </SheetTitle>
              <SheetDescription className="text-left">
                {feedback.student
                  ? `From: ${feedback.student.full_name} (${feedback.student.student_number})`
                  : "Anonymous submission"}
                {" · "}
                {new Date(feedback.created_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Message */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Message
                </p>
                <p className="text-sm text-foreground leading-relaxed">{feedback.message}</p>
              </div>

              {/* Existing reply */}
              {feedback.admin_reply && (
                <div className="rounded-lg border border-border bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                    Admin Reply
                    {feedback.replied_at && (
                      <span className="ml-2 normal-case font-normal text-muted-foreground">
                        · {new Date(feedback.replied_at).toLocaleDateString("en-PH")}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{feedback.admin_reply}</p>
                </div>
              )}

              {/* Mark as Read */}
              {!feedback.is_read && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkRead(feedback.id)}
                  disabled={isMarkingRead}
                  className="w-full"
                >
                  {isMarkingRead ? "Marking…" : "Mark as Read"}
                </Button>
              )}

              {/* Reply form */}
              <form onSubmit={handleSubmitReply} noValidate className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-reply">
                    {feedback.admin_reply ? "Update Reply" : "Write a Reply"}
                  </Label>
                  <Textarea
                    id="feedback-reply"
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write your response to this feedback…"
                    aria-invalid={!!replyError}
                    className={cn(replyError && "border-destructive")}
                  />
                  {replyError && (
                    <p role="alert" className="text-xs text-destructive">{replyError}</p>
                  )}
                </div>
                <Button type="submit" disabled={isReplying} className="w-full">
                  {isReplying ? "Sending…" : "Send Reply"}
                </Button>
              </form>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const queryKey = ["feedback", { search: debouncedSearch, is_read: unreadOnly ? false : undefined, page }];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      feedbackApi.list({
        search: debouncedSearch || undefined,
        is_read: unreadOnly ? false : undefined,
        page,
      }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      feedbackApi.reply(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Reply sent.");
      setSelectedFeedback(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to send reply.");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => feedbackApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Marked as read.");
      setSelectedFeedback((prev) => prev ? { ...prev, is_read: true } : null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message ?? "Failed to mark as read.");
    },
  });

  const meta = data?.meta;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">References</p>
        <h1 className="text-xl font-bold text-foreground">Feedback</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search feedback…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search feedback"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="unread-only"
            checked={unreadOnly}
            onCheckedChange={(checked) => {
              setUnreadOnly(checked);
              setPage(1);
            }}
          />
          <Label htmlFor="unread-only" className="cursor-pointer text-sm">
            Unread only
          </Label>
        </div>
      </div>

      {/* List */}
      {isError ? (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-destructive">
          Failed to load feedback. Please try again.
        </div>
      ) : isLoading ? (
        <FeedbackSkeleton />
      ) : !data?.data?.length ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No feedback found.
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "w-full text-left rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30",
                !item.is_read
                  ? "border-l-4 border-l-primary border-border"
                  : "border-border"
              )}
              onClick={() => setSelectedFeedback(item)}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge category={item.category} />
                  {!item.is_read && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {new Date(item.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <p className={cn("mt-2 text-sm line-clamp-2", !item.is_read && "font-semibold text-foreground")}>
                {item.message}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {item.student
                  ? `${item.student.full_name} (${item.student.student_number})`
                  : "Anonymous"}
                {item.admin_reply && (
                  <span className="ml-2 text-primary">· Replied</span>
                )}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 font-medium text-foreground">
              {page} / {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={page === meta.last_page}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <FeedbackDetailSheet
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onReply={(id, reply) => replyMutation.mutate({ id, reply })}
        onMarkRead={(id) => markReadMutation.mutate(id)}
        isReplying={replyMutation.isPending}
        isMarkingRead={markReadMutation.isPending}
      />
    </div>
  );
}
