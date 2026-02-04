"use client";

import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import VehicleMap from "@/components/dashboard/VehicleMap";
import ResponseLoader from "@/components/ResponseLoader";
import {
  // ColumnDef,
  CustomTableServerSidePagination,
} from "@/components/ui/customTable(serverSidePagination)";
import { Input } from "@/components/ui/input";
import { useLiveDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import { useReverseGeocode } from "@/hooks/useReverseGeocoding";
import { DeviceData } from "@/types/socket";
import { ChevronsLeft, ChevronsRight, Locate } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { LiveTrack } from "@/components/dashboard/LiveTrack.tsx/livetrack";
import { BottomDrawer } from "@/components/dashboard/bottom-drawer";
// import SubscriptionExpiry from "@/components/dashboard/SubscriptionExpiry/SubscriptionExpiry";
import { getLiveVehicleColumns } from "@/components/columns/columns";
import { RouteTimeline } from "@/components/dashboard/route/route-timeline";
import { useSubscriptionExpiry } from "@/hooks/subscription/useSubscription";
import { SubscriptionExpiry } from "@/components/dashboard/SubscriptionExpiry/SubscriptionExpiry";
import { useBranchDropdown, useSchoolDropdown, useCategoryDropdown } from "@/hooks/useDropdown";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ListFilter, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Combobox } from "@/components/ui/combobox";
import { FilterCard } from "@/components/dashboard/FilterCard";

type ViewState = "split" | "tableExpanded" | "mapExpanded";
type StatusFilter = "all" | "running" | "idle" | "stopped" | "inactive" | "new";

// Local storage key for subscription popup
const SUBSCRIPTION_POPUP_KEY = "subscription_popup_shown";

