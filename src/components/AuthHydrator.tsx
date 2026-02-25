"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";

export function AuthHydrator() {
    const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const logout = useAuthStore((s) => s.logout);

    useEffect(() => {
        hydrateAuth();
    }, [hydrateAuth]);

    // Active status polling every 1 hour
    useEffect(() => {
        if (!isAuthenticated) return;

        const checkActiveStatus = async () => {
            try {
                const res = await api.get("/auth/user/active-status", {
                    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
                });
                if (res.data && res.data.active === false) {
                    logout();
                }
            } catch (error) {
                console.error("Failed to check active status:", error);
            }
        };

        const interval = setInterval(checkActiveStatus, 3600000); // 1 hour

        return () => clearInterval(interval);
    }, [isAuthenticated, logout]);

    return null;
}
