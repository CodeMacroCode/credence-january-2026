// hooks/useLiveDeviceData.ts
"use client";
import { useCallback, useEffect, useRef, useMemo } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import { useShallow } from "zustand/react/shallow";

/**
 * Performance-optimized hook for all device data streaming.
 * 
 * Uses granular Zustand selectors with shallow comparison to prevent
 * unnecessary re-renders. Each selector only subscribes to the specific
 * slice of state it needs.
 * 
 * Applied rules from vercel-react-best-practices:
 * - rerender-defer-reads: Don't subscribe to state only used in callbacks
 * - rerender-dependencies: Use primitive dependencies in effects
 */

// Selector for device data only — re-renders only when filteredData changes
const useDevices = () =>
  useDeviceStore(
    useShallow((state) => state.deviceData?.filteredData || [])
  );

// Selector for counts — stable object, re-renders only when counts change
const useCounts = () =>
  useDeviceStore(
    useShallow((state) => ({
      total: state.deviceData?.total || 0,
      running: state.deviceData?.runningCount || 0,
      overspeed: state.deviceData?.overspeedCount || 0,
      idle: state.deviceData?.idleCount || 0,
      stopped: state.deviceData?.stoppedCount || 0,
      inactive: state.deviceData?.inactiveCount || 0,
      new: state.deviceData?.newCount || 0,
      expiredCount: state.deviceData?.expiredCount || 0,
    }))
  );

// Selector for pagination — re-renders only when pagination values change
const usePagination = () =>
  useDeviceStore(
    useShallow((state) => ({
      currentPage: state.filters.page,
      totalPages: state.totalPages,
      hasNextPage: state.hasNextPage,
      hasPrevPage: state.hasPrevPage,
      limit: state.filters.limit,
    }))
  );

// Selector for filters — re-renders only when filters change
const useFilters = () =>
  useDeviceStore(
    useShallow((state) => state.filters)
  );

// Selector for connection status — re-renders only when connection changes
const useConnectionStatus = () =>
  useDeviceStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      isConnected: state.isConnected,
      isAuthenticated: state.isAuthenticated,
      error: state.error,
    }))
  );

// Actions selector — these are stable references, no re-renders
const useActions = () =>
  useDeviceStore(
    useShallow((state) => ({
      updateFilters: state.updateFilters,
      setPage: state.setPage,
      clearError: state.clearError,
      refreshData: state.refreshData,
    }))
  );

// Hook for all device data streaming
export const useLiveDeviceData = () => {
  const devices = useDevices();
  const counts = useCounts();
  const pagination = usePagination();
  const filters = useFilters();
  const connectionStatus = useConnectionStatus();
  const actions = useActions();

  // Convert counts object to the array format expected by DashboardClient
  // Memoized so it only recomputes when counts actually change
  const countsArray = useMemo(
    () => [
      { total: counts.total },
      { running: counts.running },
      { overspeed: counts.overspeed },
      { idle: counts.idle },
      { stopped: counts.stopped },
      { inactive: counts.inactive },
      { new: counts.new },
      { expiredCount: counts.expiredCount },
    ],
    [
      counts.total,
      counts.running,
      counts.overspeed,
      counts.idle,
      counts.stopped,
      counts.inactive,
      counts.new,
      counts.expiredCount,
    ]
  );

  return {
    // Data
    devices,
    counts: countsArray,

    // Pagination
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    limit: pagination.limit,

    // Filters
    filters,

    // Status
    isLoading: connectionStatus.isLoading,
    isConnected: connectionStatus.isConnected,
    isAuthenticated: connectionStatus.isAuthenticated,
    error: connectionStatus.error,

    // Actions
    updateFilters: actions.updateFilters,
    setPage: actions.setPage,
    nextPage: () =>
      pagination.hasNextPage && actions.setPage(pagination.currentPage + 1),
    prevPage: () =>
      pagination.hasPrevPage && actions.setPage(pagination.currentPage - 1),
    clearError: actions.clearError,
    refreshData: actions.refreshData,
  };
};

