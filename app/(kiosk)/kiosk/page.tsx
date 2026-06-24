"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

import { cn } from "@/lib/utils";
import { useKioskLookup } from "@/hooks/use-kiosk-lookup";
import { useKioskScanner } from "@/hooks/use-kiosk-scanner";
import { AppLogo } from "@/components/app-logo";
import type { KioskStudent } from "@/types/kiosk";

// Animates a number from 0 to `target` over `duration` ms with easeOut cubic.
// File-private — only used by StudentCard.
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// Balance tiers — exact thresholds from spec
function getBalanceTier(balance: number): "green" | "orange" | "red" {
  if (balance >= 150) return "green";
  if (balance >= 80) return "orange";
  return "red";
}

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, student, handleScan, reset } = useKioskLookup();
  const [cameraBlocked, setCameraBlocked] = useState(false);

  const handleCameraError = useCallback(() => setCameraBlocked(true), []);

  const isScanningState = state === "scanning" || state === "loading";

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
      {/* Camera viewfinder — always mounted, hidden when not in scanning/loading state */}
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          !isScanningState && "hidden",
        )}
        muted
        playsInline
      />

      {/* Logo — always visible at top, inverted (white) over the dark camera overlay */}
      <div
        className={cn(
          "absolute top-8 left-1/2 z-20 -translate-x-1/2",
          isScanningState && !cameraBlocked && "invert",
        )}
      >
        <AppLogo variant="full" />
      </div>

      {/* Scanning state overlay */}
      {isScanningState && !cameraBlocked && (
        <div className="relative z-10 flex flex-col items-center gap-6 text-white">
          {/* Scan guide frame */}
          <div className="relative h-64 w-64 overflow-hidden rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            {/* Corner bracket accents */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-0 top-0 h-6 w-6 border-l-4 border-t-4 border-white" />
              <div className="absolute right-0 top-0 h-6 w-6 border-r-4 border-t-4 border-white" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-white" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-white" />
            </div>

            {/* Animated scan line — only during scanning, not loading */}
            {state === "scanning" && (
              <div
                className="absolute left-0 h-0.5 w-full bg-primary opacity-90"
                style={{ animation: "scanLine 2s ease-in-out infinite" }}
              />
            )}

            {/* Loading spinner */}
            {state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            )}
          </div>

          <p className={cn("text-xl font-medium tracking-wide", state === "scanning" && "animate-pulse")}>
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
  const tier = getBalanceTier(balanceNum);
  const displayValue = useCountUp(balanceNum);
  const firstName = student.name.split(" ")[0];

  // Fire confetti once when this card mounts — green tier only
  useEffect(() => {
    if (tier === "green") {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 } });
    }
  }, [tier]);

  const balanceColor =
    tier === "green"
      ? "text-green-600"
      : tier === "orange"
        ? "text-orange-500"
        : "text-red-600";

  const cardRing =
    tier === "orange"
      ? "ring-2 ring-orange-400 shadow-orange-100"
      : tier === "red"
        ? "ring-2 ring-red-400 shadow-red-100"
        : "";

  const tierEmoji = tier === "orange" ? "😢" : tier === "red" ? "😰" : null;

  const tierMessage =
    tier === "orange"
      ? "Your balance is running low. Please top up soon!"
      : tier === "red"
        ? "Insufficient balance. Please top up before ordering."
        : null;

  return (
    <div
      className={cn(
        "animate-in zoom-in-75 fade-in z-10 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl bg-card p-8 shadow-2xl duration-300",
        cardRing,
      )}
      style={{ animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      {/* Friendly greeting */}
      <p className="text-lg font-medium text-muted-foreground">
        Hi, {firstName}! 👋
      </p>

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

      {/* Balance with tier emoji (emoji only for orange/red) */}
      <div className="flex items-center gap-2">
        {tierEmoji && <span className="text-4xl">{tierEmoji}</span>}
        <p className={cn("text-5xl font-extrabold", balanceColor)}>
          ₱{displayValue.toFixed(2)}
        </p>
      </div>

      {/* Tier message (orange/red only) */}
      {tierMessage && (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {tierMessage}
        </p>
      )}

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
    <div
      className="z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-2xl"
      style={{ animation: "shake 0.4s ease-in-out" }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-3xl">
        ✕
      </div>
      <p className="text-xl font-semibold">QR not recognized.</p>
      <p className="text-muted-foreground">Please see a cashier.</p>
    </div>
  );
}
