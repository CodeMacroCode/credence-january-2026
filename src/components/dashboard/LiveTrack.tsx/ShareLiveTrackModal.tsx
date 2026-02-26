import React, { useState } from "react";
import { X, Copy, Check, Share2, Loader2 } from "lucide-react";
import { useShareDevice } from "@/hooks/livetrack/useShareDevice";

interface ShareLiveTrackModalProps {
    isOpen: boolean;
    onClose: () => void;
    uniqueId: string;
}

const DURATIONS = [
    { label: "1 Hour", value: 1 },
    { label: "2 Hours", value: 2 },
    { label: "5 Hours", value: 5 },
    { label: "1 Day", value: 24 },
    { label: "2 Days", value: 48 },
    { label: "7 Days", value: 168 },
];

export const ShareLiveTrackModal: React.FC<ShareLiveTrackModalProps> = ({
    isOpen,
    onClose,
    uniqueId,
}) => {
    const [selectedDuration, setSelectedDuration] = useState<number>(1);
    const [generatedUrl, setGeneratedUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const shareDeviceMutation = useShareDevice();

    if (!isOpen) return null;

    const handleGenerateLink = () => {
        // Server expects IST time string but ended with 'Z'.
        // e.g., 2026-02-25T18:13:30Z
        const now = new Date();
        const futureTime = new Date(now.getTime() + selectedDuration * 60 * 60 * 1000);
        // Add 5.5 hours to match IST format requested
        const istTimeForServer = new Date(futureTime.getTime() + 5.5 * 60 * 60 * 1000);
        const expiration = istTimeForServer.toISOString().replace(/\.\d{3}Z$/, "Z");

        shareDeviceMutation.mutate(
            { uniqueId: uniqueId.toString(), expiration },
            {
                onSuccess: (url) => {
                    setGeneratedUrl(url);
                    setCopied(false);
                },
                onError: (err) => {
                    console.error("Link generation failed:", err);
                },
            }
        );
    };

    const handleCopy = () => {
        if (generatedUrl) {
            navigator.clipboard.writeText(generatedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-blue-600" />
                        Share Live Tracking
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 block">
                            Link Expiration Time
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {DURATIONS.map((duration) => (
                                <button
                                    key={duration.value}
                                    onClick={() => {
                                        setSelectedDuration(duration.value);
                                        setGeneratedUrl("");
                                    }}
                                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${selectedDuration === duration.value
                                            ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                        }`}
                                >
                                    {duration.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!generatedUrl ? (
                        <button
                            onClick={handleGenerateLink}
                            disabled={shareDeviceMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {shareDeviceMutation.isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                "Generate Share Link"
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <label className="text-sm font-medium text-gray-700 block">
                                Generated Link
                            </label>
                            <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                                <input
                                    type="text"
                                    readOnly
                                    value={generatedUrl}
                                    className="w-full bg-transparent px-4 py-2.5 text-sm text-gray-600 outline-none"
                                    onClick={(e) => e.currentTarget.select()}
                                />
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center justify-center px-4 bg-white border-l border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shrink-0"
                                    title="Copy to clipboard"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Copy className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {copied && (
                                <p className="text-sm flex items-center gap-1.5 text-green-600 font-medium">
                                    <Check className="w-4 h-4" /> Link copied to clipboard!
                                </p>
                            )}
                        </div>
                    )}

                    {shareDeviceMutation.isError && (
                        <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                            There was an error generating the link. Please try again.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
