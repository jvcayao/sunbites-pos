"use client";

import { useCallback, useState } from "react";

import { kioskApi } from "@/lib/api/kiosk";
import type { KioskStudent } from "@/types/kiosk";

type KioskState = "scanning" | "loading" | "result" | "error";

export function useKioskLookup() {
  const [state, setState] = useState<KioskState>("scanning");
  const [student, setStudent] = useState<KioskStudent | null>(null);

  const handleScan = useCallback(async (qrCode: string) => {
    setState("loading");
    try {
      const data = await kioskApi.lookup(qrCode);
      setStudent(data);
      setState("result");
    } catch {
      setStudent(null);
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("scanning");
    setStudent(null);
  }, []);

  return { state, student, handleScan, reset };
}
