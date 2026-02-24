import { useQuery } from "@tanstack/react-query";
import { billingHistoryService, BillingHistoryResponse } from "@/services/api/billingHistoryService";

export const useBillingHistory = (page: number, limit: number) => {
    const query = useQuery<BillingHistoryResponse>({
        queryKey: ["billingHistory", page, limit],
        queryFn: () => billingHistoryService.getHistory(page, limit),
    });

    return {
        data: query.data?.data || [],
        pagination: query.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};
