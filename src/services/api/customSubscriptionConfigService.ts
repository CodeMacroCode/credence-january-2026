import api from "@/lib/axios";

export interface SchoolWithOverride {
    _id: string;
    schoolName: string;
    username: string;
}

export interface SubscriptionOverride {
    _id: string;
    modelName: string;
    customPrice: number;
}

export interface SubscriptionOverridesResponse {
    message: string;
    schoolName: string;
    username: string;
    subscriptionOverrides: SubscriptionOverride[];
}

export const customSubscriptionConfigService = {
    getSchoolsWithOverrides: async (): Promise<{ message: string; data: SchoolWithOverride[] }> => {
        // The prompt says /school/with-subscription-overrides
        const res = await api.get("/school/with-subscription-overrides");
        return res.data;
    },

    getSubscriptionOverridesBySchool: async (schoolId: string): Promise<SubscriptionOverridesResponse> => {
        // The prompt mentions /api/school/<YOUR_SCHOOL_ID>/subscription-override
        // Removing /api assuming the axios instance adds it automatically or handles it
        const res = await api.get(`/school/${schoolId}/subscription-override`);
        return res.data;
    },

    updateSubscriptionOverride: async (schoolId: string, payload: { modelName: string; customPrice: number }) => {
        const res = await api.put(`/school/${schoolId}/subscription-override`, payload);
        return res.data;
    }
};
