"use client";

import { GetSubscriptionExpirationResponse, SubscriptionExpiration } from "@/interface/modal";
import { subscriptionExpiryService } from "@/services/api/subscriptionExpiry";
import { useInfiniteQuery } from "@tanstack/react-query";

interface UseSubscriptionExpiryResult {
  expiredBranches: {
    data: SubscriptionExpiration[];
    totalExpiredCount: number;
    totalExpiringIn30DaysCount: number;
    count: number;
  };
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
}

export const useSubscriptionExpiry = (isShown: boolean): UseSubscriptionExpiryResult => {
  const query = useInfiniteQuery<GetSubscriptionExpirationResponse, Error>({
    queryKey: ["subscription-expiry"],
    queryFn: ({ pageParam = 1 }) => subscriptionExpiryService.getSubscriptionExpiry(pageParam as number),
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage <= lastPage.totalPages ? nextPage : undefined;
    },
    enabled: isShown, // Allow manual enabling/disabling
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialPageParam: 1,
  });

  // Flatten the data from all pages
  const flattenedBranches = query.data?.pages.flatMap((page) => page.data) || [];

  // Get totals from the first page (assuming they are consistent across pages or at least available)
  const firstPage = query.data?.pages[0];
  const totalExpiredCount = firstPage?.totalExpiredCount || 0;
  const totalExpiringIn30DaysCount = firstPage?.totalExpiringIn30DaysCount || 0;
  // This 'count' might need to be total count across all pages or just length of flattened array
  // If original code used 'count' for something specific from response, adjust accordingly.
  // Based on usage, it seems to display count of loaded items or total items.
  // Let's use flattened length for loaded items, or totalDevicesCount if available.
  // The interface expects 'count' in the response object used in component.
  // Let's stick to the structure expected by the component, modifying 'data' to be the flattened list.


  return {
    expiredBranches: {
      data: flattenedBranches,
      totalExpiredCount,
      totalExpiringIn30DaysCount,
      count: flattenedBranches.length, // Or total count from API if needed
    },
    fetchNextPage: query.fetchNextPage,
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
  };
};
