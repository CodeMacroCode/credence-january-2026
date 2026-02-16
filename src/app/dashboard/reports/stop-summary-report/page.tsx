"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    ReportFilter
} from "@/components/report-filters/Report-Filter";
import {
    VisibilityState,
    ColumnDef
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useStopSummaryReport } from "@/hooks/reports/useStopSummaryReport";
import { FaPlus, FaMinus } from "react-icons/fa";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import { useQueryClient } from "@tanstack/react-query";

import { useDeviceDropdownWithUniqueIdForHistory, DropdownItem } from "@/hooks/useDropdown";
import { useExport } from "@/hooks/useExport";
import DownloadProgress from "@/components/DownloadProgress";
import { reportService } from "@/services/api/reportService";
import { toast } from "sonner";

// --- Types ---

interface Stop {
    stopStart: string;
    stopEnd: string;
    haltTime: string;
    haltSecs: number;
    latitude: number;
    longitude: number;
    distanceFromPrev: number;
    [key: string]: unknown;
}

interface DayWiseStop {
    date: string;
    totalStops: number;
    totalHaltTime: string;
    stops: Stop[];
}

interface ReportData {
    uniqueId: number;
    name: string;
    totalDistance: number;
    totalStopTime: string;
    dayWiseStops: DayWiseStop[];
    [key: string]: unknown;
}

// Flattened detail data for the nested table
interface StopDetailTableData {
    id: string;
    date: string;
    stopStart: string;
    stopEnd: string;
    haltTime: string;
    latitude: number;
    longitude: number;
    coordinates: string;
    address: string;
    distanceFromPrev: string;
    [key: string]: unknown;
}

interface ExpandedRowData extends ReportData {
    id: string;
    sn: number;
    isLoading?: boolean;
    isDetailTable?: boolean; // Used for Level 2 (Day Wise Table) container
    isEmpty?: boolean;
}

// --- Helper Functions ---

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}


// --- Main Component ---

