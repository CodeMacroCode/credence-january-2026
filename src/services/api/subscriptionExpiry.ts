import api from "@/lib/axios";

export const subscriptionExpiryService = {
    getSubscriptionExpiry: async (pageParam = 1) => {
        const res = await api.get(`/branch/device/expired-counts?page=${pageParam}`);
        return res.data;
    },
};