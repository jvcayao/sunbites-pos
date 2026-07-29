import { useQuery } from "@tanstack/react-query";

import { studentApi } from "@/lib/api/students";

import type { LedgerEntryFilter } from "@/types/student";

/**
 * The unified ledger: wallet movements and credit activity in one chronological
 * stream. Replaces the `wallet_transactions` array the student show payload used
 * to return, which had no visibility of credit at all.
 */
export function useStudentLedger(
  studentId: number,
  entryType: LedgerEntryFilter,
  page: number,
) {
  return useQuery({
    queryKey: ["student-ledger", studentId, entryType, page],
    queryFn: () =>
      studentApi.ledger(studentId, {
        entry_type: entryType,
        page,
        per_page: 15,
      }),
    enabled: !!studentId,
  });
}
