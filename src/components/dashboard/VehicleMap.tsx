import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { getValidDeviceCategory } from "@/components/statusIconMap";
import "leaflet/dist/leaflet.css";
import "./VehicleMap.css";
import { calculateTimeSince } from "@/util/calculateTimeSince";

// Types based on your socket response
import { DeviceData as VehicleData } from "@/types/socket";

interface VehicleMapProps {
  vehicles: VehicleData[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onVehicleClick?: (vehicle: VehicleData) => void;
  selectedVehicleId?: number | null;
  onVehicleSelect?: (vehicleId: number | null) => void;
  showTrails?: boolean;
  clusterMarkers?: boolean;
  autoFitBounds?: boolean;
  fitBoundsTrigger?: number;
}

// Custom cluster icon creator
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'small';
  let dimensions = 40;

  if (count >= 10 && count < 50) {
    size = 'medium';
    dimensions = 50;
  } else if (count >= 50) {
    size = 'large';
    dimensions = 60;
  }

  return L.divIcon({
    html: `<div class="cluster-icon cluster-${size}">
      <span class="cluster-count">${count}</span>
    </div>`,
    className: 'custom-cluster-marker',
    iconSize: L.point(dimensions, dimensions, true),
  });
};

// Optimized marker component with proper memoization
const VehicleMarker = React.memo(
  ({
    vehicle,
    onClick,
    isSelected,
  }: {
    vehicle: VehicleData;
    onClick?: (vehicle: VehicleData) => void;
    isSelected?: boolean;
  }) => {
    // Memoize image URL
    const imageUrl = useMemo(() => {
      const validCategory = getValidDeviceCategory(vehicle.category);
      const statusToImageUrl: Record<string, string> = {
        running: `/${validCategory}/top-view/green.svg`,
        idle: `/${validCategory}/top-view/yellow.svg`,
        stopped: `/${validCategory}/top-view/red.svg`,
        inactive: `/${validCategory}/top-view/grey.svg`,
        overspeed: `/${validCategory}/top-view/orange.svg`,
        noData: `/${validCategory}/top-view/blue.svg`,
      };
      return statusToImageUrl[vehicle.state] || statusToImageUrl.inactive;
    }, [vehicle.category, vehicle.state]);


    // Memoize icon with proper sizing
    const vehicleIcon = useMemo(() => {
      const rotationAngle = vehicle.course || 0;

      return L.divIcon({
        html: `
          <div class="vehicle-marker-container ${isSelected ? "selected" : ""}">
            <img 
              src="${imageUrl}" 
              class="vehicle-marker-img"
              style="
                transform: rotate(${rotationAngle}deg);
                width: 100px;
                height: 100px;
                transform-origin: center center;
                transition: transform 0.3s ease;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              " 
              alt="Vehicle marker"
            />
          </div>
        `,
        className: "custom-vehicle-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    }, [imageUrl, vehicle.course, isSelected]);

    const handleClick = useCallback(() => {
      onClick?.(vehicle);
    }, [vehicle, onClick]);

    // Memoize formatted date
    const formattedLastUpdate = useMemo(() => {
      const utcDate = new Date(vehicle.lastUpdate);
      const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
      const day = istDate.getUTCDate().toString().padStart(2, "0");
      const month = (istDate.getUTCMonth() + 1).toString().padStart(2, "0");
      const year = istDate.getUTCFullYear();
      const hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes().toString().padStart(2, "0");
      const seconds = istDate.getUTCSeconds().toString().padStart(2, "0");
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? "PM" : "AM";
      return `${day}/${month}/${year}, ${hour12}:${minutes}:${seconds} ${ampm}`;
    }, [vehicle.lastUpdate]);

    // Memoize status info
    const statusInfo = useMemo(() => {
      const statusMap: Record<string, { text: string; color: string }> = {
        running: { text: "Running", color: "#28a745" },
        idle: { text: "Idle", color: "#ffc107" },
        stopped: { text: "Stopped", color: "#dc3545" },
        inactive: { text: "Inactive", color: "#666666" },
        overspeed: { text: "Overspeeding", color: "#fd7e14" },
        noData: { text: "No Data", color: "#007bff" },
      };
      return statusMap[vehicle.state] || statusMap.noData;
    }, [vehicle.state]);

    return (
      <Marker
        position={[vehicle.latitude, vehicle.longitude]}
        icon={vehicleIcon}
        eventHandlers={{
          click: handleClick,
        }}
      >
        <Popup maxWidth={290} className="vehicle-popup" maxHeight={300}>
          <div className="vehicle-popup-content">
            <div className="vehicle-header">
              <h3 className="vehicle-name">{vehicle.name}</h3>
              <span
                className="status-badge"
                style={{ backgroundColor: statusInfo.color }}
              >
                {statusInfo.text}
              </span>
            </div>

            <div className="vehicle-details scrollable-details">
              <div className="detail-row">
                <span className="label">Speed:</span>
                <span className="value">{vehicle.speed.toFixed(2)} km/h</span>
              </div>
              <div className="detail-row">
                <span className="label">Speed Limit:</span>
                <span className="value">{vehicle.speedLimit}</span>
              </div>
              <div className="detail-row">
                <span className="label">Category:</span>
                <span className="value">{vehicle.category}</span>
              </div>
              <div className="detail-row">
                <span className="label">Mileage:</span>
                <span className="value">{vehicle.mileage}</span>
              </div>
              <div className="detail-row">
                <span className="label">Fuel Consumption:</span>
                <span className="value">{vehicle.fuelConsumption} L</span>
              </div>
              <div className="detail-row">
                <span className="label">Last Update:</span>
                <span className="value">
                  {vehicle?.lastUpdate
                    ? new Date(vehicle.lastUpdate).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                      timeZone: "UTC",
                    })
                    : "N/A"}
                </span>
              </div>

              <div className="detail-row">
                <span className="label">Since:</span>
                <span className="value">
                  {calculateTimeSince(vehicle.lastUpdate)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Today's Distance:</span>
                <span className="value">
                  {vehicle.attributes.todayDistance} km
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Network:</span>
                <span
                  className={`value ${vehicle.gsmSignal ? "online" : "offline"
                    }`}
                >
                  {vehicle.gsmSignal ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            <div className="vehicle-coordinates">
              <small>
                📍 {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}
              </small>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    return (
      prevProps.vehicle.deviceId === nextProps.vehicle.deviceId &&
      prevProps.vehicle.speed === nextProps.vehicle.speed &&
      prevProps.vehicle.latitude === nextProps.vehicle.latitude &&
      prevProps.vehicle.longitude === nextProps.vehicle.longitude &&
      prevProps.vehicle.course === nextProps.vehicle.course &&
      prevProps.vehicle.lastUpdate === nextProps.vehicle.lastUpdate &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

const VehicleZoomHandler = ({
  selectedVehicleId,
  vehicles,
}: {
  selectedVehicleId: number | null;
  vehicles: VehicleData[];
}) => {
  const map = useMap();
  const [lastZoomedId, setLastZoomedId] = useState<number | null>(null);

  const zoomToVehicle = useCallback(
    (vehicle: VehicleData) => {
      if (!vehicle.latitude || !vehicle.longitude) return;

      // console.log(
      //   "Zooming to vehicle:",
      //   vehicle.name,
      //   "at coordinates:",
      //   vehicle.latitude,
      //   vehicle.longitude
      // );

      // ✅ Method 1: Use flyTo for smoother centering (recommended)
      map.flyTo([vehicle.latitude, vehicle.longitude], 16, {
        animate: true,
        duration: 1, // 1 second duration
        easeLinearity: 0.25,
      });

      // ✅ Alternative Method 2: Use panTo + setZoom if flyTo doesn't work
      // map.panTo([vehicle.latitude, vehicle.longitude]);
      // setTimeout(() => {
      //   map.setZoom(16);
      // }, 500);

      // ✅ Alternative Method 3: Force invalidateSize before setView (for rendering issues)
      // map.invalidateSize();
      // setTimeout(() => {
      //   map.setView([vehicle.latitude, vehicle.longitude], 16, {
      //     animate: true,
      //     duration: 0.8,
      //     easeLinearity: 0.1
      //   });
      // }, 100);

      // ✅ Open popup after animation completes
      setTimeout(() => {
        // console.log("Opening popup for vehicle:", vehicle.name);

        // Find all markers and open popup for selected vehicle
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            const markerLatLng = layer.getLatLng();
            // Use more precise comparison for coordinate matching
            if (
              Math.abs(markerLatLng.lat - vehicle.latitude) < 0.0001 &&
              Math.abs(markerLatLng.lng - vehicle.longitude) < 0.0001
            ) {
              // console.log("Found matching marker, opening popup");
              layer.openPopup();
            }
          }
        });

        // Optional: Add visual highlight
        const selectedMarker = document.querySelector(
          `.custom-vehicle-marker[data-device-id="${vehicle.deviceId}"]`
        ) as HTMLElement;

        if (selectedMarker) {
          selectedMarker.classList.add("highlighted");

          // Remove highlight after 3 seconds
          setTimeout(() => {
            selectedMarker.classList.remove("highlighted");
          }, 3000);
        }
      }, 1100); // ✅ Wait for flyTo animation to complete (duration + 100ms buffer)
    },
    [map]
  );

  useEffect(() => {
    // console.log("VehicleZoomHandler effect triggered:", {
    //   selectedVehicleId,
    //   lastZoomedId,
    //   vehicleCount: vehicles.length,
    // });

    // Only zoom if selectedVehicleId is different from last zoomed ID
    if (!selectedVehicleId || selectedVehicleId === lastZoomedId) {
      // console.log("Skipping zoom - no change or same vehicle");
      return;
    }

    const selectedVehicle = vehicles.find(
      (v) => v.deviceId === selectedVehicleId
    );

    if (selectedVehicle) {
      // console.log("Found vehicle to zoom to:", selectedVehicle.name);
      zoomToVehicle(selectedVehicle);
      setLastZoomedId(selectedVehicleId);
    } else {
      // console.log("Vehicle not found with deviceId:", selectedVehicleId);
    }
  }, [selectedVehicleId, zoomToVehicle, lastZoomedId]); // ✅ Keep vehicles out of dependencies

  // Reset last zoomed ID when selectedVehicleId becomes null
  useEffect(() => {
    if (selectedVehicleId === null) {
      // console.log("Resetting last zoomed ID");
      setLastZoomedId(null);
    }
  }, [selectedVehicleId]);

  return null;
};

// Map bounds updater with better performance
const MapBoundsUpdater = ({
  vehicles,
  shouldFitBounds,
  onBoundsFitted,
  fitBoundsTrigger = 0,
}: {
  vehicles: VehicleData[];
  shouldFitBounds: boolean;
  onBoundsFitted: () => void;
  fitBoundsTrigger?: number;
}) => {
  const map = useMap();
  const lastTriggerRef = useRef(fitBoundsTrigger);

  // Handle manual fit bounds (button click)
  useEffect(() => {
    if (shouldFitBounds && vehicles.length > 0) {
      const bounds = L.latLngBounds(
        vehicles.map((v) => [v.latitude, v.longitude] as [number, number])
      );

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 15,
        });
        onBoundsFitted();
      }
    }
  }, [vehicles, shouldFitBounds, map, onBoundsFitted]);

  // Handle filter-based auto zoom
  useEffect(() => {
    // Check if we have a new trigger that hasn't been handled yet
    if (fitBoundsTrigger > lastTriggerRef.current) {
      // We have a pending zoom request.
      // Only execute if we have vehicles to zoom to.
      if (vehicles.length > 0) {
        const bounds = L.latLngBounds(
          vehicles.map((v) => [v.latitude, v.longitude] as [number, number])
        );

        if (bounds.isValid()) {
          // console.log("Auto-zooming to", vehicles.length, "vehicles. Trigger:", fitBoundsTrigger);
          map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 15,
          });
          // Mark this trigger as handled
          lastTriggerRef.current = fitBoundsTrigger;
        }
      }
      // If vehicles.length is 0, we do NOTHING. 
      // lastTriggerRef.current remains < fitBoundsTrigger.
      // When vehicles update (and this effect runs again), it will retry.
    } else if (fitBoundsTrigger < lastTriggerRef.current) {
      // Handle reset case if trigger ever wraps around or resets (unlikely but safe)
      lastTriggerRef.current = fitBoundsTrigger;
    }
  }, [vehicles, fitBoundsTrigger, map]);

  return null;
};

