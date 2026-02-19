"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function LogoutLoader() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-lg px-8 py-4 flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                <Loader2 className="h-6 w-6 animate-spin text-black" />
                <span className="text-sm font-medium text-gray-900">Loading...</span>
            </div>
        </div>,
        document.body
    );
}
