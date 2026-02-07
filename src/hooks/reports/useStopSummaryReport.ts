"use client";

import { reportService } from "@/services/api/reportService";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

interface Props {
  filters: Record<string, any>;
  hasGenerated?: boolean;
  page?: number;
  limit?: number;
}

export const useStopSummaryReport = ({
  filters,
  hasGenerated,
  page = 1,
  limit = 10,
}: Props) => {
  const uniqueIds = filters?.uniqueIds || [];

  return useQuery({
    queryKey: [
      "stop-summary-report",
      uniqueIds,
      filters?.from,
      filters?.to,
      page,
      limit,
    ],

    queryFn: () =>
      reportService.getStopSummaryReport({
        uniqueIds,
        from: filters?.from,
        to: filters?.to,
        limit: limit,
        page: page,
      }),

    enabled:
      !!hasGenerated &&
      uniqueIds.length > 0 &&
      !!filters?.from &&
      !!filters?.to,

    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });
};
