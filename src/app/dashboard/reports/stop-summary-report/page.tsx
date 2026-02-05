"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
    ReportFilter,
    FilterValues,
} from "@/components/report-filters/Report-Filter";
import {
    VisibilityState,
    type ColumnDef,
    PaginationState,
    SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useStopSummaryReport } from "@/hooks/reports/useStopSummaryReport";
import { FaPlus, FaMinus } from "react-icons/fa";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types for the stop summary data
interface Stop {
    stopStart: string;
    stopEnd: string;
    haltTime: string;
    haltSecs: number;
    latitude: number;
    longitude: number;
    distanceFromPrev: number;
}

interface DayWiseStop {
    date: string;
    totalStops: number;
    totalHaltTime: string;
    stops: Stop[];
}

interface ReportData {
    deviceId: number;
    name: string;
    totalDistance: number;
    totalStopTime: string;
    dayWiseStops: DayWiseStop[];
}

interface StopDetailRow {
    id: string;
    stopNo: number;
    startTime: string;
    endTime: string;
    haltTime: string;
    haltSecs: number;
    latitude: number;
    longitude: number;
    distanceFromPrev: number;
    date: string;
}

interface ExpandedRowData extends ReportData {
    id: string;
    sn: number;
    isLoading?: boolean;
    isDetailTable?: boolean;
    isEmpty?: boolean;
    stopDetails?: StopDetailRow[];
}

