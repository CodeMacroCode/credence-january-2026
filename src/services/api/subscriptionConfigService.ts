import api from "@/lib/axios";

export interface SubscriptionConfigData {
    _id: string;
    modelName: string;
    yearlyAmount: number | string;
    noRenewalNeeded?: boolean;
    createdAt?: string;
    updatedBy?: string;
    currency?: string;
    __v?: number;
}

export const subscriptionConfigService = {
    getConfig: async (): Promise<{ success: boolean; data: SubscriptionConfigData[] }> => {
        const res = await api.get("/subscription/config");
        return res.data;
    },

    setConfig: async (payload: { modelName: string; yearlyAmount: string | number; noRenewalNeeded?: boolean }) => {
        const res = await api.put("/subscription/config", payload);
        return res.data;
    },

    deleteConfig: async (modelName: string) => {
        const res = await api.delete(`/subscription/config/${modelName}`);
        return res.data;
    }
};
