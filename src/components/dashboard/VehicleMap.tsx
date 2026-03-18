import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { getValidDeviceCategory } from "@/components/statusIconMap";
import "leaflet/dist/leaflet.css";
import "./VehicleMap.css";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import { Satellite, Radius } from "lucide-react";
import { LiaTrafficLightSolid } from "react-icons/lia";
import { useGeofenceDashboard } from "@/hooks/useGeofence";
import { Geofence } from "@/interface/modal";

// Types based on your socket response
import { AllDeviceData as VehicleData } from "@/types/socket";

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
  mapType?: "roadmap" | "satellite";
  showMapTypeSelector?: boolean;
  // Action button callbacks
  onLiveTrack?: (uniqueId: number, name: string) => void;
  onHistory?: (uniqueId: number, deviceCategory?: string) => void;
  onOpenRouteTimeline?: (uniqueId: number, deviceName: string, routeObjId?: string) => void;
  userRole?: string;
  showGeofences?: boolean;
}


// ---- Geofence overlay layer ----
const GeofenceLayer = () => {
  const { geofences } = useGeofenceDashboard();

  return (
    <>
      {geofences.map((geo: Geofence) => {
        const [lat, lng] = geo.area?.center ?? [null, null];
        const radius = geo.area?.radius;
        if (!lat || !lng || !radius) return null;

        return (
          <Circle
            key={geo._id}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.15,
              weight: 2,
              dashArray: "5 5",
              opacity: 0.8,
            }}
          >
            <Popup className="geofence-popup">
              <div style={{ fontFamily: "inherit", minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#4c1d95" }}>
                  🔵 {geo.geofenceName}
                </div>
                {geo.address && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    📍 {geo.address}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#374151" }}>
                  Radius: <strong>{radius}m</strong>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};

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
    onLiveTrack,
    onHistory,
    onOpenRouteTimeline,
    userRole,
  }: {
    vehicle: VehicleData;
    onClick?: (vehicle: VehicleData) => void;
    isSelected?: boolean;
    onLiveTrack?: (uniqueId: number, name: string) => void;
    onHistory?: (uniqueId: number, deviceCategory?: string) => void;
    onOpenRouteTimeline?: (uniqueId: number, deviceName: string, routeObjId?: string) => void;
    userRole?: string;
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
        <div class="vehicle-marker-container ${isSelected ? " selected" : ""}" data-device-id="${vehicle.deviceId}">
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
    }, [imageUrl, vehicle.course, isSelected, vehicle.deviceId]);

    const handleClick = useCallback(() => {
      onClick?.(vehicle);
    }, [vehicle, onClick]);

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

    const isExpired = (vehicle as any).expired;
    const isSuperAdmin = userRole === "superadmin";
    const canTrack = !isExpired || isSuperAdmin;
    const streetViewUrl = `https://www.google.com/maps?layer=c&cbll=${vehicle.latitude},${vehicle.longitude}`;

    return (
      <Marker
        position={[vehicle.latitude, vehicle.longitude]}
        icon={vehicleIcon}
        eventHandlers={{ click: handleClick }}
      >
        <Popup minWidth={280} maxWidth={320} className="vehicle-popup" maxHeight={420}>
          <div className="popup-card">
            {/* ---- Header ---- */}
            <div className="popup-card-header">
              <div className="popup-card-title-group">
                <h3 className="popup-card-title">{vehicle.name}</h3>
                <div className="popup-card-subtitle">IMEI: {vehicle.uniqueId} · {vehicle.category}</div>
              </div>
            </div>

            {/* ---- Status Banner ---- */}
            <div
              className="popup-status-banner"
              style={{ background: `linear-gradient(135deg, ${statusInfo.color}18 0%, ${statusInfo.color}08 100%)`, border: `1px solid ${statusInfo.color}25` }}
            >
              <span className="popup-status-dot" style={{ background: statusInfo.color }}>
                {statusInfo.text === "Running" ? "▶" : statusInfo.text === "Stopped" ? "■" : statusInfo.text === "Idle" ? "⏸" : "●"}
              </span>
              {statusInfo.text} · {vehicle.speed.toFixed(1)} km/h
            </div>

            {/* ---- Detail Grid ---- */}
            <div className="popup-detail-grid">
              <div className="popup-detail-item">
                <span className="popup-label">Speed</span>
                <span className="popup-value">{vehicle.speed.toFixed(2)} km/h</span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Speed Limit</span>
                <span className="popup-value">{vehicle.speedLimit}</span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Today&apos;s Km</span>
                <span className="popup-value">{vehicle.todayKm} km</span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Mileage</span>
                <span className="popup-value">{vehicle.mileage}</span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Last Update</span>
                <span className="popup-value">
                  {vehicle?.lastUpdate
                    ? new Date(vehicle.lastUpdate).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "UTC",
                    })
                    : "N/A"}
                </span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Since</span>
                <span className="popup-value">{calculateTimeSince(vehicle.lastUpdate)}</span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Network</span>
                <span className={`popup-value ${vehicle.gsmSignal ? "status-online" : "status-offline"}`}>
                  {vehicle.gsmSignal ? "● Online" : "● Offline"}
                </span>
              </div>
              <div className="popup-detail-item">
                <span className="popup-label">Fuel</span>
                <span className="popup-value">{vehicle.fuelConsumption} L</span>
              </div>
            </div>

            {/* ---- Coordinates Card ---- */}
            <div className="popup-coords-card">
              📍 {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}
            </div>

            {/* ---- Action Buttons ---- */}
            <div className="popup-actions">
              <button
                className={`popup-action-btn primary${!canTrack ? " disabled" : ""}`}
                disabled={!canTrack}
                onClick={() => canTrack && onLiveTrack?.(Number(vehicle.uniqueId), vehicle.name)}
                title={!canTrack ? "Subscription expired" : "Open live tracking"}
              >
                <span className="btn-icon">🎯</span>
                {isExpired && !isSuperAdmin ? "Expired" : "Live Track"}
              </button>

              <button
                className="popup-action-btn"
                onClick={() => onHistory?.(Number(vehicle.uniqueId), (vehicle as any).deviceCategory || vehicle.category)}
                title="View history report"
              >
                <span className="btn-icon">📋</span>
                History
              </button>

              <button
                className="popup-action-btn"
                onClick={() => onOpenRouteTimeline?.(Number(vehicle.uniqueId), vehicle.name, (vehicle as any).routeId)}
                title="View route timeline"
              >
                <span className="btn-icon">🗓</span>
                Timeline
              </button>

              <a
                className="popup-action-btn"
                href={streetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Street View"
              >
                <span className="btn-icon">🌐</span>
                Street View
              </a>
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
          `.custom-vehicle-marker [data-device-id="${vehicle.deviceId}"]`
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
  mapType = "roadmap",
  showMapTypeSelector = true,
  onLiveTrack,
  onHistory,
  onOpenRouteTimeline,
  userRole,
  showGeofences = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [internalMapType, setInternalMapType] = useState<"roadmap" | "satellite">(mapType);
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [isGeofenceVisible, setIsGeofenceVisible] = useState(true);

  // Compute tile URL combining map type + traffic overlay
  // lyrs codes: m=roadmap, y=hybrid(satellite+labels), traffic=traffic overlay
  const tileUrl = useMemo(() => {
    if (internalMapType === "satellite") {
      return showTrafficLayer
        ? "https://{s}.google.com/vt/lyrs=y,traffic&x={x}&y={y}&z={z}"
        : "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
    }
    return showTrafficLayer
      ? "https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}"
      : "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  }, [internalMapType, showTrafficLayer]);
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

  const [renderedCount, setRenderedCount] = useState(500); // Progressive rendering initial count

  // Progressive rendering for large datasets
  useEffect(() => {
    if (validVehicles.length > renderedCount) {
      const timer = setTimeout(() => {
        setRenderedCount((prev) => Math.min(prev + 1000, validVehicles.length));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [validVehicles.length, renderedCount]);

  // Reset rendered count when vehicles fundamentally change (e.g. filter change)
  useEffect(() => {
    setRenderedCount(500);
  }, [vehicles.length]);

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

  // Render markers with or without clustering - optimized for 50K+ vehicles
  const renderMarkers = useMemo(() => {
    const visibleVehicles = validVehicles.slice(0, renderedCount);
    const markers = visibleVehicles.map((vehicle) => (
      <VehicleMarker
        key={`${vehicle.deviceId}-${vehicle?.uniqueId}`}
        vehicle={vehicle}
        onClick={handleVehicleClick}
        isSelected={selectedVehicleId === vehicle.deviceId}
        onLiveTrack={onLiveTrack}
        onHistory={onHistory}
        onOpenRouteTimeline={onOpenRouteTimeline}
        userRole={userRole}
      />
    ));

    // Use clustering for better performance with large datasets
    if (clusterMarkers && visibleVehicles.length > 10) {
      // Dynamically adjust cluster radius based on dataset size
      const dynamicRadius = visibleVehicles.length > 10000 ? 150 : visibleVehicles.length > 1000 ? 120 : 80;

      return (
        <MarkerClusterGroup
          chunkedLoading
          chunkDelay={100} // Increased delay to keep UI responsive
          chunkInterval={200} // Increased interval
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={dynamicRadius}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={18}   // Keep clusters active until very close zoom
          removeOutsideVisibleBounds={true}
          animate={visibleVehicles.length <= 2000}  // Disable animation earlier for better performance
          zoomToBoundsOnClick={true}
        >
          {markers}
        </MarkerClusterGroup>
      );
    }

    return markers;
  }, [validVehicles, handleVehicleClick, selectedVehicleId, clusterMarkers, renderedCount, onLiveTrack, onHistory, onOpenRouteTimeline, userRole]);

  return (
    <div className="vehicle-map-container" style={{ height, width: "100%", position: "relative" }}>
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        preferCanvas={true}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Single tile layer — URL encodes both map type and traffic overlay */}
        <TileLayer
          key={tileUrl}
          url={tileUrl}
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

        {renderMarkers}

        {/* Geofence overlay — hidden for superAdmin and togglable */}
        {showGeofences && isGeofenceVisible && <GeofenceLayer />}
      </MapContainer>

      {showMapTypeSelector && (
        <div className="absolute top-4 right-4 z-1000 hidden lg:flex flex-col gap-2">
          {/* Satellite / Roadmap toggle */}
          <button
            onClick={() => setInternalMapType((prev) => (prev === "roadmap" ? "satellite" : "roadmap"))}
            className={`p-3 rounded-lg shadow-lg transition-all duration-200 cursor-pointer ${internalMapType === "satellite"
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            title={internalMapType === "roadmap" ? "Switch to Satellite" : "Switch to Map"}
            aria-label={internalMapType === "roadmap" ? "Switch to Satellite" : "Switch to Map"}
          >
            <Satellite size={20} />
          </button>

          {/* Traffic layer toggle */}
          <button
            onClick={() => setShowTrafficLayer((prev) => !prev)}
            className={`p-3 rounded-lg shadow-lg transition-all duration-200 cursor-pointer ${showTrafficLayer
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-gray-700 text-white hover:bg-gray-900"
              }`}
            title={showTrafficLayer ? "Hide Traffic" : "Show Traffic"}
            aria-label={showTrafficLayer ? "Hide Traffic" : "Show Traffic"}
          >
            <LiaTrafficLightSolid className="w-5 h-5" />
          </button>

          {/* Geofence toggle */}
          {showGeofences && (
            <button
              onClick={() => setIsGeofenceVisible((prev) => !prev)}
              className={`p-3 rounded-lg shadow-lg transition-all duration-200 cursor-pointer ${isGeofenceVisible
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              title={isGeofenceVisible ? "Hide Geofences" : "Show Geofences"}
              aria-label={isGeofenceVisible ? "Hide Geofences" : "Show Geofences"}
            >
              <Radius size={20} />
            </button>
          )}
        </div>
      )}

      {/* Map Controls */}
      {/* <MapControls
        onFitBounds={handleFitBounds}
        vehicleCount={validVehicles.length}
      /> */}
    </div>
  );
};

export default VehicleMap;
