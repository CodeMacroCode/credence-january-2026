import Link from "next/link";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "../ui/drawer";
import { useRouter } from "next/navigation";
import { useDistance } from "@/hooks/useDistance";
import { uniqueId } from "lodash";

interface BottomDrawerProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  selectedDevice: any;
  addresses: any;
  loadingAddresses: any;
  handleOpenLiveTrack: (uniqueId: number, name: string) => void;
  onOpenRouteTimeline: (
    uniqueId: number,
    deviceName: string,
    routeObjId?: string
  ) => void;
  userRole?: string;
}

export const BottomDrawer = ({
  isDrawerOpen,
  setIsDrawerOpen,
  selectedDevice,
  addresses,
  loadingAddresses,
  handleOpenLiveTrack,
  onOpenRouteTimeline,
  userRole,
}: BottomDrawerProps) => {
  const router = useRouter();
  const handleHistoryClick = (uniqueId: number, deviceCategory?: string) => {
    let url = "/dashboard/reports/history-report?uniqueId=" + uniqueId;
    if (deviceCategory) {
      url += "&deviceCategory=" + deviceCategory;
    }
    router.push(url);
  };

  const { distance, isLoading } = useDistance(selectedDevice?.uniqueId);


  const isExpired = selectedDevice?.expired;
  const isSuperAdmin = userRole === "superadmin";
  const canTrack = !isExpired || isSuperAdmin;


  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerPortal>
        <DrawerOverlay className="bg-transparent" />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex justify-between items-center">
              <div className="flex flex-col items-start">
                {selectedDevice && selectedDevice.name}

                {selectedDevice?.uniqueId && (
                  <span className="text-xs text-gray-500 mt-1">
                    IMEI: {selectedDevice?.uniqueId}
                  </span>
                )}

                {/* Address display below the device name */}
                <div className="mt-1 text-left text-sm text-gray-600 ">
                  {selectedDevice &&
                    (() => {
                      const deviceId = selectedDevice.deviceId;
                      const address = addresses[deviceId];
                      const isLoading = loadingAddresses[deviceId];

                      if (isLoading) {
                        return (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span>Loading...</span>
                          </div>
                        );
                      }

                      if (address) {
                        return <span>{address}</span>;
                      }

                      if (selectedDevice.latitude && selectedDevice.longitude) {
                        return (
                          <span>
                            {selectedDevice.latitude.toFixed(6)},{" "}
                            {selectedDevice.longitude.toFixed(6)}
                          </span>
                        );
                      }

                      return <span>Address not available</span>;
                    })()}
                </div>
              </div>

              <div className="min-w-max flex gap-1 items-center">
                <button
                  className={`rounded-sm text-black border border-black px-2 py-1 transition-colors duration-200 cursor-pointer ${!canTrack
                    ? "opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100 hover:text-black"
                    : "hover:bg-black hover:text-white"
                    }`}
                  disabled={!canTrack}
                  onClick={() => {
                    if (canTrack && selectedDevice?.uniqueId) {
                      handleOpenLiveTrack(
                        selectedDevice?.uniqueId,
                        selectedDevice?.name
                      );
                    }
                  }}
                >
                  {isExpired && !isSuperAdmin ? "Expired" : "Track"}
                </button>
                <button
                  className="rounded-sm mr-1 text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
                  onClick={() => {
                    if (!selectedDevice?.uniqueId) return;
                    handleHistoryClick(selectedDevice.uniqueId, selectedDevice.deviceCategory || selectedDevice.category);
                  }}
                >
                  History
                </button>
                <button
                  className="rounded-sm mr-1 text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
                  onClick={() =>
                    selectedDevice?.uniqueId !== undefined &&
                    onOpenRouteTimeline(
                      selectedDevice.uniqueId,
                      selectedDevice.name,
                      selectedDevice.routeId
                    )
                  }
                >
                  Timeline
                </button>
                <DrawerClose
                  className="rounded-sm text-white border border-black px-2 py-1 bg-black cursor-pointer"
                  aria-label="Close"
                >
                  X
                </DrawerClose>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          <div className="h-px bg-primary"></div>
          <div className="p-3 sm:p-4 space-y-4">
            {selectedDevice ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <img
                        src="/dashboard-icons/speed.svg"
                        className="w-6"
                        alt=""
                      />{" "}
                      <span className="text-stone-600">Speed</span>
                    </label>
                    <p className="ml-8">
                      {selectedDevice?.speed.toFixed(2) + " km/h" || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <img
                        src="/dashboard-icons/odometer.svg"
                        className="w-6"
                        alt=""
                      />{" "}
                      <span className="text-stone-600">Odometer</span>
                    </label>
                    <p className="ml-8">
                      {isLoading
                        ? "Loading..."
                        : `${distance?.totalDistance
                          ? distance?.totalDistance
                          : 0
                        }` + " km"}
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <img
                        src="/dashboard-icons/coordinate.svg"
                        className="w-6"
                        alt=""
                      />{" "}
                      <span className="text-stone-600">Co-ordinates</span>
                    </label>
                    <Link
                      href={`https://www.google.com/maps?q=${selectedDevice?.latitude},${selectedDevice?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      <p className="ml-8 text-blue-700">
                        {`${selectedDevice?.latitude}, ${selectedDevice?.longitude}` ||
                          "N/A"}
                      </p>
                    </Link>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <img
                        src="/dashboard-icons/last-update.svg"
                        className="w-6"
                        alt=""
                      />{" "}
                      <span className="text-stone-600">Last Update</span>
                    </label>

                    <p className="ml-8 ">
                      {`${new Date(selectedDevice.lastUpdate).toLocaleString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                          timeZone: "UTC",
                        }
                      )}` || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <img
                        src="/dashboard-icons/fuel.png"
                        className="w-6"
                        alt=""
                      />{" "}
                      <span className="text-stone-600">Fuel Consumption</span>
                    </label>

                    <p className="ml-8">
                      {isLoading
                        ? "Loading..."
                        : `${(distance as any)?.fuelConsumption ? (distance as any)?.fuelConsumption : 0}` +
                        " Litre"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p>No device selected</p>
            )}
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
};