// Demo data for testing
const DEMO_DATA: ReportData[] = [
    {
        deviceId: 8589,
        name: "MH49AQ4750",
        totalDistance: 146.35,
        totalStopTime: "5D, 11H, 48M, 46S",
        dayWiseStops: [
            {
                date: "2026-01-26",
                totalStops: 6,
                totalHaltTime: "0D, 14H, 25M, 46S",
                stops: [
                    { stopStart: "2026-01-26T13:51:48.401Z", stopEnd: "2026-01-26T14:14:58.391Z", haltTime: "0D, 0H, 23M, 9S", haltSecs: 1389.99, latitude: 21.08290277777778, longitude: 79.09556666666667, distanceFromPrev: 5.94 },
                    { stopStart: "2026-01-26T14:33:08.401Z", stopEnd: "2026-01-26T15:13:08.548Z", haltTime: "0D, 0H, 40M, 0S", haltSecs: 2400.147, latitude: 21.060702777777777, longitude: 79.07727055555556, distanceFromPrev: 17.37 },
                    { stopStart: "2026-01-26T16:00:38.594Z", stopEnd: "2026-01-26T19:00:38.958Z", haltTime: "0D, 3H, 0M, 0S", haltSecs: 10800.364, latitude: 21.155611111111114, longitude: 79.1027438888889, distanceFromPrev: 21 },
                    { stopStart: "2026-01-26T19:09:09.009Z", stopEnd: "2026-01-26T19:16:18.968Z", haltTime: "0D, 0H, 7M, 9S", haltSecs: 429.959, latitude: 21.148824444444443, longitude: 79.11969111111111, distanceFromPrev: 24.99 },
                    { stopStart: "2026-01-26T19:29:49.000Z", stopEnd: "2026-01-26T22:47:09.249Z", haltTime: "0D, 3H, 17M, 20S", haltSecs: 11840.249, latitude: 21.131860555555555, longitude: 79.13855166666666, distanceFromPrev: 31.3 },
                    { stopStart: "2026-01-26T23:11:19.267Z", stopEnd: "2026-01-27T06:09:25.254Z", haltTime: "0D, 6H, 58M, 5S", haltSecs: 25085.987, latitude: 21.155694444444446, longitude: 79.10265944444444, distanceFromPrev: 33.78 }
                ]
            },
            {
                date: "2026-01-27",
                totalStops: 5,
                totalHaltTime: "0D, 8H, 37M, 53S",
                stops: [
                    { stopStart: "2026-01-27T06:15:55.128Z", stopEnd: "2026-01-27T07:25:05.276Z", haltTime: "0D, 1H, 9M, 10S", haltSecs: 4150.148, latitude: 21.16926611111111, longitude: 79.1114688888889, distanceFromPrev: 35.57 },
                    { stopStart: "2026-01-27T07:28:35.359Z", stopEnd: "2026-01-27T07:52:15.344Z", haltTime: "0D, 0H, 23M, 39S", haltSecs: 1419.985, latitude: 21.172461666666667, longitude: 79.09989944444445, distanceFromPrev: 37.68 },
                    { stopStart: "2026-01-27T07:58:25.334Z", stopEnd: "2026-01-27T12:54:46.887Z", haltTime: "0D, 4H, 56M, 21S", haltSecs: 17781.553, latitude: 21.155962777777777, longitude: 79.10271277777778, distanceFromPrev: 40.21 },
                    { stopStart: "2026-01-27T13:11:16.957Z", stopEnd: "2026-01-27T14:46:57.760Z", haltTime: "0D, 1H, 35M, 40S", haltSecs: 5740.803, latitude: 21.154218333333336, longitude: 79.07488388888889, distanceFromPrev: 41.13 },
                    { stopStart: "2026-01-27T14:56:57.754Z", stopEnd: "2026-01-27T16:59:29.386Z", haltTime: "0D, 2H, 2M, 31S", haltSecs: 7351.632, latitude: 21.15408, longitude: 79.07481444444444, distanceFromPrev: 46.06 }
                ]
            }
        ]
    },
    {
        deviceId: 9021,
        name: "MH12AB1234",
        totalDistance: 89.42,
        totalStopTime: "2D, 5H, 12M, 30S",
        dayWiseStops: [
            {
                date: "2026-01-26",
                totalStops: 4,
                totalHaltTime: "0D, 6H, 45M, 12S",
                stops: [
                    { stopStart: "2026-01-26T08:30:00.000Z", stopEnd: "2026-01-26T09:15:00.000Z", haltTime: "0D, 0H, 45M, 0S", haltSecs: 2700, latitude: 19.076090, longitude: 72.877426, distanceFromPrev: 12.5 },
                    { stopStart: "2026-01-26T11:00:00.000Z", stopEnd: "2026-01-26T12:30:00.000Z", haltTime: "0D, 1H, 30M, 0S", haltSecs: 5400, latitude: 19.082580, longitude: 72.871208, distanceFromPrev: 18.3 },
                    { stopStart: "2026-01-26T14:45:00.000Z", stopEnd: "2026-01-26T16:00:00.000Z", haltTime: "0D, 1H, 15M, 0S", haltSecs: 4500, latitude: 19.017615, longitude: 72.856164, distanceFromPrev: 25.7 },
                    { stopStart: "2026-01-26T18:30:00.000Z", stopEnd: "2026-01-26T21:45:12.000Z", haltTime: "0D, 3H, 15M, 12S", haltSecs: 11712, latitude: 19.028512, longitude: 72.854271, distanceFromPrev: 32.92 }
                ]
            }
        ]
    }
];

