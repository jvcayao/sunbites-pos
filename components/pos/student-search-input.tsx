"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { posStudentApi } from "@/lib/api/pos-students";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ApiError } from "@/types/auth";
import type { PosStudent, PosStudentSearchResult } from "@/types/order";

const QR_PATTERN = /^SB-[A-Za-z0-9]{12}$/;

interface SelectedStudentCardProps {
  student: PosStudent;
  onClear: () => void;
}

function SelectedStudentCard({ student, onClear }: SelectedStudentCardProps) {
  const creditBalance = parseFloat(student.credit_balance);
  const hasCredit = creditBalance > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {student.first_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{student.full_name}</p>
            <p className="text-sm text-muted-foreground">
              {student.grade_level}
              {student.section ? ` — ${student.section}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  student.enrollment_status === "enrolled"
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {student.enrollment_status_label}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {student.student_type_label}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Clear student selection"
          onClick={onClear}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Wallet</p>
          <p className="text-sm font-bold text-foreground">
            ₱{Number(student.wallet_balance).toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Points</p>
          <p className="text-sm font-bold text-foreground">{student.points}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Credit Owed</p>
          <p className={cn("text-sm font-bold", hasCredit ? "text-destructive" : "text-foreground")}>
            ₱{creditBalance.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface SearchResultsDropdownProps {
  results: PosStudentSearchResult[];
  onSelect: (student: PosStudentSearchResult) => void;
}

function SearchResultsDropdown({ results, onSelect }: SearchResultsDropdownProps) {
  if (!results.length) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-popover p-3 shadow-lg">
        <p className="text-sm text-muted-foreground">No students found.</p>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
      {results.map((student) => {
        const isEnrolled = student.enrollment_status === "enrolled";
        return (
          <button
            key={student.id}
            type="button"
            disabled={!isEnrolled}
            onClick={() => isEnrolled && onSelect(student)}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors",
              isEnrolled
                ? "hover:bg-muted cursor-pointer"
                : "cursor-not-allowed opacity-65"
            )}
          >
            <div>
              <p className="text-sm font-medium text-foreground">{student.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {student.grade_level}
                {student.section ? ` — ${student.section}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                isEnrolled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              )}
            >
              {isEnrolled ? student.enrollment_status_label : "⛔ " + student.enrollment_status_label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ChangeStudentDialogProps {
  currentStudent: PosStudent;
  newStudent: PosStudent;
  onConfirm: () => void;
  onCancel: () => void;
}

function ChangeStudentDialog({ currentStudent, newStudent, onConfirm, onCancel }: ChangeStudentDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Switch Student?</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground">A new QR code was scanned.</p>
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="font-medium">{currentStudent.full_name}</p>
              <p className="text-xs text-muted-foreground">{currentStudent.grade_level}</p>
            </div>
            <div className="border-t border-border pt-2">
              <p className="text-xs text-muted-foreground">New</p>
              <p className="font-medium">{newStudent.full_name}</p>
              <p className="text-xs text-muted-foreground">{newStudent.grade_level}</p>
              <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Enrolled
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCancel}>No, Keep Current</Button>
          <Button onClick={onConfirm}>Yes, Switch</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StudentNotFoundDialogProps { open: boolean; onClose: () => void; }

function StudentNotFoundDialog({ open, onClose }: StudentNotFoundDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Student Not Found</DialogTitle></DialogHeader>
        <p className="py-2 text-sm text-muted-foreground">
          No student was found matching this QR code. Please try scanning again or search by name.
        </p>
        <div className="flex justify-end pt-1">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  onStudentSelected: (student: PosStudent | null) => void;
  onWalkIn: () => void;
  selectedStudent: PosStudent | null;
  isWalkIn: boolean;
}

export function StudentSearchInput({
  onStudentSelected,
  onWalkIn,
  selectedStudent,
  isWalkIn,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<PosStudentSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQrStudent, setPendingQrStudent] = useState<PosStudent | null>(null);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scanBufferRef = useRef<string>("");
  const globalScanLastKeyRef = useRef<number>(0);
  const selectedStudentRef = useRef<PosStudent | null>(selectedStudent);

  useEffect(() => {
    selectedStudentRef.current = selectedStudent;
  }, [selectedStudent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lookupMutation = useMutation({
    mutationFn: posStudentApi.lookup,
    onSuccess: (result) => {
      if (result.student) {
        onStudentSelected(result.student);
        setInputValue("");
        setShowDropdown(false);
        setSearchResults([]);
        setError(null);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (result.students) {
        setSearchResults(result.students);
        setShowDropdown(true);
        setError(null);
      }
    },
    onError: (err: ApiError) => {
      setError(err.message ?? "Student not found.");
      setSearchResults([]);
      setShowDropdown(false);
    },
  });

  const fullStudentMutation = useMutation({
    mutationFn: (studentId: number) => posStudentApi.show(studentId),
    onSuccess: ({ student }) => {
      onStudentSelected(student);
      setInputValue("");
      setShowDropdown(false);
      setSearchResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    onError: (err: ApiError) => {
      setError(err.message ?? "Failed to fetch student data.");
    },
  });

  const globalQrLookupMutation = useMutation({
    mutationFn: posStudentApi.lookup,
    onSuccess: (result) => {
      setInputValue("");
      setShowDropdown(false);
      setSearchResults([]);
      if (!result.student) { setShowNotFoundDialog(true); return; }
      const incoming = result.student;
      if (incoming.enrollment_status !== "enrolled") {
        setError(incoming.full_name + " is not enrolled and cannot make purchases.");
        return;
      }
      if (selectedStudentRef.current) {
        setPendingQrStudent(incoming);
      } else {
        onStudentSelected(incoming);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    onError: () => { setShowNotFoundDialog(true); },
  });

  const globalQrLookupRef = useRef(globalQrLookupMutation);
  useEffect(() => { globalQrLookupRef.current = globalQrLookupMutation; });

  useEffect(() => {
    const SCAN_THRESHOLD_MS = 100;

    function handleGlobalKeyDown(e: KeyboardEvent) {
      const now = performance.now();
      const elapsed = now - globalScanLastKeyRef.current;
      globalScanLastKeyRef.current = now;

      if (e.key.length === 1 && elapsed < SCAN_THRESHOLD_MS) {
        scanBufferRef.current += e.key;
        // Always suppress fast keystrokes from the DOM — scanner chars must NEVER
        // appear in the visible input regardless of which element has focus.
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        const buffer = scanBufferRef.current;
        scanBufferRef.current = "";

        if (buffer.length === 0) {
          // Empty buffer = plain manual Enter key — let it propagate normally.
          return;
        }

        // Buffer has content from a scanner sequence. Always consume this Enter.
        e.preventDefault();
        setInputValue("");
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        if (QR_PATTERN.test(buffer)) {
          globalQrLookupRef.current.mutate({ type: "qr", value: buffer });
        } else {
          // Scanner fired but the QR code is not a student QR — show Not Found dialog.
          setShowNotFoundDialog(true);
        }
        return;
      }

      if (e.key.length === 1 && elapsed >= SCAN_THRESHOLD_MS) {
        scanBufferRef.current = "";
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  function handleSelectFromDropdown(student: PosStudentSearchResult) {
    setShowDropdown(false);
    setSearchResults([]);
    fullStudentMutation.mutate(student.id);
  }

  const fireNameSearch = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      lookupMutation.mutate({ type: "search", value: value.trim() });
    },
    [lookupMutation]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();
    const timeSinceLast = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    const isScanner = timeSinceLast < 100;

    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const value = inputValue.trim();
      if (!value) return;

      if (QR_PATTERN.test(value)) {
        lookupMutation.mutate({ type: "qr", value });
      } else {
        lookupMutation.mutate({ type: "search", value });
      }
      return;
    }

    if (!isScanner) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (inputRef.current?.value.trim()) {
          fireNameSearch(inputRef.current.value);
        }
      }, 300);
    }
  }

  function handleBlur() {
    // Delay re-focus to allow dropdown clicks to register
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
      }
      inputRef.current?.focus();
    }, 50);
  }

  const isPending =
    lookupMutation.isPending || fullStudentMutation.isPending;

  return (
    <>
      {isWalkIn ? (
        <div className="rounded-xl border border-border bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚶</span>
              <div>
                <p className="font-semibold text-foreground">Walk-in Customer</p>
                <p className="text-sm text-muted-foreground">No student account attached</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onStudentSelected(null)}
              className="rounded px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Switch to Student
            </button>
          </div>
        </div>
      ) : selectedStudent ? (
        <SelectedStudentCard student={selectedStudent} onClear={() => onStudentSelected(null)} />
      ) : (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              id="pos-qr-input"
              type="text"
              autoComplete="off"
              placeholder="Scan QR code or type student name / number…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={isPending}
              className={cn(
                "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors",
                "placeholder:text-muted-foreground",
                "focus:border-ring focus:ring-3 focus:ring-ring/30",
                error ? "border-destructive" : "border-input",
                isPending && "cursor-wait opacity-70"
              )}
            />
            {isPending && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              {error}
            </p>
          )}

          {showDropdown && (
            <SearchResultsDropdown
              results={searchResults}
              onSelect={handleSelectFromDropdown}
            />
          )}

          <div className="mt-2 flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs">Enter</kbd> to search
            </p>
            <span className="text-xs text-muted-foreground">—</span>
            <button
              type="button"
              onClick={onWalkIn}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Walk-in customer
            </button>
          </div>
        </div>
      )}

      {pendingQrStudent && selectedStudent && (
        <ChangeStudentDialog
          currentStudent={selectedStudent}
          newStudent={pendingQrStudent}
          onConfirm={() => {
            onStudentSelected(pendingQrStudent);
            setPendingQrStudent(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          onCancel={() => setPendingQrStudent(null)}
        />
      )}

      <StudentNotFoundDialog
        open={showNotFoundDialog}
        onClose={() => { setShowNotFoundDialog(false); setTimeout(() => inputRef.current?.focus(), 50); }}
      />
    </>
  );
}
