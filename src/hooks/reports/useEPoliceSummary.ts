"use client";

import { reportService } from "@/services/api/reportService";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

interface Props {
    uniqueId?: string;
    selectedDate?: string;
    enabled?: boolean;
}

export const useEPoliceSummary = ({
    uniqueId,
    selectedDate,
    enabled = true,
}: Props) => {
    return useQuery({
        queryKey: ["e-police-summary", uniqueId, selectedDate],
        queryFn: () =>
            reportService.getEPoliceSummary({
                uniqueId: uniqueId!,
                selectedDate: selectedDate!,
            }),
        enabled: enabled && !!uniqueId && !!selectedDate,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
        placeholderData: keepPreviousData,
    });
};
