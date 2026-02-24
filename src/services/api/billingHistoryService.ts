import api from "@/lib/axios";

export interface BillingHistoryItem extends Record<string, unknown> {
    _id: string;
    deviceId: {
        name: string;
        model: string;
        schoolId: {
            schoolName: string;
            assignedCompany: string;
        };
        branchId: {
            branchName: string;
        };
    };
    baseAmount: number;
    gstAmount: number;
    gstRate: number;
    amount: number;
    currency: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    status: string;
    previousExpirationDate: string;
    newExpirationDate: string;
    createdAt: string;
}

export interface BillingHistoryResponse {
    success: boolean;
    data: BillingHistoryItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const billingHistoryService = {
    getHistory: async (page: number, limit: number): Promise<BillingHistoryResponse> => {
        const res = await api.get("/subscription/history", {
            params: {
                page,
                limit
            }
        });
        return res.data;
    }
};
