"use client";

import { useState } from "react";
import { useBillingHistory } from "@/hooks/useBillingHistory";
import { getBillingHistoryColumns } from "./columns";
import { CustomTableServerSidePagination, PaginationState } from "@/components/ui/customTable(serverSidePagination)";
import { Input } from "@/components/ui/input";
import { FiSearch } from "react-icons/fi";
import InvoiceDetails from "./InvoiceDetails";
import { BillingHistoryItem } from "@/services/api/billingHistoryService";

export default function BillingClient() {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    });

    const [selectedInvoice, setSelectedInvoice] = useState<BillingHistoryItem | null>(null);

    // Convert 0-indexed pageIndex from tanstack table to 1-indexed page for our API
    const { data, pagination: apiPagination, isLoading } = useBillingHistory(
        pagination.pageIndex + 1,
        pagination.pageSize
    );

    const columns = getBillingHistoryColumns();

    const { tableElement } = CustomTableServerSidePagination({
        data: data || [],
        columns: columns,
        pagination: pagination,
        totalCount: apiPagination?.total || 0,
        loading: isLoading,
        onPaginationChange: setPagination,
        showSerialNumber: false,
        enableMultiSelect: true,
        emptyMessage: isLoading ? "Loading invoices..." : "No invoices found for the current search.",
        pageSizeOptions: [10, 20, 50, 100],
        maxHeight: "calc(100vh - 200px)",
        onRowClick: (row: any) => {
            console.log("Row Clicked:", row);
            setSelectedInvoice(row);
        }
    });

    console.log("Current Selected Invoice State:", selectedInvoice);

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto flex flex-col xl:flex-row gap-6">
            <div className="flex-1 space-y-6 min-w-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices</h1>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoices"
                                className="w-full pl-9 bg-gray-50 border-gray-200 h-9 rounded-md"
                            />
                        </div>
                    </div>
                </div>
                <div className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white w-full">
                    {tableElement}
                </div>
            </div>

            {selectedInvoice && (
                <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-6 h-[calc(100vh-100px)] animate-in slide-in-from-right-8 fade-in duration-300">
                    <InvoiceDetails invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
                </div>
            )}
        </div>
    );
}