export default function DashboardClient() {
  const [open, setOpen] = useState(false);

  // Local search state (for input value)
  const [searchInput, setSearchInput] = useState<string>("");

  // Debounce timer ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const authRequestRef = useRef(false);
  const authRequestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingZoomRef = useRef(false); // Track if zoom is pending after filter change

  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [viewState, setViewState] = useState<ViewState>("split");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [selectedImei, setSelectedImei] = useState<{
    uniqueId: number;
    name: string;
  }>({
    uniqueId: 0,
    name: "",
  });
  const [isRouteTimelineOpen, setIsRouteTimelineOpen] = useState(false);
  const [dynamicPageSize, setDynamicPageSize] = useState<number>(0);
  const [routeTimelineData, setRouteTimelineData] = useState<{
    uniqueId: string;
    deviceName: string;
    routeObjId?: string;
  } | null>(null);

  const handleOpenRouteTimeline = useCallback(
    (uniqueId: string, deviceName: string, routeObjId?: string) => {
      setRouteTimelineData({ uniqueId, deviceName, routeObjId });
      setIsRouteTimelineOpen(true);
    },
    []
  );

  // Active status filter
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");

  // Subscription expiry popup state
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

  const { addresses, loadingAddresses, queueForGeocoding } =
    useReverseGeocode();

  const statusConfig: Record<string, { color: string; icon: string }> = {
    Running: {
      color: "border-green-500",
      icon: "/car/side-view/carGreen.svg",
    },
    Overspeed: {
      color: "border-orange-500",
      icon: "/car/side-view/carOrange.svg",
    },
    Idle: {
      color: "border-yellow-500",
      icon: "/car/side-view/carYellow.svg",
    },
    Stopped: {
      color: "border-red-500",
      icon: "/car/side-view/carRed.svg",
    },
    Inactive: {
      color: "border-gray-500",
      icon: "/car/side-view/carGrey.svg",
    },
    New: {
      color: "border-blue-500",
      icon: "/car/side-view/carBlue.svg",
    },
    Total: {
      color: "border-[#deb887]",
      icon: "/car/side-view/carWhite.svg",
    },
  };

  // Subscription expiry popup state


  const {
    devices,
    counts,
    isLoading,
    updateFilters,
    currentPage,
    limit,
    isConnected,
    isAuthenticated,
    filters,
  } = useLiveDeviceData();

  const { decodedToken } = useAuthStore();
  const rawRole = (decodedToken?.role || "").toLowerCase();

  const userRole = useMemo(() => {
    if (["superadmin", "super_admin", "admin", "root"].includes(rawRole)) return "superadmin";
    if (["school", "schooladmin"].includes(rawRole)) return "school";
    if (["branch", "branchadmin"].includes(rawRole)) return "branch";
    if (["branchgroup"].includes(rawRole)) return "branchGroup";
    return rawRole;
  }, [rawRole]);

  console.log("🚀 ~ DashboardClient ~ userRole:", userRole, "rawRole:", rawRole);

  const userSchoolId = decodedToken?.schoolId || (userRole === "school" ? decodedToken?.id : undefined);

  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const { data: schoolData } = useSchoolDropdown(isSchoolDropdownOpen);

  // Set initial filters based on role
  useEffect(() => {
    if (userRole === "school" || userRole === "branchGroup") {
      updateFilters({ schoolId: userSchoolId });
    }
  }, [userRole, userSchoolId, updateFilters]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const { data: branchData } = useBranchDropdown(
    filters.schoolId,
    isBranchDropdownOpen,
    !filters.schoolId
  );

  // Category dropdown for vehicle type filter
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const { data: categoryData } = useCategoryDropdown(isCategoryDropdownOpen);


  const { expiredBranches, expiredBranchesCount } = useSubscriptionExpiry(
    showSubscriptionPopup
  );

  // Sync local pagination with store pagination
  const [pagination, setPagination] = useState({
    pageIndex: currentPage - 1,
    pageSize: limit,
  });

  // Update local pagination when store changes
  useEffect(() => {
    setPagination({
      pageIndex: currentPage - 1,
      pageSize: limit,
    });
  }, [currentPage, limit]);

  // Calculate optimal rows per page based on screen height
  const calculateOptimalRows = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const headerHeight = 330; // Approximate height of header, filters, search bar
    const rowHeight = 48; // Approximate height of each table row
    const paginationHeight = 60; // Height of pagination controls

    const availableHeight = viewportHeight - headerHeight - paginationHeight;
    const optimalRows = Math.min(9, Math.floor(availableHeight / rowHeight));

    // Clamp between 5 and 15 rows
    return Math.max(5, Math.min(15, optimalRows));
  }, []);

  // Combined useEffect for cleanup and subscription popup logic
  useEffect(() => {
    // Check localStorage to see if popup has been shown before
    const hasPopupBeenShown = localStorage.getItem(SUBSCRIPTION_POPUP_KEY);

    // Calculate initial rows based on screen size
    const initialRows = calculateOptimalRows();
    setDynamicPageSize(initialRows);

    updateFilters({ page: 1, limit: initialRows, filter: "all", searchTerm: "" });

    if (!hasPopupBeenShown) {
      // If no value exists in localStorage, show the popup
      setShowSubscriptionPopup(true);
    } else {
      // If value exists, don't show the popup
      setShowSubscriptionPopup(false);
    }

    // Handle window resize to recalculate rows
    const handleResize = () => {
      const newRows = calculateOptimalRows();
      updateFilters({ limit: newRows });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function for debounce timer and resize listener
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateOptimalRows]);

  useEffect(() => {
    if (!isConnected || !isAuthenticated) {
      authRequestRef.current = false;
      if (authRequestTimeoutRef.current) {
        clearTimeout(authRequestTimeoutRef.current);
        authRequestTimeoutRef.current = null;
      }
      return;
    }

    if (authRequestRef.current) {
      return;
    }

    authRequestRef.current = true;
    authRequestTimeoutRef.current = setTimeout(() => {
      updateFilters({ page: filters.page, limit: filters.limit });
    }, 1000);

    return () => {
      if (authRequestTimeoutRef.current) {
        clearTimeout(authRequestTimeoutRef.current);
        authRequestTimeoutRef.current = null;
      }
    };
  }, [
    isConnected,
    isAuthenticated,
    updateFilters,
    filters.page,
    filters.limit,
  ]);

  // **Debounced Search Handler**
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);

      // Clear existing timer
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      // Set new timer (500ms debounce)
      searchDebounceRef.current = setTimeout(() => {
        updateFilters({
          searchTerm: value,
          page: 1,
        });
      }, 500);
    },
    [updateFilters]
  );

  // **Status Filter Handler**
  const handleStatusFilter = useCallback(
    (status: StatusFilter) => {
      setActiveStatus(status);

      updateFilters({
        filter: status === "all" ? undefined : status,
        page: 1,
      });

      // Mark that we need to zoom after data loads
      pendingZoomRef.current = true;
    },
    [updateFilters]
  );

  // Trigger zoom after data finishes loading
  useEffect(() => {
    if (!isLoading && pendingZoomRef.current) {
      setFitBoundsTrigger((prev) => prev + 1);
      pendingZoomRef.current = false;
    }
  }, [isLoading]);


  // **Pagination Handler**
  const handlePaginationChange = useCallback(
    (updater: unknown) => {
      const newPagination =
        typeof updater === "function" ? updater(pagination) : updater;

      setPagination(newPagination);

      // Update store with new page
      updateFilters({
        page: newPagination.pageIndex + 1,
        limit: newPagination.pageSize,
      });
    },
    [pagination, updateFilters]
  );

  const queueVisibleDevicesForGeocoding = useCallback(() => {
    if (devices && devices.length > 0) {
      const startIndex = pagination.pageIndex * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const visibleDevices = devices.slice(startIndex, endIndex);

      visibleDevices.forEach((device) => {
        if (device.latitude && device.longitude) {
          queueForGeocoding(device.deviceId, device.latitude, device.longitude);
        }
      });
    }
  }, [devices, pagination.pageIndex, pagination.pageSize, queueForGeocoding]);

  const queueSelectedDeviceForGeocoding = useCallback(() => {
    if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
      queueForGeocoding(
        selectedDevice.deviceId,
        selectedDevice.latitude,
        selectedDevice.longitude,
        true
      );
    }
  }, [selectedDevice, queueForGeocoding]);

  // Keep your existing columns array here
  const columns = getLiveVehicleColumns();

  useEffect(() => {
    if (isDrawerOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 0);

      return () => {
        clearTimeout(timer);
        // document.body.style.pointerEvents = "";
      };
    } else {
      document.body.style.pointerEvents = "auto";
    }
  }, [isDrawerOpen]);

  const handleExpandTable = useCallback(() => {
    if (viewState === "mapExpanded") {
      setViewState("split");
    } else {
      setViewState((prevState) =>
        prevState === "tableExpanded" ? "split" : "tableExpanded"
      );
    }
  }, [viewState]);

  const handleExpandMap = useCallback(() => {
    if (viewState === "tableExpanded") {
      setViewState("split");
    } else {
      setViewState((prevState) =>
        prevState === "mapExpanded" ? "split" : "mapExpanded"
      );
    }
  }, [viewState]);

  const handleDeviceSelection = useCallback(
    (device: DeviceData) => {
      setSelectedVehicleId(device.deviceId);
      setSelectedDevice(device);
      setIsDrawerOpen(true);

      if (device.latitude && device.longitude) {
        queueForGeocoding(
          device.deviceId,
          device.latitude,
          device.longitude,
          true
        );
      }
    },
    [queueForGeocoding]
  );

  const handleOpenLiveTrack = (uniqueId: number, name: string) => {
    setOpen(true);
    setSelectedImei({ uniqueId, name });
  };

  useEffect(() => {
    queueVisibleDevicesForGeocoding();
  }, [queueVisibleDevicesForGeocoding]);

  useEffect(() => {
    queueSelectedDeviceForGeocoding();
  }, [queueSelectedDeviceForGeocoding]);

  const getTableClass = useMemo(() => {
    switch (viewState) {
      case "tableExpanded":
        return "flex-1 transition-all duration-300 ease-in-out";
      case "mapExpanded":
        return "w-0 overflow-hidden transition-all duration-300 ease-in-out";
      default:
        return "flex-1 transition-all duration-300 ease-in-out";
    }
  }, [viewState]);

  const getMapClass = useMemo(() => {
    switch (viewState) {
      case "mapExpanded":
        return "flex-1 transition-all duration-300 ease-in-out";
      case "tableExpanded":
        return "w-0 overflow-hidden transition-all duration-300 ease-in-out";
      default:
        return "flex-1 transition-all duration-300 ease-in-out";
    }
  }, [viewState]);

  // Calculate total count for pagination
  const totalCount = useMemo(() => {
    if (activeStatus === "all") {
      return counts.find((c) => c.total !== undefined)?.total || 0;
    }
    const statusCount = counts.find((c) => c[activeStatus] !== undefined);
    return statusCount ? statusCount[activeStatus] : 0;
  }, [counts, activeStatus]);

  // Server side pagination table instance
  const { table, tableElement } = CustomTableServerSidePagination({
    data: devices || [],
    columns,
    pagination,
    totalCount: totalCount,
    loading: isLoading,
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No devices found",
    pageSizeOptions: [5, dynamicPageSize, 10, 20, 30, 50, 100, 500, "All"],
    enableSorting: true,
    showSerialNumber: true,
    onRowClick: handleDeviceSelection,
    selectedRowId: selectedVehicleId,
    getRowId: (row: DeviceData) => row.deviceId,
    selectedRowClassName:
      "bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500",
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 20,
    overscan: 5,
    maxHeight: "calc(100dvh - 340px)",
  });

  const bottomDrawerProps = useMemo(() => {
    return {
      isDrawerOpen,
      setIsDrawerOpen,
      selectedDevice,
      addresses,
      loadingAddresses,
      handleOpenLiveTrack,

      onOpenRouteTimeline: handleOpenRouteTimeline,
    };
  }, [
    isDrawerOpen,
    setIsDrawerOpen,
    selectedDevice,
    addresses,
    loadingAddresses,
    handleOpenLiveTrack,

    handleOpenRouteTimeline,
  ]);

  const handleCloseSubscriptionPopup = () => {
    setShowSubscriptionPopup(false);
    // Mark that popup has been shown - this will persist across page navigation
    localStorage.setItem(SUBSCRIPTION_POPUP_KEY, "true");
  };

  return (
    <>
      <style jsx>{`
        .table-row-selected {
          background-color: #dbeafe !important;
          border-left: 4px solid #3b82f6 !important;
        }
        .table-row-selected:hover {
          background-color: #bfdbfe !important;
        }
        .table-row-hover:hover {
          background-color: #f9fafb;
        }
        .status-button-active {
          transform: scale(1.05);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>

      <ResponseLoader isLoading={isLoading} />


      {/* Main Dashboard Content */}
      <div className="relative h-screen bg-gray-50/50 px-4 overflow-hidden">
        {/* Dashboard Content */}
        <div className="space-y-4">

          {/* Top Row: Filter Cards */}
          <div className="flex flex-wrap gap-4 overflow-x-auto py-2 px-2">
            {counts.map((countObj, index) => {
              const [key, value] = Object.entries(countObj)[0];
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              const statusKey = key.toLowerCase() as StatusFilter;
              const isActive = activeStatus === (key === "total" ? "all" : statusKey);
              const config = statusConfig[label] || statusConfig["Total"];

              return (
                <FilterCard
                  key={index}
                  label={label}
                  count={value}
                  icon={config.icon}
                  borderColor={config.color}
                  isActive={isActive}
                  onClick={() => handleStatusFilter(key === "total" ? "all" : statusKey)}
                />
              );
            })}
          </div>

          {/* Second Row: Search and Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            {/* Search Bar (Left) */}
            <div className="relative w-full lg:w-1/3">
              <Input
                placeholder="Search bus number"
                className="w-full pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>

            {/* Controls (Right) */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
              {userRole !== "branch" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 cursor-pointer border-gray-200 hover:bg-gray-50 text-gray-700">
                      <ListFilter className="h-4 w-4" />
                      Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      {/* School Dropdown */}
                      {userRole === "superadmin" && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm leading-none mb-2">Admin</h4>
                          <Combobox
                            items={[
                              { label: "All Admins", value: "all" },
                              ...(schoolData?.map((school: any) => ({
                                label: school.schoolName,
                                value: school._id,
                              })) || []),
                            ]}
                            value={filters.schoolId || "all"}
                            onValueChange={(value) =>
                              updateFilters({
                                schoolId: value === "all" ? undefined : value,
                                branchId: undefined, // Reset branch when school changes
                              })
                            }
                            onOpenChange={setIsSchoolDropdownOpen}
                            placeholder="Select School"
                            searchPlaceholder="Search school..."
                            width="w-full"
                            className="cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Branch Dropdown */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm leading-none mb-2">Users</h4>
                        <Combobox
                          items={[
                            { label: "All Users", value: "all" },
                            ...(branchData?.map((branch: any) => ({
                              label: branch.branchName,
                              value: branch._id,
                            })) || []),
                          ]}
                          value={filters.branchId || "all"}
                          onValueChange={(value) =>
                            updateFilters({ branchId: value === "all" ? undefined : value })
                          }
                          onOpenChange={setIsBranchDropdownOpen}
                          placeholder="Select Branch"
                          searchPlaceholder="Search branch..."
                          width="w-full"
                          className="cursor-pointer"
                        />
                      </div>

                      {/* Clear Filters Button */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start cursor-pointer text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() =>
                          updateFilters({
                            schoolId:
                              userRole === "school" || userRole === "branchGroup"
                                ? userSchoolId
                                : undefined,
                            branchId: undefined,
                            category: undefined,
                          })
                        }
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <ColumnVisibilitySelector
                columns={table.getAllColumns()}
                buttonVariant="outline"
                buttonSize="default"
                className="border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
              />

              <Combobox
                items={[
                  { label: "All Types", value: "all" },
                  ...(categoryData?.map((cat: any) => ({
                    label: cat.categoryName,
                    value: cat._id,
                  })) || []),
                ]}
                value={filters.category || "all"}
                onValueChange={(value) =>
                  updateFilters({ category: value === "all" ? undefined : value })
                }
                onOpenChange={setIsCategoryDropdownOpen}
                placeholder="Vehicle Type"
                searchPlaceholder="Search type..."
                className="hidden lg:flex cursor-pointer border-gray-200 hover:bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* Main Layout */}
          <div className="dashboard">
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-0">
              <section className={`overflow-auto min-h-[300px] lg:min-h-0 ${getTableClass}`}>
                {viewState === "mapExpanded" && (
                  <div className="absolute top-1/2 left-0 z-50 hidden lg:block">
                    <button
                      onClick={handleExpandTable}
                      className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  ${viewState === "mapExpanded"
                        ? "bg-blue-100"
                        : "bg-white text-gray-600"
                        }`}
                      title={"Expand table"}
                    >
                      <ChevronsRight className="w-4 h-4 hover:text-white" />
                    </button>
                  </div>
                )}

                {viewState !== "mapExpanded" && <div className="min-h-[300px] lg:min-h-0">{tableElement}</div>}
              </section>

              {/* Arrow Controls - hidden on mobile */}
              {!["tableExpanded", "mapExpanded"].includes(viewState) && (
                <div className="hidden lg:flex flex-col justify-center items-center space-y-2 z-50 absolute top-1/2 right-[48.5%]">
                  <button
                    onClick={handleExpandMap}
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 [animation-duration:_300ms] [animation:_fadeIn_300ms_ease-in_forwards] ${viewState === "mapExpanded"
                      ? "bg-blue-100 "
                      : "bg-white text-gray-600"
                      }`}
                    title={
                      viewState === "mapExpanded" ? "Show both" : "Expand map"
                    }
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleExpandTable}
                    className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  [animation-duration:_500ms] [animation:_fadeIn_300ms_ease-in_forwards] ${viewState === "tableExpanded"
                      ? "bg-blue-100"
                      : "bg-white text-gray-600"
                      }`}
                    title={
                      viewState === "tableExpanded"
                        ? "Show both"
                        : "Expand table"
                    }
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Right Side - Map */}
              <section className={`${getMapClass} rounded-lg overflow-hidden min-h-[300px] lg:min-h-0`}>
                {viewState !== "tableExpanded" && (
                  <VehicleMap
                    vehicles={devices}
                    height="calc(100dvh - 280px)"
                    autoFitBounds={false}
                    showTrails={false}
                    clusterMarkers={devices.length > 100}
                    zoom={6}
                    selectedVehicleId={selectedVehicleId}
                    onVehicleSelect={setSelectedVehicleId}
                    fitBoundsTrigger={fitBoundsTrigger}
                  />
                )}
                {viewState === "tableExpanded" && (
                  <div className="absolute top-1/2 right-2 z-50 hidden lg:block">
                    <button
                      onClick={handleExpandMap}
                      className={`p-2 rounded-full border border-gray-300 hover:bg-primary transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5  ${viewState === "mapExpanded"
                        ? "bg-blue-100 "
                        : "bg-white text-gray-600"
                        }`}
                      title={
                        viewState === "mapExpanded" ? "Show both" : "Expand map"
                      }
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>


        {/* Drawer */}
        <div className="lg:hidden">
          {/* Drawer only for mobile if needed, or keeping it for both but controlling visibility */}
          <BottomDrawer {...bottomDrawerProps} />
        </div>
        <div className="hidden lg:block">
          <BottomDrawer {...bottomDrawerProps} />
        </div>


        <LiveTrack open={open} setOpen={setOpen} selectedImei={selectedImei} />

        <RouteTimeline
          isOpen={isRouteTimelineOpen}
          onOpenChange={setIsRouteTimelineOpen}
          uniqueId={routeTimelineData?.uniqueId}
          deviceName={routeTimelineData?.deviceName}
        />

        {/* Subscription Expiry Popup - Fixed to bottom-right corner */}
        {showSubscriptionPopup && (
          <SubscriptionExpiry
            isOpen={showSubscriptionPopup}
            onClose={handleCloseSubscriptionPopup}
            branches={expiredBranches}
          />
        )}
      </div>
    </>
  );
}
