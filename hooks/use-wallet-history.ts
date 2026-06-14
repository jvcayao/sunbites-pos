import { useInfiniteQuery } from "@tanstack/react-query";

import { reportApi, type WalletHistoryParams } from "@/lib/api/reports";

export function useWalletHistory(
  studentId: number,
  type: WalletHistoryParams["type"],
  search: string,
) {
  return useInfiniteQuery({
    queryKey: ["wallet-history", studentId, type, search],
    queryFn: ({ pageParam }) =>
      reportApi.walletHistory(studentId, {
        type,
        search: search || undefined,
        page: pageParam,
        per_page: 15,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    enabled: !!studentId,
  });
}
