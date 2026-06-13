"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { announcementApi } from "@/lib/api/announcements";
import { parentApi } from "@/lib/api/parents";
import { userApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

type RecipientType = "parents" | "staff";

export default function CreateAnnouncementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("parents");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: parentsData, isLoading: parentsLoading } = useQuery({
    queryKey: ["parents-list"],
    queryFn: () => parentApi.list({ per_page: 100 }),
    enabled: recipientType === "parents",
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => userApi.list({ per_page: 100 }),
    enabled: recipientType === "staff",
  });

  const allRecipients: { id: number; name: string }[] = useMemo(() => {
    if (recipientType === "parents") {
      return (parentsData?.data ?? []).map((p) => ({ id: p.id, name: p.full_name }));
    }
    return (usersData?.data ?? [])
      .filter((u) => u.id !== currentUser?.id)
      .map((u) => ({ id: u.id, name: u.full_name }));
  }, [recipientType, parentsData, usersData, currentUser?.id]);

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return allRecipients;
    const q = search.toLowerCase();
    return allRecipients.filter((r) => r.name.toLowerCase().includes(q));
  }, [allRecipients, search]);

  const isLoading = recipientType === "parents" ? parentsLoading : usersLoading;

  function toggleAll() {
    if (filteredRecipients.every((r) => selectedIds.has(r.id))) {
      const next = new Set(selectedIds);
      filteredRecipients.forEach((r) => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredRecipients.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function switchType(type: RecipientType) {
    setRecipientType(type);
    setSelectedIds(new Set());
    setSearch("");
  }

  const createMutation = useMutation({
    mutationFn: () =>
      announcementApi.create({
        title: title.trim() || undefined,
        message: message.trim(),
        recipient_type: recipientType,
        recipient_ids: Array.from(selectedIds),
      }),
    onSuccess: () => {
      toast.success(`Announcement sent to ${selectedIds.size} recipient${selectedIds.size !== 1 ? "s" : ""}.`);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      router.push("/announcements");
    },
    onError: () => {
      toast.error("Failed to send announcement. Please try again.");
    },
  });

  const allFiltered = filteredRecipients.every((r) => selectedIds.has(r.id));

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">New Announcement</h1>

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="title"
          placeholder="e.g. Canteen notice"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
        />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          Message <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <textarea
            id="message"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none pb-6"
            placeholder="Write your announcement..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">
            {message.length}/1000
          </span>
        </div>
      </div>

      {/* Recipient type toggle */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Send to</p>
        <div className="inline-flex rounded-lg border border-border p-1 gap-1">
          {(["parents", "staff"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => switchType(type)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                recipientType === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={recipientType === type}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Recipients</p>
          {filteredRecipients.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {allFiltered ? "Deselect all" : `Select all (${filteredRecipients.length})`}
            </button>
          )}
        </div>

        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search recipients"
        />

        <div className="max-h-72 overflow-y-auto rounded-md border border-border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filteredRecipients.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No recipients found.</p>
          ) : (
            filteredRecipients.map((r) => (
              <label
                key={r.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50",
                  selectedIds.has(r.id) && "bg-primary/5"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  className="h-4 w-4 accent-primary"
                  aria-label={r.name}
                />
                {r.name}
              </label>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={
            createMutation.isPending ||
            message.trim().length === 0 ||
            selectedIds.size === 0
          }
        >
          {createMutation.isPending
            ? "Sending…"
            : `Send (${selectedIds.size})`}
        </Button>
      </div>
    </div>
  );
}