// Hook for single device data streaming
export const useSingleDeviceData = (uniqueId?: string) => {
  const store = useDeviceStore();
  const activeStreamRef = useRef<string | null>(null);

  // Get single device data
  const deviceData = uniqueId ? store.getSingleDeviceData(uniqueId) : null;
  const isActive = uniqueId ? store.isDeviceStreamActive(uniqueId) : false;
  const isLoading = uniqueId ? store.isDeviceLoading(uniqueId) : false;

  // Start streaming for a specific device
  const startStream = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        console.warn("[useSingleDeviceData] No device ID provided");
        return;
      }

      store.startSingleDeviceStream(deviceId);
      activeStreamRef.current = deviceId;
    },
    [store]
  );

  // Stop streaming for a specific device
  const stopStream = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        console.warn("[useSingleDeviceData] No device ID provided");
        return;
      }

      store.stopSingleDeviceStream(deviceId);

      if (activeStreamRef.current === deviceId) {
        activeStreamRef.current = null;
      }
    },
    [store]
  );

  // Clear data for a specific device
  const clearDeviceData = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        return;
      }

      store.clearSingleDeviceData(deviceId);

      if (activeStreamRef.current === deviceId) {
        activeStreamRef.current = null;
      }
    },
    [store]
  );

  // **NEW: Refresh function**
  const refreshStream = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        console.warn("[useSingleDeviceData] No device ID provided for refresh");
        return;
      }

      console.log("[useSingleDeviceData] Refreshing stream for:", deviceId);

      // Clear cached data
      store.clearSingleDeviceData(deviceId);

      // Restart stream after a brief delay to ensure cleanup
      setTimeout(() => {
        store.startSingleDeviceStream(deviceId);
        activeStreamRef.current = deviceId;
      }, 100);
    },
    [store]
  );

  // **ALTERNATIVE: Refresh current device**
  const refresh = useCallback(() => {
    if (!uniqueId) {
      console.warn("[useSingleDeviceData] No device ID to refresh");
      return;
    }

    refreshStream(uniqueId);
  }, [uniqueId, refreshStream]);

  // Switch back to all devices
  const switchToAllDevices = useCallback(() => {
    store.switchToAllDevices();
    activeStreamRef.current = null;
  }, [store]);

  // Stop all single device streams
  const stopAllStreams = useCallback(() => {
    store.stopAllSingleDeviceStreams();
    activeStreamRef.current = null;
  }, [store]);

  // Auto-start stream if uniqueId is provided
  useEffect(() => {
    if (uniqueId && store.isConnected && store.isAuthenticated) {
      if (!store.isDeviceStreamActive(uniqueId)) {
        startStream(uniqueId);
      }
    }
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current = null;
      }
    };
  }, [uniqueId, store.isConnected, store.isAuthenticated]);

  return {
    // Single Device Data
    deviceData,
    isActive,
    isLoading,

    // Connection Status
    isConnected: store.isConnected,
    isAuthenticated: store.isAuthenticated,
    error: store.error,

    // Streaming Status
    streamingMode: store.streamingMode,
    activeDeviceId: store.activeDeviceId,
    activeSingleDevices: Array.from(store.activeSingleDevices),

    // Actions
    startStream,
    stopStream,
    clearDeviceData,
    switchToAllDevices,
    stopAllStreams,
    clearError: store.clearError,

    // **NEW: Refresh actions**
    refresh, // Refresh current device (uses uniqueId)
    refreshStream, // Refresh any device by ID

    // Check methods
    isDeviceStreamActive: store.isDeviceStreamActive,
    isDeviceLoading: store.isDeviceLoading,
    isAllDeviceStreamingActive: store.isAllDeviceStreamingActive,
    isSingleDeviceStreamingActive: store.isSingleDeviceStreamingActive,

    // Connection status
    getConnectionStatus: store.getConnectionStatus,
  };
};
