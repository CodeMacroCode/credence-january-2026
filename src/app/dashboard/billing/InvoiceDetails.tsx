"use client";

import { BillingHistoryItem } from "@/services/api/billingHistoryService";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface InvoiceDetailsProps {
    invoice: BillingHistoryItem;
    onClose: () => void;
}

export default function InvoiceDetails({ invoice, onClose }: InvoiceDetailsProps) {
    const shortId = invoice._id.substring(invoice._id.length - 4).toUpperCase();
    const issued = invoice.createdAt ? format(new Date(invoice.createdAt), "MMM dd, yyyy") : "-";
    const due = invoice.newExpirationDate ? format(new Date(invoice.newExpirationDate), "MMM dd, yyyy") : "-";

    // Currency formatter
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: invoice.currency || 'INR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const status = invoice.status || "UNPAID";
    let badgeClasses = "";
    if (status.toUpperCase() === "PAID") {
        badgeClasses = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
    } else if (status.toUpperCase() === "UNPAID") {
        badgeClasses = "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
    } else {
        badgeClasses = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200";
    }

    const billFromCompany = invoice.deviceId?.schoolId?.assignedCompany || "HBGadgets";
    const billToSchool = invoice.deviceId?.schoolId?.schoolName || "N/A";
    const billToBranch = invoice.deviceId?.branchId?.branchName || "";

    return (
        <div className="bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)]">
            <div className="p-5 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Invoice Details</h2>
                <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-gray-900 shadow-sm" onClick={() => alert("Download PDF functionality to be implemented")}>
                        Download
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 text-muted-foreground hover:text-gray-900">
                        ✕
                    </Button>
                </div>
            </div>

            <div className="p-6 overflow-y-auto bg-white flex-1 space-y-8">
                {/* Header Information */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            Invoice <span className="text-red-500 font-semibold">#INV-{shortId}</span>
                        </div>
                        <Badge className={`${badgeClasses} mt-2 px-3 py-0.5 text-xs font-bold capitalize rounded-full`} variant="outline">
                            {status.toLowerCase()}
                        </Badge>
                    </div>
                    <div className="text-right text-sm space-y-1 text-gray-600">
                        <div>
                            <span className="text-gray-400 mr-2">Issue Date</span>
                            <span className="font-semibold text-gray-900">{issued}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 mr-2">Due Date</span>
                            <span className="font-semibold text-gray-900">{due}</span>
                        </div>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 bg-gray-50/80 p-5 rounded-lg border border-gray-100">
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Bill From</div>
                        <div className="font-bold text-gray-900 text-base">{billFromCompany}</div>
                        <div className="text-sm text-gray-500">
                            billing@{billFromCompany.toLowerCase().replace(/\s+/g, '')}.com
                        </div>
                    </div>
                    <div className="space-y-1 text-right">
                        <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Bill To</div>
                        <div className="font-bold text-gray-900 text-base">{billToSchool}</div>
                        <div className="text-sm text-gray-500">
                            {billToBranch}
                        </div>
                    </div>
                </div>

                {/* Summary Table */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Package Summary</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/80 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Description</th>
                                    <th className="px-4 py-3 font-semibold text-right">Price</th>
                                    <th className="px-4 py-3 font-semibold text-center">Qty</th>
                                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="hover:bg-gray-50/50">
                                    <td className="px-4 py-4">
                                        <div className="font-medium text-gray-900">Subscription Renewal</div>
                                        <div className="text-gray-500 text-xs mt-0.5">Device: {invoice.deviceId?.name} ({invoice.deviceId?.model})</div>
                                    </td>
                                    <td className="px-4 py-4 text-right font-medium text-gray-600">{formatCurrency(invoice.baseAmount)}</td>
                                    <td className="px-4 py-4 text-center text-gray-600">1</td>
                                    <td className="px-4 py-4 text-right font-medium text-gray-900">{formatCurrency(invoice.baseAmount)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="bg-gray-50/50 px-4 py-4 border-t border-gray-200 space-y-2">
                            <div className="flex justify-end items-center text-sm">
                                <span className="text-gray-500 w-32 text-right mr-8">Sub Total</span>
                                <span className="font-medium text-gray-900 w-24 text-right">{formatCurrency(invoice.baseAmount)}</span>
                            </div>
                            <div className="flex justify-end items-center text-sm">
                                <span className="text-gray-500 w-32 text-right mr-8">GST ({invoice.gstRate || 0}%)</span>
                                <span className="font-medium text-gray-900 w-24 text-right">{formatCurrency(invoice.gstAmount)}</span>
                            </div>
                            <div className="flex justify-end items-center pt-3 mt-1 border-t border-gray-200">
                                <span className="font-bold text-gray-900 text-base w-32 text-right mr-8">Total</span>
                                <span className="font-bold text-gray-900 text-base w-24 text-right">{formatCurrency(invoice.amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
