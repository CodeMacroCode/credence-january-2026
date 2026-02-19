// Device data structure based on your backend
export interface DeviceData {
  speed: number;
  longitude: number;
  latitude: number;
  course: number;
  deviceId: number;
  uniqueId: number | string;
  imei?: string; // made optional as uniqueId seems to be the main identifier now, or they might reuse it
  attributes: {
    charge: boolean;
    ignition: boolean;
    motion: boolean;
    sat: number;
    distance: number;
    totalDistance: number;
    todayDistance: number;
    [key: string]: any;
  };
  gsmSignal: number;
  batteryLevel: number;
  category: string; // Renamed from deviceCategory
  status: string; // "online", "offline", etc.
  lastUpdate: string;
  name: string;
  TD: number;
  mileage: string | number;
  speedLimit: string | number;
  fuelConsumption: string;
  state: string; // Renamed from category. "running", "idle", etc.
  stateDuration: string;
  schoolId?: string;
  branchId?: string;
  matchesSearch?: boolean; // UI only prop probably
  expired?: boolean;
}

export interface AllDeviceData extends DeviceData {
  todayKm: number;
  expired?: boolean;
}

export interface SingleDeviceData extends DeviceData {
  routeNumber?: string;
  routeId?: string;
  // single device might have slightly different attributes or extra fields
}

// Filter options for device queries
export interface DeviceFilters {
  page: number;
  limit: number;
  filter:
  | "all"
  | "running"
  | "idle"
  | "stopped"
  | "inactive"
  | "new"
  | "overspeed";
  searchTerm: string;
  branchId?: string;
  schoolId?: string;
  category?: string; // Renamed from deviceCategory
}

// Response structure from all-device-data event
export interface AllDeviceResponse {
  filteredData: AllDeviceData[];
  page: number;
  pageLimit: number;
  pageCount: number;
  total: number;
  runningCount: number;
  overspeedCount: number;
  idleCount: number;
  stoppedCount: number;
  inactiveCount: number;
  newCount: number;
  remainingCount: number;
  totalCountCheck: number;
  expiredCount: number;
}

// Socket event interfaces for type safety
export interface ServerToClientEvents {
  "all-device-data": (data: AllDeviceResponse) => void;
  "single-device-data": (data: SingleDeviceData) => void;
  "shared device data": (data: SingleDeviceData) => void;
  "auth-success": () => void;
  error: (error: { message: string; details?: string }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
}

export interface ClientToServerEvents {
  credentials: (credentials: { username: string; password: string }) => void;
  "get-all-devices": (filters: DeviceFilters) => void;
  "shared device token": (token: string) => void;
}

// Credentials interface
export interface Credentials {
  username: string;
  password: string;
}
