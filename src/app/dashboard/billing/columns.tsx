"use client";

import { ColumnDef } from "@/components/ui/customTable(serverSidePagination)";
import { BillingHistoryItem } from "@/services/api/billingHistoryService";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MdPayment, MdOutlineCorporateFare, MdDateRange } from "react-icons/md";
import { IoReceiptOutline } from "react-icons/io5";

export const getBillingHistoryColumns = (): ColumnDef<BillingHistoryItem>[] => [
    {
        accessorKey: "_id",
        header: () => (
            <div className="flex items-center gap-1.5 font-semibold">
                <IoReceiptOutline className="h-4 w-4 text-primary" /> Invoice ID
            </div>
        ),
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const id = row.original._id;
            const shortId = id.substring(id.length - 4).toUpperCase();
            return <div className="font-semibold text-primary/80">INV-{shortId}</div>;
        },
        meta: { minWidth: 120 },
    },
    {
        id: "adminName",
        header: () => (
            <div className="flex items-center gap-1.5 font-semibold">
                Admin
            </div>
        ),
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const schoolName = row.original.deviceId?.schoolId?.schoolName || "N/A";
            return <div className="font-medium text-gray-800">{schoolName}</div>;
        },
        meta: { minWidth: 200 },
    },
    {
        id: "userName",
        header: () => (
            <div className="flex items-center gap-1.5 font-semibold">
                User
            </div>
        ),
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const userName = row.original.deviceId?.branchId?.branchName || "N/A";
            return <div className="font-medium text-gray-800">{userName}</div>;
        },
        meta: { minWidth: 200 },
    },
    {
        accessorKey: "deviceId.name",
        header: () => (
            <div className="flex items-center gap-1.5 font-semibold">
                Vehicle No.
            </div>
        ),
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const deviceName = row.original.deviceId?.name || "N/A";
            return <div className="text-gray-600 font-medium">{deviceName}</div>;
        },
        meta: { minWidth: 150 },
    },
    {
        id: "date",
        header: () => (
            <div className="flex items-center gap-1.5 font-semibold">
                <MdDateRange className="h-4 w-4 text-primary" /> Date
            </div>
        ),
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const issued = row.original.createdAt ? format(new Date(row.original.createdAt), "MMM dd, yyyy") : "-";
            const due = row.original.newExpirationDate ? format(new Date(row.original.newExpirationDate), "MMM dd, yyyy") : "-";
            return (
                <div className="flex flex-col text-sm gap-1">
                    <div className="text-gray-800">{issued} <span className="text-muted-foreground text-xs font-medium ml-1">(Issued)</span></div>
                    <div className="text-gray-800">{due} <span className="text-muted-foreground text-xs font-medium ml-1">(Due)</span></div>
                </div>
            );
        },
        meta: { minWidth: 180 },
    },
    {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const amount = row.original.amount;
            const currency = row.original.currency || "INR";
            const formatted = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
            }).format(amount);
            return <div className="font-bold">{formatted}</div>;
        },
        meta: { minWidth: 120 },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: { row: { original: BillingHistoryItem } }) => {
            const status = row.original.status || "UNPAID";

            let badgeClasses = "";

            if (status.toUpperCase() === "PAID") {
                badgeClasses = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
            } else if (status.toUpperCase() === "UNPAID") {
                badgeClasses = "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
            } else {
                badgeClasses = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200";
            }

            return (
                <Badge className={`${badgeClasses} px-3 py-0.5 text-xs font-bold capitalize rounded-full`} variant="outline">
                    {status.toLowerCase()}
                </Badge>
            );
        },
        meta: { minWidth: 100 },
    },
];
