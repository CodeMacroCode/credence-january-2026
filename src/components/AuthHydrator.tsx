"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

export function AuthHydrator() {
    const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const logout = useAuthStore((s) => s.logout);
    const [showExpiredPopup, setShowExpiredPopup] = useState(false);

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
                    setShowExpiredPopup(true);
                }
            } catch (error) {
                console.error("Failed to check active status:", error);
            }
        };

        const interval = setInterval(checkActiveStatus, 3600000); // 1 hour

        return () => clearInterval(interval);
    }, [isAuthenticated, logout]);

    return (
        <>
            {showExpiredPopup && (
                <AlertDialog open={showExpiredPopup}>
                    <AlertDialogContent className="border-red-600 bg-red-50 dark:bg-red-950">
                        <AlertDialogHeader>
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
                            </div>
                            <AlertDialogTitle className="text-center text-xl font-bold text-red-700 dark:text-red-400">
                                Subscription Expired
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-base text-red-600 dark:text-red-300">
                                Your subscription has expired. Please contact support or renew to continue using the platform.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4 sm:justify-center">
                            <AlertDialogAction
                                onClick={() => {
                                    logout();
                                    window.location.href = "/login";
                                }}
                                className="min-w-[120px] bg-red-600 text-white hover:bg-red-700"
                            >
                                Okay
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
