"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { deviceApiService } from "@/services/api/deviceApiService";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { useAuthStore } from "@/store/authStore";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { AlertCircle, CalendarClock, RefreshCcw, Search, Loader2, CheckSquare, QrCode, Building2, Hash, CreditCard, Landmark, MapPin, Cpu } from "lucide-react";
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
    const [selectedUniqueIds, setSelectedUniqueIds] = useState<string[]>([]);
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [renewalDate, setRenewalDate] = useState("2026-12-31T23:59:59.000Z");
    const [renewalPassword, setRenewalPassword] = useState("");
    const [isRenewing, setIsRenewing] = useState(false);

    // Payment State
    const [selectedPaymentDevice, setSelectedPaymentDevice] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentYears, setPaymentYears] = useState("1");
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [isFetchingQR, setIsFetchingQR] = useState(false);
    const [activePaymentMethod, setActivePaymentMethod] = useState<"qr" | "bank">("qr");

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
        setSelectedUniqueIds([device.uniqueId]);
        setRenewalDate("2026-12-31T23:59:59.000Z");
        setRenewalPassword("");
        setIsRenewalModalOpen(true);
    };

    // Payment Handlers
    const handlePayNow = async (device: any) => {
        setSelectedPaymentDevice(device);
        try {
            setIsFetchingQR(true);
            const data = await deviceApiService.getQRCode();
            setQrCodeUrl(data.filePath);
            setIsQRModalOpen(true);
        } catch (error: any) {
            toast.error("Failed to fetch payment QR code");
        } finally {
            setIsFetchingQR(false);
        }
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
        if (!selectedUniqueIds.length || !renewalPassword || !renewalDate) {
            toast.error("Please provide expiration date and password.");
            return;
        }
        try {
            setIsRenewing(true);
            const payload = {
                expirationdate: renewalDate,
                password: renewalPassword
            };
            await deviceApiService.updateExpirationDate(selectedUniqueIds, payload);
            toast.success(`Expiration date updated successfully for ${selectedUniqueIds.length} device(s).`);
            setIsRenewalModalOpen(false);
            setSelectedUniqueIds([]);
            table.resetRowSelection();
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

    const { table, selectedRows, tableElement } = CustomTableServerSidePagination({
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
        enableMultiSelect: true,
        getRowId: (row: any) => row.uniqueId,
        // Enable virtualization
        enableVirtualization: true,
        estimatedRowHeight: 50,
        overscan: 5,
        maxHeight: "calc(100vh - 430px)",
    });

    const handleBulkManualRenewal = () => {
        if (selectedRows.length === 0) return;
        setSelectedUniqueIds(selectedRows as string[]);
        setRenewalDate("2026-12-31T23:59:59.000Z");
        setRenewalPassword("");
        setIsRenewalModalOpen(true);
    };

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
                    <div className="flex items-center gap-3">
                        {userRole === "superadmin" && (
                            <Button
                                variant="default"
                                size="sm"
                                className="text-white cursor-pointer"
                                onClick={handleBulkManualRenewal}
                                disabled={selectedRows.length === 0}
                            >
                                Manual Renewal ({selectedRows.length})
                            </Button>
                        )}
                        <span className="text-sm text-gray-500">
                            Page {pagination.pageIndex + 1} of {Math.ceil(totalCount / pagination.pageSize)}
                        </span>
                    </div>
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
                            {selectedUniqueIds.length === 1
                                ? `Renew subscription for device (${selectedUniqueIds[0]})`
                                : `Renew subscription for ${selectedUniqueIds.length} selected devices`
                            }
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

            {/* QR Payment Modal */}
            <Dialog open={isQRModalOpen} onOpenChange={(open) => {
                setIsQRModalOpen(open);
                if (!open) {
                    setQrCodeUrl(null);
                }
            }}>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <QrCode className="h-5 w-5 text-blue-600" />
                            </div>
                            Scan and Pay
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 mt-2">
                            Use any UPI app to scan and pay
                        </DialogDescription>
                    </DialogHeader>

                    <motion.div 
                        layout 
                        className="px-6 py-8 relative flex flex-col items-center overflow-hidden"
                        transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
                    >
                        {/* Shuffling Payment Methods */}
                        <div className="relative w-full">
                            <AnimatePresence mode="popLayout">
                                {activePaymentMethod === "qr" ? (
                                    <motion.div
                                        key="qr-section"
                                        initial={{ x: 50, opacity: 0, scale: 0.9, rotate: -2 }}
                                        animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ x: -100, opacity: 0, scale: 0.8, rotate: 5 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        className="w-full z-20"
                                    >
                                        <div className="relative group">
                                            <div className="absolute -inset-1.5 bg-linear-to-r from-blue-500/10 to-indigo-500/10 rounded-[28px] blur-md opacity-75"></div>
                                            <div className="relative flex flex-col items-center justify-center p-8 bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-blue-900/5">
                                                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-blue-100 rounded-tl-lg"></div>
                                                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-blue-100 rounded-tr-lg"></div>
                                                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-blue-100 rounded-bl-lg"></div>
                                                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-blue-100 rounded-br-lg"></div>

                                                {qrCodeUrl ? (
                                                    <div className="relative w-52 h-52 bg-white p-3 rounded-2xl ring-1 ring-slate-100/50 shadow-inner overflow-hidden">
                                                        <img
                                                            src={qrCodeUrl}
                                                            alt="Payment QR Code"
                                                            className="w-full h-full object-contain relative z-10"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                                                        <div className="relative h-16 w-16">
                                                            <div className="absolute inset-0 rounded-full border-4 border-slate-50"></div>
                                                            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
                                                            <QrCode className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-slate-200" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-400 animate-pulse">Initializing Gateway...</p>
                                                    </div>
                                                )}

                                                <div className="mt-6 flex flex-col items-center gap-3">
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100 shadow-sm">
                                                        <div className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                        </div>
                                                        <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest">Active QR</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="bank-section"
                                        initial={{ x: 50, opacity: 0, scale: 0.9, rotate: 2 }}
                                        animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ x: -100, opacity: 0, scale: 0.8, rotate: -5 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        className="w-full z-20"
                                    >
                                        <div className="relative group perspective-1000">
                                            <div className="absolute -inset-0.5 bg-linear-to-r from-slate-200 to-slate-100 rounded-[24px] blur-sm opacity-50"></div>
                                            <div className="relative w-full aspect-[1.586/1] min-h-[220px] bg-linear-to-br from-[#0a1d4d] via-[#1e3a8a] to-[#0a1d4d] rounded-[22px] p-6 shadow-2xl overflow-hidden flex flex-col justify-between text-white border border-white/10">
                                                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_100%)]"></div>
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                                <div className="flex justify-between items-start relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                                                            <Landmark className="h-5 w-5 text-blue-200" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-blue-200/60 leading-none mb-1">Bank Name</p>
                                                            <p className="text-xs font-bold tracking-wide">Kotak Mahindra Bank</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-8 bg-linear-to-br from-amber-200 via-amber-400 to-amber-200 rounded-md shadow-inner flex items-center justify-center overflow-hidden">
                                                        <Cpu className="h-5 w-5 text-amber-900/50" />
                                                    </div>
                                                </div>
                                                <div className="relative z-10 my-2">
                                                    <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-blue-200/60 mb-1">Account Number</p>
                                                    <p className="text-lg font-mono tracking-[0.15em] font-bold drop-shadow-md">8050 8275 85</p>
                                                </div>
                                                <div className="flex justify-between items-end relative z-10">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] uppercase font-bold tracking-[0.15em] text-blue-200/60 leading-none">Account Holder</p>
                                                        <p className="text-[11px] font-semibold tracking-wide uppercase opacity-90">STEALTH TRACK SOLUTIONS PVT LTD</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] uppercase font-bold tracking-[0.15em] text-blue-200/60 leading-none">IFSC Code</p>
                                                        <p className="text-[11px] font-mono font-bold tracking-wider">KKBK0001839</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Method Selector / Apple-style Liquid Glass Toggle */}
                        <div className="mt-12 flex justify-center w-full">
                            <div className="relative flex p-1.5 bg-slate-200/50 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-inner max-w-xs w-full overflow-hidden">
                                {/* Liquid Glass Slider */}
                                <motion.div
                                    layoutId="liquid-glass-indicator"
                                    className={`absolute inset-y-1.5 rounded-xl shadow-lg ring-1 ring-white/20 z-0 ${
                                        activePaymentMethod === "qr" 
                                        ? "bg-white left-[6px] w-[calc(50%-6px)] shadow-blue-500/10" 
                                        : "bg-[#0a1d4d] right-[6px] w-[calc(50%-6px)] shadow-[#0a1d4d]/20"
                                    }`}
                                    transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.2 }}
                                />

                                <button
                                    onClick={() => setActivePaymentMethod("qr")}
                                    className={`relative flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-500 z-10 ${
                                        activePaymentMethod === "qr" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <QrCode className="h-4 w-4" />
                                    UPI QR
                                </button>
                                <button
                                    onClick={() => setActivePaymentMethod("bank")}
                                    className={`relative flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-500 z-10 ${
                                        activePaymentMethod === "bank" ? "text-white" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <Landmark className="h-4 w-4" />
                                    Bank Info
                                </button>
                            </div>
                        </div>
                        
                        <p className="mt-6 text-[11px] text-slate-400 font-medium italic text-center">Click a method above to switch payment mode</p>
                    </motion.div>

                    <DialogFooter className="p-6 pt-0">
                        <Button 
                            type="button" 
                            className="w-full h-11 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98] cursor-pointer" 
                            onClick={() => setIsQRModalOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Modal (Keep for Razorpay if needed elsewhere, but Pay Now now uses QR) */}
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