// Container resize handler component
const MapResizeHandler = () => {
  const map = useMap();

  useLayoutEffect(() => {
    const mapContainer = map.getContainer().parentElement;
    if (!mapContainer) return;

    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(mapContainer);
    return () => resizeObserver.disconnect();
  }, [map]);

  return null;
};

// Optimized map controls
// const MapControls = ({
//   onFitBounds,
//   vehicleCount,
// }: {
//   onFitBounds: () => void;
//   vehicleCount: number;
// }) => {
//   return (
//     <div className="map-controls">
//       <button
//         className="map-control-button fit-bounds-btn"
//         onClick={onFitBounds}
//         title="Fit all vehicles in view"
//       >
//         <span className="control-icon">🎯</span>
//         <span className="control-text">Fit All ({vehicleCount})</span>
//       </button>
//     </div>
//   );
// };

// Custom cluster icon - memoized
// const createClusterCustomIcon = (cluster: any) => {
//   const count = cluster.getChildCount();

//   let size = 40;
//   let sizeClass = "text-xs";
//   let bgClass = "bg-gradient-to-br from-sky-400 to-blue-600";

//   if (count >= 100) {
//     size = 60;
//     sizeClass = "text-lg";
//     bgClass = "bg-gradient-to-br from-blue-400 to-blue-600";
//   } else if (count >= 10) {
//     size = 50;
//     sizeClass = "text-sm";
//     bgClass = "bg-gradient-to-br from-emerald-400 to-green-600";
//   }

