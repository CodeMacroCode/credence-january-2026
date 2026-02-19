import { useMemo } from "react";
import L from "leaflet";
import { VehicleStatus } from "./useVehicleStatus";
import { getValidDeviceCategory } from "@/components/statusIconMap";

interface UseVehicleMarkerIconProps {
  status: string;
  category: string;
  markerSize?: number;
  // statusImageMap?: Record<VehicleStatus, string>;
}



export const useVehicleMarkerIcon = ({
  status, // This seems to be mapped to state in caller, but keeping name for now. Or should I rename prop?
  category,
  markerSize = 100,
  // statusImageMap = defaultStatusImageMap,
}: { status: string; category: string; markerSize?: number }) => {

  const defaultStatusImageMap: Record<string, string> = {
    running: `/${getValidDeviceCategory(category)}/top-view/green.svg`,
    idle: `/${getValidDeviceCategory(category)}/top-view/yellow.svg`,
    stopped: `/${getValidDeviceCategory(category)}/top-view/red.svg`,
    inactive: `/${getValidDeviceCategory(category)}/top-view/grey.svg`,
    overspeeding: `/${getValidDeviceCategory(category)}/top-view/orange.svg`,
    noData: `/${getValidDeviceCategory(category)}/top-view/blue.svg`,
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
