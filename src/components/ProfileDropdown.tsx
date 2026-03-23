"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Bell, CreditCard, User, SubscriptIcon, Repeat1Icon, KeyRound, QrCode, ChevronDown } from "lucide-react";
import { LogoutButton } from "./logout-button";
import Link from "next/link";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import {
  getStoredPreferences,
  setStoredPreference,
  NOTIFICATION_TYPES,
  NotificationType,
  isNotificationEnabled,
} from "@/util/notificationPrefs";

export function ProfileDropdown() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const decodedToken = token ? getDecodedToken(token) : null;
  const username = decodedToken?.username || "User"; // Default username if not defined

  const [blockedTypes, setBlockedTypes] = React.useState<NotificationType[]>(
    []
  );

  React.useEffect(() => {
    // Load initial preferences
    setBlockedTypes(getStoredPreferences());
  }, []);

  const handlePreferenceChange = async (
    type: NotificationType,
    enabled: boolean
  ) => {
    const newBlockedList = await setStoredPreference(type, enabled);
    // Local update to reflect change immediately in UI (though the util returns the new list too)
    // Actually the util returns the new LIST of blocked types? 
    // Let's check the util implementation... 
    // Yes, setStoredPreference returns the updated list.
    setBlockedTypes(newBlockedList);
  };

  const handleRenewalClick = () => {
    router.push("/dashboard/renewal");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1.5 rounded-lg transition-all duration-200 border border-transparent hover:border-white/20">
          <Avatar className="h-8 w-8 ring-2 ring-white/10 ring-offset-2 ring-offset-primary">
            <AvatarImage
              src={`https://api.dicebear.com/9.x/initials/svg?radius=50&seed=${username}`}
              alt={username}
            />
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-none gap-0.5">
            <span className="text-white font-semibold text-sm drop-shadow-sm">
              {username}
            </span>
            <span className="text-blue-200 text-[10px] font-medium uppercase tracking-wider">
              Profile
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-blue-200 hidden md:block opacity-60" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-56"
        sideOffset={5}
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{username}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem> */}
        {/* <DropdownMenuItem> */}
        {/* <CreditCard className="mr-2 h-4 w-4" /> */}
        {/* <span>Billing</span> */}
        {/* <Link href="/dashboard/billing">Billing</Link> */}
        {/* </DropdownMenuItem> */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="p-1 min-w-[220px]">
              {NOTIFICATION_TYPES.map((type) => {
                const isEnabled = isNotificationEnabled(
                  type.value,
                  blockedTypes
                );
                return (
                  <DropdownMenuItem
                    key={type.value}
                    onSelect={(e) => {
                      e.preventDefault();
                      handlePreferenceChange(type.value, !isEnabled);
                    }}
                    className={`flex items-center gap-3 p-2.5 cursor-pointer rounded-md mb-1 last:mb-0 transition-colors
                      ${isEnabled
                        ? "bg-green-50 focus:bg-green-100"
                        : "focus:bg-gray-100"
                      }
                    `}
                  >
                    <Checkbox
                      checked={isEnabled}
                      className={`h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary`}
                    />
                    <span
                      className={`text-sm ${isEnabled
                        ? "text-gray-900 font-medium"
                        : "text-gray-600"
                        }`}
                    >
                      {type.label}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => { handleRenewalClick() }}>
          <Repeat1Icon className="mr-2 h-4 w-4" />
          <span>Renewal</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/profile/change-password"
            className="cursor-pointer flex items-center"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </Link>
        </DropdownMenuItem>
        {decodedToken?.role === "superAdmin" && (
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/profile/payment-qr"
              className="cursor-pointer flex items-center"
            >
              <QrCode className="mr-2 h-4 w-4" />
              <span>Change Payment QR</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <LogoutButton />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
