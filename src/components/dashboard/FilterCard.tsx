import Image from "next/image";
import { cn } from "@/lib/utils";

// Map Tailwind border color classes to actual RGB values
const colorMap: Record<string, string> = {
    "border-green-500": "34, 197, 94",
    "border-orange-500": "249, 115, 22",
    "border-yellow-500": "234, 179, 8",
    "border-red-500": "239, 68, 68",
    "border-gray-500": "107, 114, 128",
    "border-blue-500": "59, 130, 246",
    "border-[#deb887]": "222, 184, 135",
};

interface FilterCardProps {
    label: string;
    count: number;
    icon: string;
    borderColor: string;
    isActive: boolean;
    onClick: () => void;
    textColor?: string;
}

export function FilterCard({
    label,
    count,
    icon,
    borderColor,
    isActive,
    onClick,
}: FilterCardProps) {
    // Get the RGB value for the gradient based on borderColor
    const rgbColor = colorMap[borderColor] || "120, 220, 220";

    return (
        <div
            onClick={onClick}
            className={cn(
                `relative flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border ${borderColor} border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 min-w-[140px] flex-1 overflow-hidden`,
            )}
        >
            {/* Active gradient background effect with animation */}
            {isActive && (
                <div
                    className="absolute inset-0 pointer-events-none animate-gradient-fade"
                    style={{
                        background: `linear-gradient(to top, rgba(${rgbColor}, 0.35) 0%, rgba(${rgbColor}, 0.15) 40%, transparent 70%)`,
                    }}
                />
            )}
            <style jsx>{`
                @keyframes gradient-fade {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-gradient-fade {
                    animation: gradient-fade 0.3s ease-out forwards;
                }
            `}</style>

            {/* Content */}
            <div className="flex flex-col ml-3">
                <span className="text-gray-500 text-xs font-medium mb-1">{label}</span>
                <span className={cn("text-2xl font-bold", isActive ? "text-primary" : "text-gray-800")}>
                    {count}
                </span>
            </div>

            {/* Vehicle Image */}
            <div className="relative w-16 h-10 ml-2">
                <Image
                    src={icon}
                    alt={label}
                    fill
                    className="object-contain"
                />
            </div>
        </div>
    );
}
