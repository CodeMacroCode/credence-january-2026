"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { deviceApiService } from "@/services/api/deviceApiService";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { useAuthStore } from "@/store/authStore";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { AlertCircle, CalendarClock, RefreshCcw, Search, Loader2 } from "lucide-react";
import { PaginationState } from "@tanstack/react-table";
import ResponseLoader from "@/components/ResponseLoader";
import { getRenewalColumns } from "@/components/columns/columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExpirationDatePicker } from "@/components/ui/ExpirationDatePicker";

export default function RenewalClient() {
    // State
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    });
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"expired" | "expiringSoon">("expired");
    const [filters, setFilters] = useState({
        schoolId: undefined as string | undefined,
        branchId: undefined as string | undefined,
    });
    const [sorting, setSorting] = useState([]);

    // Manual Renewal State
    const [selectedDevice, setSelectedDevice] = useState<any>(null);
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [renewalDate, setRenewalDate] = useState("2026-12-31T23:59:59.000Z");
    const [renewalPassword, setRenewalPassword] = useState("");
    const [isRenewing, setIsRenewing] = useState(false);

    // Payment State
    const [selectedPaymentDevice, setSelectedPaymentDevice] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentYears, setPaymentYears] = useState("1");
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Hooks
    const { decodedToken: user } = useAuthStore();
    const userRole = user?.role?.toLowerCase();

    const { data: schoolData, isLoading: isSchoolLoading } = useSchoolDropdown(
        userRole === "superadmin"
    );

    const { data: branchData, isLoading: isBranchLoading } = useBranchDropdown(
        filters.schoolId,
        userRole === "superadmin" || userRole === "school",
        userRole === "school"
    );

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch Data
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["expiredDevices", pagination.pageIndex, pagination.pageSize, debouncedSearch, filters.schoolId, filters.branchId],
        queryFn: () => deviceApiService.getExpiredDevices({
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch,
            schoolId: filters.schoolId,
            branchId: filters.branchId,
        }),
    });

    // Derived Data
    const tableData = useMemo(() => {
        if (!data) return [];
        return activeTab === "expired" ? data.expired : data.expiringSoon;
    }, [data, activeTab]);

    const totalCount = useMemo(() => {
        if (!data) return 0;
        return activeTab === "expired" ? data.expiredTotal : data.expiringSoonTotal;
    }, [data, activeTab]);

    const handleManualRenewal = (device: any) => {
        setSelectedDevice(device);
        setRenewalDate("2026-12-31T23:59:59.000Z");
        setRenewalPassword("");
        setIsRenewalModalOpen(true);
    };

    // Payment Handlers
    const handlePayNow = (device: any) => {
        setSelectedPaymentDevice(device);
        setPaymentYears("1");
        setIsPaymentModalOpen(true);
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (typeof window !== "undefined" && (window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const submitPayment = async () => {
        if (!selectedPaymentDevice || !paymentYears) {
            toast.error("Please select subscription duration.");
            return;
        }

        try {
            setIsProcessingPayment(true);

            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error("Razorpay SDK failed to load");
                return;
            }

            const orderResponse = await deviceApiService.createSubscriptionOrder({
                uniqueId: selectedPaymentDevice.uniqueId,
                years: parseInt(paymentYears)
            });

            console.log("orderResponse", orderResponse);

            if (!orderResponse) {
                throw new Error("Invalid order response");
            }

            const options = {
                key: orderResponse.keyId,
                amount: orderResponse.amount,
                currency: orderResponse.currency,
                name: "Credence Tracker",
                description: `Subscription Renewal for ${selectedPaymentDevice.name}`,
                order_id: orderResponse.orderId,
                handler: function (response: any) {
                    toast.success("Payment successful!");
                    setIsPaymentModalOpen(false);
                    refetch();
                },
                prefill: {
                    name: (user as any)?.name || "",
                },
                theme: {
                    color: "#3399cc",
                },
            };

            const rzp1 = new (window as any).Razorpay(options);
            rzp1.on("payment.failed", function (response: any) {
                toast.error("Payment failed: " + response.error.description);
            });
            rzp1.open();

        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message || "Failed to initiate payment");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Columns
    const columns = useMemo(() => getRenewalColumns(activeTab, userRole, handleManualRenewal, handlePayNow), [activeTab, userRole]);

    // Handlers
    const submitManualRenewal = async () => {
        if (!selectedDevice || !renewalPassword || !renewalDate) {
            toast.error("Please provide expiration date and password.");
            return;
        }
        try {
            setIsRenewing(true);
            const payload = {
                expirationdate: renewalDate,
                password: renewalPassword
            };
            await deviceApiService.updateExpirationDate(selectedDevice.uniqueId, payload);
            toast.success("Expiration date updated successfully.");
            setIsRenewalModalOpen(false);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to update expiration date");
        } finally {
            setIsRenewing(false);
        }
    };

    const handlePaginationChange = (updater: any) => {
        setPagination(prev => {
            const newValues = typeof updater === "function" ? updater(prev) : updater;
            return newValues;
        });
    };

    const handleRefresh = () => {
        refetch();
    };

    const { table, tableElement } = CustomTableServerSidePagination({
        data: tableData,
        columns,
        pagination,
        totalCount,
        loading: isLoading,
        onPaginationChange: handlePaginationChange,
        onSortingChange: setSorting,
        sorting,
        emptyMessage: "No devices found",
        pageSizeOptions: [10, 20, 30, 50, 100, "All"],
        showSerialNumber: true,
        enableSorting: true,
        enableMultiSelect: false,
        // Enable virtualization
        enableVirtualization: true,
        estimatedRowHeight: 50,
        overscan: 5,
        maxHeight: "calc(100vh - 430px)",
    });

    return (
        <div className="h-full flex flex-col space-y-4 p-4 bg-gray-50/50 overflow-hidden">
            <ResponseLoader isLoading={isLoading} />

            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Renewal Management</h1>
                    <p className="text-muted-foreground text-sm">Manage expired and upcoming vehicle renewals</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters & Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by vehicle name or IMEI..."
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Button className="flex items-center gap-2 cursor-pointer" onClick={() => {
                            setActiveTab("expired");
                            setPagination((p: PaginationState) => ({ ...p, pageIndex: 0 }));
                        }}>Expired {data?.expiredTotal || 0}</Button>
                        <Button className="flex items-center gap-2 cursor-pointer" onClick={() => {
                            setActiveTab("expiringSoon");
                            setPagination((p: PaginationState) => ({ ...p, pageIndex: 0 }));
                        }}>Expiring Soon {data?.expiringSoonTotal || 0}</Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                        {/* School Filter (Superadmin only) */}
                        {userRole === "superadmin" && (
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
                                    setFilters(prev => ({
                                        ...prev,
                                        schoolId: value === "all" ? undefined : value,
                                        branchId: undefined,
                                    }))
                                }
                                placeholder="Select Admin"
                                searchPlaceholder="Search admin..."
                                emptyMessage="No admin found."
                            />
                        )}

                        {/* Branch Filter */}
                        {(userRole === "superadmin" || userRole === "school") && (
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
                                    setFilters(prev => ({
                                        ...prev,
                                        branchId: value === "all" ? undefined : value,
                                    }))
                                }
                                placeholder="Select User"
                                searchPlaceholder="Search user..."
                                emptyMessage="No user found."
                                disabled={!filters.schoolId && userRole === "superadmin"}
                            />
                        )}

                        <ColumnVisibilitySelector
                            columns={table.getAllColumns()}
                        />
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        {activeTab === "expired" ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                            <CalendarClock className="h-5 w-5 text-amber-600" />
                        )}
                        <h2 className="font-semibold text-gray-800">
                            {activeTab === "expired" ? "Expired Vehicles List" : "Vehicles Expiring Soon"}
                        </h2>
                    </div>
                    <span className="text-sm text-gray-500">
                        Page {pagination.pageIndex + 1} of {Math.ceil(totalCount / pagination.pageSize)}
                    </span>
                </div>

                <div className="flex-1 min-h-0">
                    {tableElement}
                </div>
            </div>

            {/* Manual Renewal Modal */}
            <Dialog open={isRenewalModalOpen} onOpenChange={setIsRenewalModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Manual Renewal</DialogTitle>
                        <DialogDescription>
                            Renew subscription for {selectedDevice?.name || "Device"} ({selectedDevice?.uniqueId})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Expiration Date</Label>
                            <ExpirationDatePicker
                                date={renewalDate ? new Date(renewalDate) : undefined}
                                onDateChange={(date) => {
                                    if (date) {
                                        const yyyy = date.getFullYear();
                                        const mm = String(date.getMonth() + 1).padStart(2, "0");
                                        const dd = String(date.getDate()).padStart(2, "0");
                                        setRenewalDate(`${yyyy}-${mm}-${dd}T23:59:59.000Z`);
                                    } else {
                                        setRenewalDate("");
                                    }
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">SuperAdmin Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={renewalPassword}
                                onChange={(e) => setRenewalPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsRenewalModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={submitManualRenewal} disabled={isRenewing}>
                            {isRenewing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Confirm Renewal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Subscription Renewal</DialogTitle>
                        <DialogDescription>
                            Select subscription duration for {selectedPaymentDevice?.name || "Device"} ({selectedPaymentDevice?.uniqueId})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid gap-2 items-start justify-start w-full relative z-50 overflow-visible">
                            <Label htmlFor="years" className="mb-1">Duration (Years)</Label>
                            <Combobox
                                className="w-full"
                                items={[
                                    { label: "1 Year", value: "1" },
                                    { label: "2 Years", value: "2" },
                                    { label: "3 Years", value: "3" },
                                    { label: "4 Years", value: "4" },
                                    { label: "5 Years", value: "5" },
                                ]}
                                value={paymentYears}
                                onValueChange={(value) => {
                                    if (value && value !== "all") {
                                        setPaymentYears(value);
                                    }
                                }}
                                placeholder="Select duration"
                                searchPlaceholder="Search duration..."
                                emptyMessage="No options found."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={submitPayment} disabled={isProcessingPayment}>
                            {isProcessingPayment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Proceed to Pay"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
