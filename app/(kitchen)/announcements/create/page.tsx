"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { announcementApi } from "@/lib/api/announcements";
import { parentApi } from "@/lib/api/parents";
import { userApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

type RecipientType = "parents" | "staff";

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

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {error}
    </p>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
        {!required && (
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateAnnouncementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("parents");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      toast.success(
        `Announcement sent to ${selectedIds.size} recipient${selectedIds.size !== 1 ? "s" : ""}.`
      );
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      router.push("/announcements");
    },
    onError: () => {
      toast.error("Failed to send announcement. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!message.trim()) next.message = "Message is required.";
    if (selectedIds.size === 0) next.recipients = "Select at least one recipient.";
    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }
    setErrors({});
    createMutation.mutate();
  }

  const allFiltered =
    filteredRecipients.length > 0 &&
    filteredRecipients.every((r) => selectedIds.has(r.id));

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
      <div>
        <p className="text-xs text-muted-foreground">Communications</p>
        <h1 className="text-xl font-bold text-foreground">New Announcement</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Message Content */}
        <SectionCard title="Message Content">
          <FormField label="Title" htmlFor="title">
            <Input
              id="title"
              placeholder="e.g. Canteen closure notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </FormField>

          <FormField
            label="Message"
            htmlFor="message"
            required
            error={errors.message}
          >
            <div className="relative">
              <Textarea
                id="message"
                rows={5}
                placeholder="Write your announcement…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                aria-invalid={!!errors.message}
                className={cn("resize-none pb-6", errors.message && "border-destructive")}
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">
                {message.length}/1000
              </span>
            </div>
          </FormField>
        </SectionCard>

        {/* Send To */}
        <SectionCard title="Send To">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["parents", "staff"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => switchType(type)}
                aria-pressed={recipientType === type}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  recipientType === type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold capitalize",
                    recipientType === type ? "text-primary" : "text-foreground"
                  )}
                >
                  {type}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {type === "parents"
                    ? "Send to enrolled parents on the portal"
                    : "Send to staff members in this branch"}
                </p>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Recipients */}
        <SectionCard title="Recipients">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "None selected"}
            </p>
            {filteredRecipients.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {allFiltered
                  ? "Deselect all"
                  : `Select all (${filteredRecipients.length})`}
              </button>
            )}
          </div>

          <Input
            placeholder="Search recipients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search recipients"
          />

          <div
            className={cn(
              "max-h-72 overflow-y-auto rounded-lg border border-border",
              errors.recipients && "border-destructive"
            )}
          >
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : filteredRecipients.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No recipients found.
              </p>
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

          <FieldError error={errors.recipients} />
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || message.trim().length === 0 || selectedIds.size === 0}
          >
            {createMutation.isPending ? "Sending…" : `Send (${selectedIds.size})`}
          </Button>
        </div>
      </form>
    </div>
  );
}
