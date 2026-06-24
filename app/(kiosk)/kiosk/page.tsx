"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useKioskLookup } from "@/hooks/use-kiosk-lookup";
import { useKioskScanner } from "@/hooks/use-kiosk-scanner";
import { AppLogo } from "@/components/app-logo";
import type { KioskStudent } from "@/types/kiosk";

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, student, handleScan, reset } = useKioskLookup();
  const [cameraBlocked, setCameraBlocked] = useState(false);

  const handleCameraError = useCallback(() => setCameraBlocked(true), []);

  useKioskScanner({
    videoRef,
    onScan: handleScan,
    onCameraError: handleCameraError,
    isEnabled: state === "scanning" && !cameraBlocked,
  });

  // Auto-reset: 10 seconds on result, 5 seconds on error
  useEffect(() => {
    if (state !== "result" && state !== "error") return;

    const delay = state === "result" ? 10000 : 5000;
    const timer = setTimeout(reset, delay);

    return () => clearTimeout(timer);
  }, [state, reset]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      {/* Camera viewfinder — always mounted, hidden when not scanning */}
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          state !== "scanning" && state !== "loading" && "hidden",
        )}
        muted
        playsInline
      />

      {/* Scanning state overlay */}
      {(state === "scanning" || state === "loading") && !cameraBlocked && (
        <div className="relative z-10 flex flex-col items-center gap-6 text-white">
          <AppLogo className="h-12 invert" />

          {/* Scan guide frame */}
          <div className="relative h-64 w-64 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            {state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            )}
          </div>

          <p className="text-xl font-medium tracking-wide">
            {state === "loading" ? "Checking..." : "Scan your ID card"}
          </p>
        </div>
      )}

      {/* Result state */}
      {state === "result" && student && (
        <StudentCard student={student} onReset={reset} />
      )}

      {/* Error state */}
      {state === "error" && <ErrorCard />}

      {/* Camera blocked state */}
      {cameraBlocked && (
        <div className="z-10 flex flex-col items-center gap-3 text-center">
          <p className="text-xl font-semibold">Camera access required.</p>
          <p className="text-muted-foreground">Please allow camera and refresh.</p>
        </div>
      )}
    </div>
  );
}

function StudentCard({
  student,
  onReset,
}: {
  student: KioskStudent;
  onReset: () => void;
}) {
  const balanceNum = parseFloat(student.balance);
  const balanceColor =
    balanceNum >= 50
      ? "text-green-600"
      : balanceNum > 0
        ? "text-orange-500"
        : "text-red-600";

  return (
    <div className="animate-in fade-in z-10 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl bg-card p-8 shadow-2xl">
      {/* Avatar */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
        {student.initials}
      </div>

      {/* Name + grade */}
      <div className="text-center">
        <p className="text-2xl font-bold">{student.name}</p>
        <p className="text-muted-foreground">{student.grade_level}</p>
      </div>

      {/* Subscription badge */}
      <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium capitalize">
        {student.student_type === "subscription" ? "Subscription" : "Non-Subscription"}
      </span>

      {/* Balance */}
      <p className={cn("text-5xl font-extrabold", balanceColor)}>
        ₱{student.balance}
      </p>

      {/* Last orders */}
      {student.last_orders.length > 0 && (
        <div className="w-full">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Last Orders
          </p>
          <ul className="divide-y divide-border">
            {student.last_orders.map((order, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span className="text-foreground">{order.items}</span>
                <span className="ml-4 shrink-0 text-muted-foreground">
                  {order.date} · ₱{order.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onReset}
        className="mt-2 text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        Scan another
      </button>
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="animate-in fade-in z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-2xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-3xl">
        ✕
      </div>
      <p className="text-xl font-semibold">QR not recognized.</p>
      <p className="text-muted-foreground">Please see a cashier.</p>
    </div>
  );
}
