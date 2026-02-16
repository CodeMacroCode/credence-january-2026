import { useMemo } from "react";
import L from "leaflet";
import { VehicleStatus } from "./useVehicleStatus";
import { getValidDeviceCategory } from "@/components/statusIconMap";

interface UseVehicleMarkerIconProps {
  status: VehicleStatus;
  deviceCategory: string;
  markerSize?: number;
  // statusImageMap?: Record<VehicleStatus, string>;
}



export const useVehicleMarkerIcon = ({
  status,
  deviceCategory,
  markerSize = 100,
  // statusImageMap = defaultStatusImageMap,
}: UseVehicleMarkerIconProps) => {

  const defaultStatusImageMap: Record<VehicleStatus, string> = {
    running: `/${getValidDeviceCategory(deviceCategory)}/top-view/green.svg`,
    idle: `/${getValidDeviceCategory(deviceCategory)}/top-view/yellow.svg`,
    stopped: `/${getValidDeviceCategory(deviceCategory)}/top-view/red.svg`,
    inactive: `/${getValidDeviceCategory(deviceCategory)}/top-view/grey.svg`,
    overspeeding: `/${getValidDeviceCategory(deviceCategory)}/top-view/orange.svg`,
    noData: `/${getValidDeviceCategory(deviceCategory)}/top-view/blue.svg`,
  };

  console.log("default image: ", defaultStatusImageMap)


  const imageUrl = useMemo(() => {
    return defaultStatusImageMap[status] || defaultStatusImageMap.inactive;
  }, [status, defaultStatusImageMap]);

  const icon = useMemo(() => {
    return L.divIcon({
      html: `
        <div class="single-vehicle-marker-container">
          <img 
            src="${imageUrl}" 
            class="vehicle-marker-img"
            style="
              width: ${markerSize}px;
              height: ${markerSize}px;
              transform-origin: center center;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            " 
            alt="Vehicle marker"
          />
        </div>
      `,
      className: "custom-single-vehicle-marker",
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
      popupAnchor: [0, -20],
    });
  }, [imageUrl, markerSize]);

  return { icon, imageUrl };
};
