"use client";

import React, { useEffect, useState } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import { getDecodedToken } from "@/lib/jwt";
import dynamic from "next/dynamic";
const SingleDeviceLiveTrack = dynamic(() => import("@/components/dashboard/LiveTrack.tsx/single-device-livetrack"), { ssr: false });
import { useSingleDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import { Loader2 } from "lucide-react";

export default function SharedLiveTrackPage() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const hashValue = window.location.hash.replace("#", "");
            if (hashValue) {
                setToken(hashValue);
            }
        }
    }, []);

    const decodedTarget = token ? getDecodedToken(token) as any : null;
    const uniqueId = decodedTarget?.uniqueId;
    const isExpired = decodedTarget?.exp ? decodedTarget.exp * 1000 < Date.now() : false;

    const store = useDeviceStore();
    const { deviceData, isConnected } = useSingleDeviceData(uniqueId?.toString());
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        if (!token || !uniqueId || isExpired) {
            setIsInitializing(false);
            return;
        }

        // Connect to WebSockets with the shared token
        store.setToken(token);
        store.connect().then(() => {
            setIsInitializing(false);
        });

        return () => {
            store.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, uniqueId, isExpired]);

    if (!token || !uniqueId || isExpired) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">!</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Tracking Link Invalid</h1>
                    <p className="text-gray-600">
                        {isExpired
                            ? "This live tracking link has expired."
                            : "This link is invalid or malformed. Please request a new tracking link."}
                    </p>
                </div>
            </div>
        );
    }

    if (isInitializing || !isConnected) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-800">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <h2 className="text-lg font-medium text-gray-700">Connecting to live vehicle tracking...</h2>
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-gray-100 flex flex-col">
            <div className="bg-white shadow-sm border-b px-6 py-3 shrink-0 flex items-center justify-between z-10">
                <h1 className="text-lg font-bold text-gray-800 hidden md:block">Shared Live Tracker</h1>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-green-700">Live</span>
                </div>
            </div>
            <div className="flex-1 w-full relative">
                <SingleDeviceLiveTrack
                    vehicle={deviceData as any}
                    autoCenter={true}
                    showTrail={true}
                    height="100%"
                />
            </div>
        </div>
    );
}
