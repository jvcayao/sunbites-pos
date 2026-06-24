"use client";

import { useEffect, useRef } from "react";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

interface UseKioskScannerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onScan: (code: string) => void;
  onCameraError: () => void;
  isEnabled: boolean;
}

export function useKioskScanner({
  videoRef,
  onScan,
  onCameraError,
  isEnabled,
}: UseKioskScannerProps): void {
  const isLockedRef = useRef(false);

  // Refs keep callbacks fresh without re-triggering the scanner effect
  const onScanRef = useRef(onScan);
  const onCameraErrorRef = useRef(onCameraError);
  onScanRef.current = onScan;
  onCameraErrorRef.current = onCameraError;

  useEffect(() => {
    if (!isEnabled || !videoRef.current) return;

    let cancelled = false;
    let controls: IScannerControls | null = null;

    BrowserMultiFormatReader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result) => {
        if (!result || isLockedRef.current) return;

        const text = result.getText();
        if (!text.startsWith("SB-")) return;

        isLockedRef.current = true;
        onScanRef.current(text);

        setTimeout(() => {
          isLockedRef.current = false;
        }, 1000);
      },
    )
      .then((ctrl) => {
        if (cancelled) {
          ctrl.stop();
        } else {
          controls = ctrl;
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        // Only show "camera blocked" for an actual user permission denial.
        // Other errors (device busy, Strict Mode race, no device found) should
        // not lock the UI into the blocked state.
        const isPermissionDenied =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");

        if (isPermissionDenied) {
          onCameraErrorRef.current();
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [isEnabled, videoRef]);
}
