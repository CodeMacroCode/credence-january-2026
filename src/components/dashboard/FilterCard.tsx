import Image from "next/image";
import { cn } from "@/lib/utils";

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
    return (
        <div
            onClick={onClick}
            className={cn(
                `relative flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border ${borderColor} border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md min-w-[140px] flex-1 overflow-hidden`,
                isActive && `scale-105 shadow-lg ring-2 ring-offset-1 ring-primary/50`
            )}
        >

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