const StopSummaryReportPage: React.FC = () => {
    const [hasGenerated, setHasGenerated] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    });

    const [sorting, setSorting] = useState<any[]>([]);
    const [apiFilters, setApiFilters] = useState<{ uniqueIds: number[]; from?: string; to?: string }>({
        uniqueIds: [],
        from: undefined,
        to: undefined,
    });

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadLabel, setDownloadLabel] = useState("");
    const { exportToPDF, exportToExcel } = useExport();

    const updateProgress = (percent: number, label: string) => {
        setDownloadProgress(percent);
        setDownloadLabel(label);
    };

    const [cashedDeviceId, setCashedDeviceId] = useState<
        { _id: string; name: string; uniqueId: string }[] | null
    >(null);
    const queryClient = useQueryClient();

    // Fetch device list for mapping names
    const { data: deviceList } = useDeviceDropdownWithUniqueIdForHistory();

    const deviceMap = useMemo(() => {
        if (!deviceList) return {};

        // Handle if deviceList is wrapped in { data: [...] } or is directly an array
        const items = Array.isArray(deviceList) ? deviceList : (deviceList as any).data || [];

        if (!Array.isArray(items)) return {};

        return items.reduce((acc: Record<string, string>, device: any) => {
            // Check for valid ID and Name
            const id = device.uniqueId || device._id;
            if (id) {
                acc[String(id)] = device.name || "Unknown Device";
            }
            return acc;
        }, {});
    }, [deviceList]);


    // Expansion state
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set()); // Level 1: Vehicles
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set()); // Level 2: Days (key: vehicleId-date)

    // Cache for enriched stops (Level 3 data with addresses)
    const [enrichedDayStops, setEnrichedDayStops] = useState<
        Record<string, StopDetailTableData[]>
    >({});

    // Detail table sorting state per expanded row
    const [detailTableSorting, setDetailTableSorting] = useState<
        Record<string, any[]>
    >({});


    const { data: reportData = [], isFetching, isLoading } = useStopSummaryReport({
        filters: {
            uniqueIds: apiFilters.uniqueIds,
            from: apiFilters.from,
            to: apiFilters.to,
        },
        hasGenerated,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
    });

    // Handle API response structure
    const reportDataItems = useMemo(() => {
        if (Array.isArray(reportData)) return reportData;
        if ((reportData as any)?.reportData && Array.isArray((reportData as any).reportData)) {
            return (reportData as any).reportData;
        }
        return (reportData as any)?.data || [];
    }, [reportData]);

    const totalRecords = (reportData as any)?.totalCount || (reportData as any)?.total || (reportData as any)?.count || reportDataItems.length;

    // Fetch cached device IDs
    useEffect(() => {
        const cachedDevices = queryClient.getQueryData<
            { _id: string; name: string; uniqueId: string }[]
        >(["device-dropdown-uniqueId"]);
        if (cachedDevices) setCashedDeviceId(cachedDevices);
    }, [queryClient]);


    // Step 1: Transform ONE day's stops (Level 3 enrichment)
    const transformDayStops = useCallback(async (
        dayDate: string,
        stops: Stop[]
    ): Promise<StopDetailTableData[]> => {
        // Fetch addresses in parallel
        const enriched = await Promise.all(stops.map(async (stop: Stop, index: number) => {
            let address = "Address not available";
            if (stop.latitude && stop.longitude) {
                // Address could be cached here if needed
                address = await reverseGeocodeMapTiler(stop.latitude, stop.longitude);
            }

            return {
                id: `stop-${dayDate}-${index}`,
                date: formatDate(dayDate),
                stopStart: formatDateTime(stop.stopStart),
                stopEnd: formatDateTime(stop.stopEnd),
                haltTime: stop.haltTime,
                latitude: stop.latitude,
                longitude: stop.longitude,
                coordinates: `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`,
                address: address,
                distanceFromPrev: `${stop.distanceFromPrev.toFixed(2)} KM`,
            };
        }));
        return enriched;
    }, []);

    // Toggle Vehicle Expansion (Level 1)
    const toggleRowExpansion = useCallback((rowId: string) => {
        const newExpandedRows = new Set(expandedRows);
        if (expandedRows.has(rowId)) {
            newExpandedRows.delete(rowId);
        } else {
            newExpandedRows.add(rowId);
        }
        setExpandedRows(newExpandedRows);
    }, [expandedRows]);

    // Toggle Day Expansion (Level 2)
    const toggleDayExpansion = useCallback(async (vehicleId: string, day: DayWiseStop) => {
        const dayKey = `${vehicleId}-${day.date}`;
        const newExpandedDays = new Set(expandedDays);

        if (expandedDays.has(dayKey)) {
            newExpandedDays.delete(dayKey);
            setExpandedDays(newExpandedDays);
        } else {
            newExpandedDays.add(dayKey);
            setExpandedDays(newExpandedDays);

            // Fetch/Enrich data if not present (or empty)
            if (!enrichedDayStops[dayKey] && day.stops?.length > 0) {
                try {
                    const transformed = await transformDayStops(day.date, day.stops);
                    setEnrichedDayStops(prev => ({
                        ...prev,
                        [dayKey]: transformed
                    }));
                } catch (err) {

                }
            }
        }
    }, [expandedDays, enrichedDayStops, transformDayStops]);


    // Prepare data with IDs (Level 1)
    const transformedReportData = useMemo(() => {
        return reportDataItems.map((item: ReportData, index: number) => ({
            ...item,
            id: `row-${item.uniqueId}`,
            sn: pagination.pageIndex * pagination.pageSize + index + 1,
        }));
    }, [reportDataItems, pagination]);

    // Create final flattened array for the Main Table (Level 1 + Level 2 Container)
    const expandedDataArray = useCallback((): ExpandedRowData[] => {
        const result: ExpandedRowData[] = [];
        transformedReportData.forEach((row: any) => {
            result.push(row);
            if (expandedRows.has(row.id)) {
                // Insert a special row that acts as the container for Level 2 (Day Wise Table)
                // We don't need to flatten days into main table rows because we want a 
                // separate table structure for days, or we can just render the DayWiseTable 
                // inside the expanded row cell. 
                // The `CustomTable` logic expects a row to render generic content if `isDetailTable` is true.
                // So we push ONE detail row which will contain the *entire* DayWiseTable.

                result.push({
                    ...row,
                    id: `${row.id}-details`,
                    isDetailTable: true, // Signals column def to render the nested table
                });
            }
        });
        return result;
    }, [transformedReportData, expandedRows]);


    // --- Column Definitions ---

    // Level 3: Detailed Stops Columns
    const stopDetailColumns: ColumnDef<StopDetailTableData>[] = useMemo(() => [
        {
            accessorKey: "stopStart",
            header: "Start Time",
            size: 150,
        },
        {
            accessorKey: "stopEnd",
            header: "End Time",
            size: 150,
        },
        {
            accessorKey: "haltTime",
            header: "Duration",
            size: 100,
            cell: (info) => <span className="text-gray-600 font-medium">{info.getValue() as string}</span>
        },
        {
            accessorKey: "coordinates",
            header: "Coordinates",
            cell: ({ row }) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href={`https://www.google.com/maps?q=${row.original.latitude},${row.original.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800 text-xs"
                            >
                                {row.original.coordinates}
                            </a>
                        </TooltipTrigger>
                        <TooltipContent className="bg-black/80 text-white">
                            <p>View on Google Maps</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        {
            accessorKey: "address",
            header: "Address",
            size: 250,
            cell: ({ row }) => (
                <span className="text-gray-600 text-xs block min-w-[200px]" title={row.original.address}>
                    {row.original.address}
                </span>
            ),
            meta: {
                wrapConfig: { wrap: "wrap", maxWidth: "300px" },
            },
        },
        {
            accessorKey: "distanceFromPrev",
            header: "Dist. (Prev)",
            size: 80,
        }
    ], []);


    // Level 1: Main Table Columns
    const columns: ColumnDef<ExpandedRowData>[] = useMemo(() => [
        {
            accessorKey: "sn",
            header: "SN",
            size: 80,
            cell: ({ row }) => {
                if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;

                const isExpanded = expandedRows.has(row.original.id);
                const hasStops = row.original.dayWiseStops && row.original.dayWiseStops.some((d: DayWiseStop) => d.totalStops > 0);

                return (
                    <div className="flex items-center gap-2 justify-center">
                        <span className="font-medium text-gray-600">{row.original.sn}</span>
                        {hasStops && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpansion(row.original.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
                                title={isExpanded ? "Collapse Details" : "Expand Details"}
                            >
                                {isExpanded ? (
                                    <FaMinus className="text-red-500 text-xs" />
                                ) : (
                                    <FaPlus className="text-green-600 text-xs" />
                                )}
                            </button>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "name",
            id: "vehicleNumber",
            header: "Vehicle Number",
            size: 200,
            cell: ({ row }) => {
                // --- RENDER LEVEL 2 (Day Wise Table) ---
                if (row.original.isDetailTable) {
                    const parentRow = transformedReportData.find((r: ExpandedRowData) => r.id === row.original.id.replace("-details", ""));
                    if (!parentRow) return null;

                    const dayWiseStops = parentRow.dayWiseStops || [];

                    return (
                        <div className="w-full bg-gray-50/50 border-l-4 border-blue-500 rounded p-4 my-2 transition-all shadow-inner">
                            <div className="mb-3 text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                                <span>Day-wise Summary for {parentRow.name}</span>
                                <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded border">
                                    {dayWiseStops.length} Days Recorded
                                </span>
                            </div>

                            {/* Simple Table for Level 2 */}
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                        <tr>
                                            <th className="px-4 py-2 w-16 text-center">Action</th>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2 text-center">Total Stops</th>
                                            <th className="px-4 py-2 text-right">Total Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {dayWiseStops.map((day: DayWiseStop, idx: number) => {
                                            const dayKey = `${parentRow.id}-${day.date}`;
                                            const isDayExpanded = expandedDays.has(dayKey);
                                            const hasDayStops = day.totalStops > 0;
                                            const enrichedStops = enrichedDayStops[dayKey] || [];
                                            const detailSorting = detailTableSorting[dayKey] || [];

                                            return (
                                                <React.Fragment key={idx}>
                                                    <tr className={`hover:bg-blue-50/20 transition-colors ${isDayExpanded ? 'bg-blue-50' : ''}`}>
                                                        <td className="px-4 py-3 text-center">
                                                            {hasDayStops ? (
                                                                <button
                                                                    onClick={() => toggleDayExpansion(parentRow.id, day)}
                                                                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors border border-transparent hover:border-gray-300"
                                                                    title={isDayExpanded ? "Collapse Stops" : "Show Stops"}
                                                                >
                                                                    {isDayExpanded ? (
                                                                        <FaMinus className="text-red-500 text-[10px]" />
                                                                    ) : (
                                                                        <FaPlus className="text-blue-600 text-[10px]" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-gray-800">{formatDate(day.date)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${day.totalStops > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>
                                                                {day.totalStops}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">{day.totalHaltTime}</td>
                                                    </tr>

                                                    {/* --- RENDER LEVEL 3 (Details Table) --- */}
                                                    {isDayExpanded && (
                                                        <tr>
                                                            <td colSpan={4} className="p-0 border-b bg-gray-50">
                                                                <div className="p-4 pl-12 border-l-4 border-l-blue-200">
                                                                    {enrichedStops.length > 0 ? (
                                                                        <div className="rounded-md border overflow-hidden shadow-sm">
                                                                            <TravelTable
                                                                                data={enrichedStops}
                                                                                columns={stopDetailColumns}
                                                                                totalCount={enrichedStops.length}
                                                                                sorting={detailSorting}
                                                                                onSortingChange={(val) => setDetailTableSorting(prev => ({ ...prev, [dayKey]: val as any[] }))}
                                                                                manualSorting={false}
                                                                                emptyMessage="No stops found."
                                                                                showSerialNumber={true}
                                                                                maxHeight="300px" // Fixed height for nested stops
                                                                                headerBackgroundColor="#4b5563"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-6 text-gray-500 text-sm animate-pulse bg-white rounded border border-dashed">
                                                                            Loading details for {formatDate(day.date)}...
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {dayWiseStops.length === 0 && (
                                            <tr><td colSpan={4} className="p-4 text-center text-gray-500 italic">No summary data available for this range.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                }

                if (row.original.isLoading) return null;
                if (row.original.isEmpty) return null;

                // Map uniqueId to Name from Dropdown List
                const displayName = deviceMap[String(row.original.uniqueId)] || row.original.name || row.original.uniqueId;

                return <span className="font-semibold text-gray-800 block truncate" title={String(displayName)}>{displayName}</span>;
            }
        },
        {
            accessorKey: "totalDistance",
            header: "Total Distance (KM)",
            cell: ({ row }) => {
                if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
                return <div className="text-center font-bold bg-gray-100 px-3 py-1 rounded-full w-fit mx-auto text-gray-700 text-xs border border-gray-200">{row.original.totalDistance?.toFixed(2) ?? 0}</div>
            }
        },
        {
            accessorKey: "totalStopTime",
            header: "Total Stop Time",
            cell: ({ row }) => {
                if (row.original.isDetailTable || row.original.isEmpty || row.original.isLoading) return null;
                return <div className="text-center font-mono text-xs text-gray-600">{row.original.totalStopTime}</div>
            }
        },
    ], [expandedRows, expandedDays, enrichedDayStops, detailTableSorting, transformedReportData, toggleRowExpansion, toggleDayExpansion, stopDetailColumns, deviceMap]);


    // --- Export Logic ---

    const fetchReportForExport = async (): Promise<any[]> => {
        // Use the total count from the current report data if available, otherwise default to "all"
        const limit = totalRecords > 0 ? totalRecords : "all";

        // Use reportService to match the main table's data fetching logic (POST request)
        const res = await reportService.getStopSummaryReport({
            uniqueIds: apiFilters.uniqueIds.map(String),
            from: apiFilters.from!,
            to: apiFilters.to!,
            page: 1,
            limit: limit
        });

        let data: any[] = [];
        if (Array.isArray(res)) {
            data = res;
        } else {
            data = (res as any)?.reportData || (res as any)?.data || [];
        }

        return data;
    };

    const prepareExportData = async (data: any[]) => {
        // Map directly to summary fields, no need for nested loops or address enrichment
        return data.map((vehicle: any) => ({
            "Vehicle Number": deviceMap[String(vehicle.uniqueId)] || vehicle.name || vehicle.uniqueId,
            "Total Distance (KM)": vehicle.totalDistance?.toFixed(2) ?? "0",
            "Total Stop Time": vehicle.totalStopTime || "0D, 0H, 0M, 0S"
        }));
    };

    const handleExport = async (type: "pdf" | "excel") => {
        if (!apiFilters.uniqueIds.length || !apiFilters.from || !apiFilters.to) {
            toast.error("Please generate the report first.");
            return;
        }

        try {
            setIsDownloading(true);
            updateProgress(10, "Fetching all report records...");

            const rawData = await fetchReportForExport();
            if (!rawData || rawData.length === 0) {
                toast.error("No data to export.");
                setIsDownloading(false);
                return;
            }

            updateProgress(40, "Preparing report...");
            const preparedData = await prepareExportData(rawData);


            updateProgress(80, `Generating ${type.toUpperCase()} file...`);

            const columns = [
                { key: "Vehicle Number", header: "Vehicle Number" },
                { key: "Total Distance (KM)", header: "Total Distance (KM)" },
                { key: "Total Stop Time", header: "Total Stop Time" },
            ];

            if (type === "pdf") {
                await exportToPDF(preparedData, columns, { title: "Stoppage Summary Report" });
            } else {
                exportToExcel(preparedData, columns, { title: "Stoppage Summary Report" });
            }

            updateProgress(100, "Download complete!");

        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Failed to export report.");
        } finally {
            setTimeout(() => {
                setIsDownloading(false);
                setDownloadProgress(0);
                setDownloadLabel("");
            }, 1000);
        }
    }


    const { tableElement } = CustomTableServerSidePagination({
        data: expandedDataArray(),
        columns,
        pagination,
        totalCount: totalRecords,
        loading: isFetching,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        sorting,
        columnVisibility,
        onColumnVisibilityChange: setColumnVisibility,
        emptyMessage: isFetching ? "Loading report data..." : "No data available. Generate a report to see details.",
        pageSizeOptions: [20, 30, 40, 50],
        enableSorting: false,
        showSerialNumber: false, // Disable default SN, use custom column
        enableVirtualization: false,
        estimatedRowHeight: 50,
        overscan: 5,
        maxHeight: "calc(100vh - 400px)", // Adjusted to ensure pagination is visible
    });

    return (
        <div className="p-4 flex flex-col h-[calc(100vh-10px)] pb-2">
            <ResponseLoader isLoading={isFetching} />

            <DownloadProgress
                open={isDownloading}
                progress={downloadProgress}
                label={downloadLabel}
            />

            <ReportFilter
                onSubmit={(filters) => {
                    const ids = Array.isArray(filters.deviceId) ? filters.deviceId : filters.deviceId ? [filters.deviceId] : [];
                    if (!ids.length || !filters.from || !filters.to) {
                        alert("Please select vehicle and dates");
                        return;
                    }
                    setApiFilters({
                        uniqueIds: ids.map(Number),
                        from: filters.from,
                        to: filters.to
                    });
                    setHasGenerated(true);
                    setExpandedRows(new Set());
                    setExpandedDays(new Set()); // Reset Level 2
                    setPagination({ pageIndex: 0, pageSize: 20 });
                }}
                className="mb-4 flex-shrink-0"
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
                    arrayFormat: "array",
                    showExport: true,
                    exportOptions: ["excel", "pdf"],
                }}
                onExportClick={handleExport}
            />

            {hasGenerated && (
                <div>
                    {tableElement}
                </div>
            )}
        </div>
    );
};

export default StopSummaryReportPage;