//   return L.divIcon({
//     html: `
//       <div
//         class="
//           flex items-center justify-center
//           rounded-full
//           font-bold text-white
//           shadow-lg
//           ring-2 ring-white/40
//           transition-transform duration-200 ease-out
//           hover:scale-110
//           ${sizeClass}
//           ${bgClass}
//         "
//         style="width:${size}px; height:${size}px;"
//       >
//         ${count}
//       </div>
//     `,
//     className: "bg-transparent border-0",
//     iconSize: [size, size],
//     iconAnchor: [size / 2, size / 2],
//   });
// };

const VehicleMap: React.FC<VehicleMapProps> = ({
  vehicles,
  center = [21.99099777777778, 78.92973111111111],
  zoom = 10,
  height,
  onVehicleClick,
  selectedVehicleId,
  showTrails = false,
  clusterMarkers = true,
  autoFitBounds = false,
  fitBoundsTrigger = 0,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);

  // Filter valid vehicles with memoization
  const validVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        vehicle.latitude &&
        vehicle.longitude &&
        !isNaN(vehicle.latitude) &&
        !isNaN(vehicle.longitude) &&
        Math.abs(vehicle.latitude) <= 90 &&
        Math.abs(vehicle.longitude) <= 180
    );
  }, [vehicles]);

  // Calculate map center efficiently
  const mapCenter = useMemo(() => {
    if (validVehicles.length === 0) return center;
    if (!isInitialLoad) return center;

    const avgLat =
      validVehicles.reduce((sum, v) => sum + v.latitude, 0) /
      validVehicles.length;
    const avgLng =
      validVehicles.reduce((sum, v) => sum + v.longitude, 0) /
      validVehicles.length;

    return [avgLat, avgLng] as [number, number];
  }, [validVehicles, center, isInitialLoad]);

  // Memoize vehicle click handler with stable reference
  const handleVehicleClick = useCallback(
    (vehicle: VehicleData) => {
      onVehicleClick?.(vehicle);
    },
    [onVehicleClick]
  );

  // Handle initial load bounds fitting
  useEffect(() => {
    if (isInitialLoad && validVehicles.length > 0 && autoFitBounds) {
      setShouldFitBounds(true);
    }
  }, [isInitialLoad, validVehicles.length, autoFitBounds]);

  // Handle manual fit bounds
  const handleFitBounds = useCallback(() => {
    if (validVehicles.length > 0) {
      setShouldFitBounds(true);
    }
  }, [validVehicles.length]);

  // Reset bounds fitting flag
  const handleBoundsFitted = useCallback(() => {
    setShouldFitBounds(false);
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  // Render markers with or without clustering - optimized for 1500+ vehicles
  const renderMarkers = useMemo(() => {
    const markers = validVehicles.map((vehicle) => (
      <VehicleMarker
        key={`${vehicle.deviceId}-${vehicle?.uniqueId}`}
        vehicle={vehicle}
        onClick={handleVehicleClick}
        isSelected={selectedVehicleId === vehicle.deviceId}
      />
    ));

    // Use clustering for better performance with large datasets
    if (clusterMarkers && validVehicles.length > 10) {
      return (
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={80} // Increased for better clustering with 1500+ markers
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={15} // Cluster until closer zoom
          removeOutsideVisibleBounds={true} // Remove markers outside viewport for performance
        >
          {markers}
        </MarkerClusterGroup>
      );
    }

    return markers;
  }, [validVehicles, handleVehicleClick, selectedVehicleId, clusterMarkers]);

  return (
    <div className="vehicle-map-container" style={{ height, width: "100%" }}>
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        preferCanvas={true}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url={`https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`}
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={19}
        />

        {/* Handle container resize issues */}
        <MapResizeHandler />

        {/* Handle vehicle selection and zoom */}
        <VehicleZoomHandler
          selectedVehicleId={selectedVehicleId ?? null}
          vehicles={validVehicles}
        />

        {/* Handle bounds fitting */}
        <MapBoundsUpdater
          vehicles={validVehicles}
          shouldFitBounds={shouldFitBounds}
          onBoundsFitted={handleBoundsFitted}
          fitBoundsTrigger={fitBoundsTrigger}
        />

        {/* Render optimized markers */}
        {renderMarkers}
      </MapContainer>

      {/* Map Controls */}
      {/* <MapControls
        onFitBounds={handleFitBounds}
        vehicleCount={validVehicles.length}
      /> */}
    </div>
  );
};

export default VehicleMap;
