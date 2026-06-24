"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";

interface UseKioskScannerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onScan: (code: string) => void;
  onCameraError: () => void;
  isCameraEnabled: boolean;
  isKeyboardEnabled: boolean;
}

export function useKioskScanner({
  videoRef,
  onScan,
  onCameraError,
  isCameraEnabled,
  isKeyboardEnabled,
}: UseKioskScannerProps): void {
  const isLockedRef = useRef(false);

  // Refs keep callbacks fresh without re-triggering scanner effects.
  // useLayoutEffect syncs before camera/keyboard effects read the refs.
  const onScanRef = useRef(onScan);
  const onCameraErrorRef = useRef(onCameraError);
  useLayoutEffect(() => {
    onScanRef.current = onScan;
    onCameraErrorRef.current = onCameraError;
  });

  // Camera-based scanning via @zxing/browser (phone/tablet)
  useEffect(() => {
    if (!isCameraEnabled || !videoRef.current) return;

    let cancelled = false;
    let controls: IScannerControls | null = null;

    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || isLockedRef.current) return;

        const text = result.getText();
        if (!text.startsWith("SB-")) return;

        isLockedRef.current = true;
        onScanRef.current(text);

        setTimeout(() => {
          isLockedRef.current = false;
        }, 1000);
      })
      .then((ctrl) => {
        if (cancelled) {
          ctrl.stop();
        } else {
          controls = ctrl;
        }
      })
      .catch(() => {
        // The `cancelled` flag filters Strict Mode double-invoke races.
        // Any remaining error is a real device failure — notify the parent.
        if (!cancelled) {
          onCameraErrorRef.current();
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [isCameraEnabled, videoRef]);

  // Hardware QR scanner support (USB/Bluetooth scanners that emulate keyboard input).
  // These devices send the QR code as rapid keystrokes followed by Enter.
  // We buffer characters and fire onScan when Enter arrives with a valid SB- code.
  useEffect(() => {
    if (!isKeyboardEnabled) return;

    // Intentionally a closure variable, not a ref: partial input from a previous
    // scan cycle should not persist into the next one (effect re-runs fresh).
    let buffer = "";

    const handleKeydown = (e: KeyboardEvent) => {
      if (isLockedRef.current) return;

      if (e.key === "Enter") {
        const code = buffer.trim();
        buffer = "";
        if (code.startsWith("SB-")) {
          // isLockedRef prevents double-fire in the gap between setState("loading") and
          // the next render removing this listener (isKeyboardEnabled becomes false).
          isLockedRef.current = true;
          onScanRef.current(code);
          setTimeout(() => {
            isLockedRef.current = false;
          }, 1000);
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isKeyboardEnabled]);
}
