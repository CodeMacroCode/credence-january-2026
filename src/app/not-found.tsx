"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NotFound() {
    const router = useRouter();
    const [redirecting, setRedirecting] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const currentPath = window.location.pathname;

            // Check if user accidentally hit the pure path-based shared link token
            if (currentPath.startsWith("/shared/live-track/token/")) {
                const token = currentPath.split("/shared/live-track/token/")[1];
                if (token) {
                    router.replace(`/shared/live-track/token#${token}`);
                    return;
                }
            }

            setRedirecting(false);
        }
    }, [router]);

    if (redirecting) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-800">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <h2 className="text-lg font-medium text-gray-700">Loading tracking link...</h2>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center border border-gray-100">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                    404
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                <p className="text-gray-600 mb-6">
                    The page you are looking for does not exist or has been moved.
                </p>
                <button
                    onClick={() => router.replace("/")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
