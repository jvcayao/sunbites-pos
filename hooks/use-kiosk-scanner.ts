"use client";

import { useCallback, useEffect, useRef } from "react";

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
  const controlsRef = useRef<IScannerControls | null>(null);
  const isLockedRef = useRef(false);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const controls = await BrowserMultiFormatReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (!result || isLockedRef.current) return;

          const text = result.getText();
          if (!text.startsWith("SB-")) return;

          isLockedRef.current = true;
          onScan(text);

          setTimeout(() => {
            isLockedRef.current = false;
          }, 1000);
        },
      );

      controlsRef.current = controls;
    } catch {
      onCameraError();
    }
  }, [videoRef, onScan, onCameraError]);

  useEffect(() => {
    if (isEnabled) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [isEnabled, start, stop]);
}