const StopSummaryReportPage: React.FC = () => {
    const [hasGenerated, setHasGenerated] = useState(false);
    const [showDemo, setShowDemo] = useState(true);
    const [showTable, setShowTable] = useState(true);

    // Table state
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Expansion state
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [detailedData, setDetailedData] = useState<Record<string, StopDetailRow[]>>({});
    const [detailTableStates, setDetailTableStates] = useState<
        Record<string, { pagination: PaginationState; sorting: SortingState }>
    >({});

    const [apiFilters, setApiFilters] = useState<Record<string, any>>({
        schoolId: undefined,
        branchId: undefined,
        uniqueIds: [],
        from: undefined,
        to: undefined,
    });

    const { data, isFetching } = useStopSummaryReport({
        filters: apiFilters,
        hasGenerated,
    });

    const reportData: ReportData[] = showDemo ? DEMO_DATA : (data?.reportData ?? []);

    // Transform day-wise stops to flat array
    const transformStopsData = useCallback((row: ReportData): StopDetailRow[] => {
        const allStops: StopDetailRow[] = [];
        let stopNo = 1;

        row.dayWiseStops?.forEach((day) => {
            day.stops?.forEach((stop) => {
                allStops.push({
                    id: `${row.deviceId}-${day.date}-${stopNo}`,
                    stopNo: stopNo++,
                    startTime: new Date(stop.stopStart).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                    }),
                    endTime: new Date(stop.stopEnd).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                    }),
                    haltTime: parseHaltTime(stop.haltTime),
                    haltSecs: stop.haltSecs,
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                    distanceFromPrev: stop.distanceFromPrev,
                    date: day.date,
                });
            });
        });

        return allStops;
    }, []);

    // Toggle row expansion
    const toggleRowExpansion = useCallback(
        (rowId: string, rowData: ReportData) => {
            if (expandedRows.has(rowId)) {
                // Collapse row
                const newExpandedRows = new Set(expandedRows);
                newExpandedRows.delete(rowId);
                setExpandedRows(newExpandedRows);
            } else {
                // Expand row - first populate the detail data, then expand
                if (!detailTableStates[rowId]) {
                    setDetailTableStates((prev) => ({
                        ...prev,
                        [rowId]: {
                            pagination: { pageIndex: 0, pageSize: 10 },
                            sorting: [],
                        },
                    }));
                }

                // Always generate detail data when expanding
                const transformedDetails = transformStopsData(rowData);
                setDetailedData((prev) => ({
                    ...prev,
                    [rowId]: transformedDetails,
                }));

                // Add to expanded rows
                const newExpandedRows = new Set(expandedRows);
                newExpandedRows.add(rowId);
                setExpandedRows(newExpandedRows);
            }
        },
        [expandedRows, transformStopsData, detailTableStates]
    );

    const handleDetailPaginationChange = useCallback(
        (rowId: string, newPagination: PaginationState) => {
            setDetailTableStates((prev) => ({
                ...prev,
                [rowId]: { ...prev[rowId], pagination: newPagination },
            }));
        },
        []
    );

    const handleDetailSortingChange = useCallback(
        (rowId: string, newSorting: SortingState) => {
            setDetailTableStates((prev) => ({
                ...prev,
                [rowId]: { ...prev[rowId], sorting: newSorting },
            }));
        },
        []
    );

    // Transform API data
    const transformedReportData = useMemo(() => {
        return reportData.map((item, index) => ({
            ...item,
            id: `row-${item.deviceId}-${index}`,
            sn: pagination.pageIndex * pagination.pageSize + index + 1,
        }));
    }, [reportData, pagination]);

    // Create expanded data array
    const createExpandedData = useCallback((): ExpandedRowData[] => {
        const expandedDataArray: ExpandedRowData[] = [];

        transformedReportData.forEach((row) => {
            expandedDataArray.push(row);

            if (expandedRows.has(row.id)) {
                if (detailedData[row.id]?.length) {
                    expandedDataArray.push({
                        ...row,
                        id: `${row.id}-details`,
                        isDetailTable: true,
                        stopDetails: detailedData[row.id],
                    });
                } else {
                    expandedDataArray.push({
                        ...row,
                        id: `${row.id}-empty`,
                        isEmpty: true,
                    });
                }
            }
        });

        return expandedDataArray;
    }, [transformedReportData, expandedRows, detailedData]);

    // Detail columns
    const stopDetailColumns: ColumnDef<StopDetailRow>[] = useMemo(
        () => [
            { accessorKey: "stopNo", header: "#", size: 50 },
            { accessorKey: "date", header: "Date", size: 100, cell: ({ row }) => new Date(row.original.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
            { accessorKey: "startTime", header: "Start Time", size: 120 },
            { accessorKey: "endTime", header: "End Time", size: 120 },
            {
                accessorKey: "haltTime",
                header: "Duration",
                size: 100,
                cell: ({ row }) => {
                    const secs = row.original.haltSecs;
                    return (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-xs",
                                secs > 3600 ? "border-red-200 bg-red-50 text-red-700" :
                                    secs > 1800 ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
                                        "border-green-200 bg-green-50 text-green-700"
                            )}
                        >
                            {row.original.haltTime}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "coordinates",
                header: "Location",
                size: 180,
                cell: ({ row }) => {
                    const lat = row.original.latitude;
                    const lng = row.original.longitude;
                    return (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline hover:text-blue-800"
                                    >
                                        {lat.toFixed(4)}, {lng.toFixed(4)}
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-black/80 text-white font-bold rounded-md px-3 py-2 shadow-lg">
                                    <p>Click to see on Google Map</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                },
            },
            { accessorKey: "distanceFromPrev", header: "Distance (km)", size: 100, cell: ({ row }) => `${row.original.distanceFromPrev.toFixed(2)} km` },
        ],
        []
    );

    // Main columns
    const columns: ColumnDef<ExpandedRowData>[] = useMemo(
        () => [
            {
                id: "expand",
                header: "",
                size: 50,
                cell: ({ row }) => {
                    if (row.original.isLoading || row.original.isDetailTable || row.original.isEmpty) return null;

                    const isExpanded = expandedRows.has(row.original.id);
                    const hasDayWiseStops = row.original.dayWiseStops?.some((d) => d.stops?.length > 0);

                    if (!hasDayWiseStops) return null;

                    return (
                        <div className="flex justify-center">
                            <button
                                onClick={() => toggleRowExpansion(row.original.id, row.original)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                            >
                                <span className={`inline-flex items-center justify-center transition-all duration-300 ${isExpanded ? "rotate-180 scale-110" : ""}`}>
                                    {isExpanded ? <FaMinus className="text-red-500 text-sm" /> : <FaPlus className="text-green-500 text-sm" />}
                                </span>
                            </button>
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: "sn",
                header: "SN",
                size: 60,
                cell: ({ row }) => {
                    if (row.original.isDetailTable || row.original.isEmpty) return null;
                    return row.original.sn;
                },
            },
            {
                id: "vehicleNumber",
                accessorKey: "name",
                header: "Vehicle Number",
                size: 150,
                cell: ({ row }) => {
                    if (row.original.isDetailTable && row.original.stopDetails) {
                        const parentRowId = row.original.id.replace("-details", "");
                        const detailState = detailTableStates[parentRowId] || {
                            pagination: { pageIndex: 0, pageSize: 10 },
                            sorting: [],
                        };

                        return (
                            <div className="col-span-full w-full">
                                <div className="w-full bg-gray-50 rounded p-4 my-2">
                                    <h3 className="text-sm font-semibold mb-2 text-gray-700">
                                        Stop details for {row.original.name}
                                    </h3>
                                    <TravelTable
                                        data={row.original.stopDetails}
                                        columns={stopDetailColumns}
                                        pagination={detailState.pagination}
                                        totalCount={row.original.stopDetails.length}
                                        onPaginationChange={(p) => handleDetailPaginationChange(parentRowId, p)}
                                        onSortingChange={(s) => handleDetailSortingChange(parentRowId, s)}
                                        sorting={detailState.sorting}
                                        enableSorting={false}
                                        emptyMessage="No stop data available"
                                        pageSizeOptions={[10, 20, 30]}
                                        showSerialNumber={false}
                                        maxHeight="400px"
                                    />
                                </div>
                            </div>
                        );
                    }

                    if (row.original.isEmpty) {
                        return (
                            <div className="col-span-full w-full">
                                <div className="p-4 bg-gray-50 rounded text-center text-gray-500">
                                    No stop data available for {row.original.name}
                                </div>
                            </div>
                        );
                    }

                    return row.original.name;
                },
            },
            {
                accessorKey: "totalDistance",
                header: "Total Distance",
                size: 120,
                cell: ({ row }) => {
                    if (row.original.isDetailTable || row.original.isEmpty) return null;
                    return `${row.original.totalDistance.toFixed(2)} km`;
                },
            },
            {
                accessorKey: "totalStopTime",
                header: "Total Stop Time",
                size: 140,
                cell: ({ row }) => {
                    if (row.original.isDetailTable || row.original.isEmpty) return null;
                    return parseHaltTime(row.original.totalStopTime);
                },
            },
            {
                id: "totalStops",
                header: "Total Stops",
                size: 100,
                cell: ({ row }) => {
                    if (row.original.isDetailTable || row.original.isEmpty) return null;
                    const totalStops = row.original.dayWiseStops?.reduce((sum, d) => sum + d.totalStops, 0) || 0;
                    return totalStops;
                },
            },
        ],
        [expandedRows, detailTableStates, toggleRowExpansion, handleDetailPaginationChange, handleDetailSortingChange, stopDetailColumns]
    );

    const handleFilterSubmit = useCallback((filters: FilterValues) => {
        const deviceIds = Array.isArray(filters.deviceId)
            ? filters.deviceId
            : filters.deviceId ? [filters.deviceId] : [];

        if (deviceIds.length === 0 || !filters.from || !filters.to) {
            alert("Please select at least one vehicle and date range");
            return;
        }

        setPagination({ pageIndex: 0, pageSize: 10 });
        setSorting([]);
        setExpandedRows(new Set());
        setDetailedData({});
        setDetailTableStates({});
        setShowDemo(false);

        setApiFilters({
            schoolId: filters.schoolId,
            branchId: filters.branchId,
            uniqueIds: deviceIds,
            from: filters.from,
            to: filters.to,
        });

        setHasGenerated(true);
        setShowTable(true);
    }, []);

    const expandedDataArray = createExpandedData();

    const { table, tableElement } = CustomTableServerSidePagination({
        data: expandedDataArray,
        columns,
        pagination,
        totalCount: reportData.length,
        loading: isFetching,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        sorting,
        columnVisibility,
        onColumnVisibilityChange: setColumnVisibility,
        emptyMessage: isFetching ? "Loading report data..." : "No data available",
        pageSizeOptions: [5, 10, 20, 50],
        enableSorting: false,
        showSerialNumber: false,
        enableVirtualization: true,
        estimatedRowHeight: 50,
        overscan: 5,
        maxHeight: "600px",
    });

    return (
        <div className="p-6 h-full overflow-auto">
            <ResponseLoader isLoading={isFetching} />

            <ReportFilter
                onSubmit={handleFilterSubmit}
                table={table}
                className="mb-6"
                config={{
                    showSchool: true,
                    showBranch: true,
                    showDevice: true,
                    showDateRange: true,
                    showSubmitButton: true,
                    submitButtonText: isFetching ? "Generating..." : "Generate",
                    submitButtonDisabled: isFetching,
                    cardTitle: "Stoppage Summary Report",
                    multiSelectDevice: true,
                    showBadges: true,
                    maxBadges: 3,
                }}
            />

            {showTable && <section className="mb-4">{tableElement}</section>}
        </div>
    );
};

// Helper function
function parseHaltTime(haltTime: string): string {
    const match = haltTime.match(/(\d+)D,\s*(\d+)H,\s*(\d+)M/);
    if (match) {
        const [, days, hours, mins] = match;
        if (parseInt(days) > 0) return `${days}d ${hours}h ${mins}m`;
        if (parseInt(hours) > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }
    return haltTime;
}

export default StopSummaryReportPage;