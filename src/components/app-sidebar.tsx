"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { useNavigationStore } from "@/store/navigationStore";
import { useAccessStore } from "@/store/accessStore";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import RouteLoader from "@/components/RouteLoader";
import { useTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  FileText,
  Search,
  School,
  MapPin,
  UserCheck,
  UserX,
  FileBarChart,
  Route,
  Clock,
  TrendingUp,
  Map,
  AlertCircle,
  Settings,
  Smartphone,
  Bell,
  CheckCircle,
  XCircle,
  MessageCircle,
  Group,
} from "lucide-react";
import { GiGps } from "react-icons/gi";
import Image from "next/image";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

// Icon mapping for menu items
const iconMap: Record<string, React.ElementType> = {
  "Student Details": GraduationCap,
  Geofence: MapPin,
  "Pickup And Drop": Route,
  Routes: Route,
  Absent: UserX,
  Present: UserCheck,
  "Leave Request": FileText,
  Status: AlertCircle,
  "Approved Request": CheckCircle,
  "Denied Request": XCircle,
  "Admin Master": School,
  "User Master": School,
  "Parents Master": Users,
  "Driver Approve": UserCheck,
  "Student Approve": UserCheck,
  "Supervisor Approve": UserCheck,
  "Device": Smartphone,
  "Read Device": Smartphone,
  Devices: Smartphone,
  "Group": Group,
  Notification: Bell,
  "Status Report": FileBarChart,
  "Distance Report": Route,
  "History Report": Clock,
  "Stop Report": AlertCircle,
  "Travel Summary": TrendingUp,
  "Trip Report": Route,
  "Idle Report": Clock,
  "Alerts/Events": Bell,
  "Geofence Report": Map,
  "Route Report": Route,
  "Chat Box": MessageCircle,
  Model: GiGps,
  Category: FileText,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userRole, setUserRole] = React.useState<UserRole>(null);
  const activeSection = useNavigationStore((state) => state.activeSection);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const access = useAccessStore((state) => state.access);

  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { setOpenMobile, isMobile, state } = useSidebar();

  React.useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;

    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }

    setIsLoading(false);
  }, []);

  const getSidebarData = React.useCallback(
    (section: string, role: UserRole) => {
      switch (section) {
        case "Master":
          if (role === "superAdmin") {
            return [
              { title: "Device", url: "/dashboard/users/add-device" },
              { title: "Admin Master", url: "/dashboard/users/school-master" },
              { title: "User Master", url: "/dashboard/users/branch-master" },
              { title: "Group", url: "/dashboard/users/user-access" },
              // {
              //   title: "Student Details",
              //   url: "/dashboard/school/student-details",
              // },
              // {
              //   title: "Parents Master",
              //   url: "/dashboard/users/parents-master",
              // },
              { title: "Routes", url: "/dashboard/master/route" },
              {
                title: "Geofence",
                url: "/dashboard/school/geofence",
              },
              {
                title: "Driver Approve",
                url: "/dashboard/users/driver-approve",
              },
              // { title: "Notification", url: "/dashboard/users/notification" },
              { title: "Model", url: "/dashboard/master/model" },
              { title: "Category", url: "/dashboard/master/category" },
            ];
          } else if (role === "school" || role === "branchGroup") {
            return [
              { title: "Device", url: "/dashboard/users/add-device" },
              {
                title: "User Master",
                url: "/dashboard/users/branch-master",
              },
              // {
              //   // title: "Student Details",
              //   url: "/dashboard/school/student-details",
              // },
              // {
              //   title: "Parents Master",
              //   url: "/dashboard/users/parents-master",
              // },
              {
                title: "Routes",
                url: "/dashboard/master/route",
              },
              {
                title: "Geofence",
                url: "/dashboard/school/geofence",
              },
            ];
          } else {
            return [
              { title: "Device", url: "/dashboard/users/add-device" },
              // {
              //   // title: "Student Details",
              //   url: "/dashboard/school/student-details",
              // },
              // {
              //   title: "Parents Master",
              //   url: "/dashboard/users/parents-master",
              // },
              {
                title: "Routes",
                url: "/dashboard/master/route",
              },
              {
                title: "Geofence",
                url: "/dashboard/school/geofence",
              },
            ];
          }
        // case "Admin":
        //   return [
        //     { title: "Pickup And Drop", url: "/dashboard/school/pickup-drop" },
        //     { title: "Leave Request", url: "/dashboard/school/leave-request" },
        //   ];
        // case "Users":
        //   return [
        //     {
        //       title: "Driver Approve",
        //       url: "/dashboard/users/driver-approve",
        //     },
        //     // {
        //     //   title: "Supervisor Approve",
        //     //   url: "/dashboard/users/supervisor-approve",
        //     // },
        //   ];
        case "Reports":
          return [
            { title: "Status Report", url: "/dashboard/reports/status-report" },
            {
              title: "Distance Report",
              url: "/dashboard/reports/distance-report",
            },
            {
              title: "History Report",
              url: "/dashboard/reports/history-report",
            },
            { title: "Stoppage Summary", url: "/dashboard/reports/stop-summary-report" },
            { title: "Stop Report", url: "/dashboard/reports/stop-report" },
            {
              title: "Travel Summary",
              url: "/dashboard/reports/travel-summary",
            },
            { title: "Trip Report", url: "/dashboard/reports/trip-report" },
            { title: "Idle Report", url: "/dashboard/reports/idle-report" },
            { title: "Alerts/Events", url: "/dashboard/reports/events" },
            // {
            //   title: "Geofence Report",
            //   url: "/dashboard/reports/geofence-report",
            // },
            {
              title: "Route Report",
              url: "/dashboard/reports/route-report",
            },
          ];
        case "Support":
          return [
            { title: "Chat Box", url: "/dashboard/support/contact-us" },
            { title: "Raise Ticket", url: "/dashboard/support/raise-ticket" },
            // { title: "Answer Ticket", url: "/dashboard/support/answer-ticket" },
            { title: "FAQ", url: "/dashboard/support/faq" },
          ];
        default:
          return [];
      }
    },
    []
  );

  // Access permission mapping for Master section
  const masterAccessMap: Record<string, keyof NonNullable<typeof access>['master']> = {
    "Routes": "route",
    "Geofence": "geofence",
    "Driver Approve": "driver",
  };

  // Access permission mapping for Reports section
  const reportAccessMap: Record<string, keyof NonNullable<typeof access>['reports']> = {
    "Status Report": "status",
    "History Report": "history",
    "Stoppage Summary": "stoppageSummary",
    "Stop Report": "stop",
    "Travel Summary": "travel",
    "Trip Report": "trip",
    "Idle Report": "idle",
    "Alerts/Events": "alert",
    "Route Report": "routeReport",
  };

  const sidebarData = React.useMemo(() => {
    if (!activeSection || !userRole) return [];

    let items = getSidebarData(activeSection, userRole);

    // Apply access filtering for school and branchGroup roles
    if ((userRole === "school" || userRole === "branchGroup") && access) {
      if (activeSection === "Master") {
        items = items.filter(item => {
          const accessKey = masterAccessMap[item.title];
          // If no mapping, always show (e.g., Device, User Master)
          if (!accessKey) return true;
          return access.master?.[accessKey] === true;
        });
      } else if (activeSection === "Reports") {
        items = items.filter(item => {
          const accessKey = reportAccessMap[item.title];
          // If no mapping, always show (e.g., Distance Report)
          if (!accessKey) return true;
          return access.reports?.[accessKey] === true;
        });
      }
    }

    return items;
  }, [activeSection, userRole, getSidebarData, access]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return sidebarData;
    return sidebarData.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sidebarData, searchQuery]);

  // Reset search query when active section changes
  React.useEffect(() => {
    setSearchQuery("");
  }, [activeSection]);

  React.useEffect(() => {
    if (!sidebarData || sidebarData.length === 0) return;
    sidebarData.forEach((item) => {
      router.prefetch(item.url);
    });
  }, [sidebarData, router]);

  const handleItemSelect = React.useCallback(
    (url: string) => {
      startTransition(() => {
        router.push(url);
        if (isMobile) {
          setOpenMobile(false);
        }
      });
    },
    [router, isMobile, setOpenMobile]
  );

  const isCollapsed = state === "collapsed";

  return (
    <>
      {isPending && <RouteLoader />}

      <Sidebar
        collapsible="icon"
        {...props}
        className="border-r border-blue-600/20 transition-all duration-300 ease-in-out"
        style={{ backgroundColor: "#eff6ff" }}
      >
        {/* Header with Search - Fixed Height */}
        <SidebarHeader className="border-b border-blue-600/20 bg-primary h-[60px] flex items-center justify-center transition-all duration-300 ease-in-out">
          {isLoading ? (
            <div className={isCollapsed ? "w-auto" : "w-full px-3"}>
              <Skeleton
                className={`rounded-md bg-blue-300/60 transition-all duration-300 ${isCollapsed ? "h-10 w-10" : "h-9 w-full"
                  }`}
              />
            </div>
          ) : (
            <>
              {/* Expanded Search Bar - Only show when NOT collapsed */}
              {!isCollapsed && (
                <div className="w-full px-3 animate-in fade-in duration-200">
                  <div className="relative mt-3">
                    <Image
                      width={150}
                      height={150}
                      src="/logo.png"
                      alt="Logo"
                      priority
                      className="relative left-10 -top-2.5"
                      unoptimized={true}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </SidebarHeader>

        {/* Scrollable Content - Animated */}
        <SidebarContent className="bg-primary px-2 py-2 transition-all duration-300 ease-in-out">
          {isLoading || !userRole || sidebarData.length === 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full rounded bg-blue-300/60 transition-all duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          ) : (
            <SidebarGroup className="p-0">
              {/* Group Label with Fade Animation */}
              <SidebarGroupLabel className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-white group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:scale-90 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 transition-all duration-300 ease-out overflow-hidden">
                {activeSection || "Menu"}
              </SidebarGroupLabel>

              <SidebarSeparator className="bg-blue-600/20 my-1 group-data-[collapsible=icon]:opacity-0 transition-all duration-200" />

              <SidebarGroupContent className="mt-4">
                <SidebarMenu className="gap-0.5">
                  {filteredData.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-white/60 group-data-[collapsible=icon]:hidden transition-all duration-300">
                      No results
                    </div>
                  ) : (
                    filteredData.map((item, index) => {
                      const Icon = iconMap[item.title] || FileText;
                      const isActive = pathname === item.url;

                      return (
                        <SidebarMenuItem
                          key={item.title}
                          className="animate-in fade-in slide-in-from-left-2 fill-mode-both"
                          style={{
                            animationDelay: `${index * 30}ms`,
                            animationDuration: "300ms",
                          }}
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            className={`
                              group/button relative transition-all duration-200
                              ${isActive
                                ? "bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700"
                                : "text-white hover:bg-blue-500/30 hover:text-white font-medium"
                              }
                              rounded-lg h-11
                              group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11
                              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-2
                            `}
                          >
                            <Link
                              href={item.url}
                              onClick={(e) => {
                                e.preventDefault();
                                handleItemSelect(item.url);
                              }}
                              className="flex items-center gap-3 w-full px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 transition-all duration-200"
                            >
                              {/* Icon with rotate animation on collapse */}
                              <Icon
                                className={`
                                  h-7 w-7 flex-shrink-0 transition-all duration-300
                                  group-hover/button:scale-110 group-hover/button:rotate-3
                                  group-data-[collapsible=icon]:rotate-0 group-data-[collapsible=icon]:scale-150
                                  ${isActive ? "text-black" : "text-white"}
                                `}
                              />
                              {/* Text with slide and fade animation */}
                              <span className="flex-1 truncate text-sm transition-all duration-300 ease-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:translate-x-2 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden">
                                {item.title}
                              </span>
                              {/* Active indicator with pulse */}
                              {isActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:h-2 group-data-[collapsible=icon]:w-2 transition-all duration-200" />
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Animated Rail */}
        {/* <SidebarRail className="bg-blue-600/40 hover:bg-blue-600/60 transition-all duration-300 ease-in-out hover:w-2" /> */}
      </Sidebar>
    </>
  );
}
