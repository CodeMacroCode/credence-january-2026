"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ReportFilter,
  FilterValues,
} from "@/components/report-filters/Report-Filter";
import {
  type VisibilityState,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import ResponseLoader from "@/components/ResponseLoader";
import { useReport } from "@/hooks/reports/useReport";
import {
  GetGeofenceSummaryColumns,
  GetGeofenceDetailColumns,
} from "@/components/columns/columns";
import { useQueryClient } from "@tanstack/react-query";
import {
  GeofenceGroup,
  GeofenceExpandedRow,
  GeofenceEventFlat,
} from "@/interface/modal";
import { TravelTable } from "@/components/travel-summary/TravelTable";

const GeofenceAlertsReportPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter state for API
  const [apiFilters, setApiFilters] = useState<Record<string, any>>({
    schoolId: undefined,
    branchId: undefined,
    uniqueId: undefined,
    from: undefined,
    to: undefined,
  });

  // Device mapping state
  const [cashedDeviceId, setCashedDeviceId] = useState<
    { _id: string; name: string; uniqueId: string }[] | null
  >(null);

  // Fetch report data using the hook
  const {
    geofenceAlertsReport,
    totalGeofenceAlertsReport,
    isFetchingGeofenceAlertsReport,
  } = useReport(pagination, apiFilters, sorting, "geofence-alerts", hasGenerated);

  // Populate device mapping from cache
  useEffect(() => {
    if (hasGenerated) {
      const cachedDevices = queryClient.getQueryData<any>(
        ["device-dropdown-uniqueId", apiFilters.branchId]
      );
      setCashedDeviceId(cachedDevices?.data?.data || cachedDevices || null);
    }
  }, [geofenceAlertsReport, hasGenerated, queryClient, apiFilters.branchId]);

  // Group events by uniqueId and map vehicle names
  const groupedGeofenceReport = useMemo((): GeofenceGroup[] => {
    if (!geofenceAlertsReport) return [];

    const groups: Record<string, GeofenceGroup> = {};

    geofenceAlertsReport.forEach((item: GeofenceEventFlat) => {
      if (!groups[item.uniqueId]) {
        const matchedDevice = cashedDeviceId?.find(
          (device) => String(device.uniqueId) === String(item.uniqueId)
        );

        groups[item.uniqueId] = {
          id: `group-${item.uniqueId}`,
          uniqueId: item.uniqueId,
          vehicleName: matchedDevice?.name || item.uniqueId || "-",
          eventCount: 0,
          events: [],
        };
      }
      groups[item.uniqueId].events.push(item);
      groups[item.uniqueId].eventCount++;
    });

    return Object.values(groups).map((group, index) => ({
      ...group,
      sn: pagination.pageIndex * pagination.pageSize + index + 1,
    }));
  }, [geofenceAlertsReport, cashedDeviceId, pagination.pageIndex, pagination.pageSize]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  // Create expanded data array for the main table
  const expandedTableData = useMemo((): GeofenceExpandedRow[] => {
    const result: GeofenceExpandedRow[] = [];
    groupedGeofenceReport.forEach((group) => {
      result.push(group);
      if (expandedRows.has(group.id)) {
        result.push({
          id: `${group.id}-details`,
          isDetailTable: true,
          detailData: group.events,
          name: group.vehicleName,
          vehicleName: group.vehicleName,
          uniqueId: group.uniqueId,
        });
      }
    });
    return result;
  }, [groupedGeofenceReport, expandedRows]);

  // Handle filter submission
  const handleFilterSubmit = useCallback((filters: FilterValues) => {
    console.log("✅ Filter submitted:", filters);

    if (!filters.deviceId || !filters.from || !filters.to) {
      alert("Please select a vehicle and date range");
      return;
    }

    setPagination({ pageIndex: 0, pageSize: 10 });
    setSorting([]);
    setExpandedRows(new Set());

    setApiFilters({
      schoolId: filters.schoolId,
      branchId: filters.branchId,
      uniqueId: filters.deviceId,
      from: filters.from,
      to: filters.to,
      period: "Custom",
    });

    setHasGenerated(true);
    setShowTable(true);
  }, []);

  const summaryColumns = GetGeofenceSummaryColumns(expandedRows, toggleRowExpansion);
  const detailColumns = GetGeofenceDetailColumns();

  // Custom cell renderer for the main table to handle nested tables
  const mainColumns = useMemo(() => {
    return summaryColumns.map((col: ColumnDef<GeofenceExpandedRow>) => {
      if ("accessorKey" in col && col.accessorKey === "vehicleName") {
        return {
          ...col,
          cell: ({ row }: { row: { original: GeofenceExpandedRow } }) => {
            const data = row.original;

            if ("isDetailTable" in data && data.isDetailTable) {
              return (
                <div className="col-span-full w-full">
                  <div className="w-full bg-gray-50 rounded p-4 my-2">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">
                      Geofence Events for {data.vehicleName}
                    </h3>
                    <TravelTable
                      data={data.detailData}
                      columns={detailColumns}
                      totalCount={data.detailData.length}
                      emptyMessage="No events found for this device"
                      showSerialNumber={true}
                      maxHeight="400px"
                    />
                  </div>
                </div>
              );
            }

            return "vehicleName" in data ? data.vehicleName : null;
          },
        };
      }
      return col;
    });
  }, [summaryColumns, detailColumns]);

  // Table configuration
  const { table, tableElement } = CustomTableServerSidePagination({
    data: expandedTableData,
    columns: mainColumns,
    pagination,
    totalCount: totalGeofenceAlertsReport,
    loading: isFetchingGeofenceAlertsReport,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: isFetchingGeofenceAlertsReport
      ? "Loading report data..."
      : "No data available for the selected filters",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: false, // SN is handled in summary columns
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "600px",
  });

  return (
    <div className="p-6">
      <ResponseLoader isLoading={isFetchingGeofenceAlertsReport} />

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
          submitButtonText: "Generate",
          dateRangeTitle: "Select Date Range",
          dateRangeMaxDays: 90,
          cardTitle: "Geofence Report",
          arrayFormat: "comma",
          arraySeparator: ",",
          multiSelectDevice: true,
          showBadges: true,
          maxBadges: 2,
        }}
      />

      {showTable && <section className="mb-4">{tableElement}</section>}
    </div>
  );
};

export default GeofenceAlertsReportPage;
