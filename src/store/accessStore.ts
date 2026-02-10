import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import safeLocalStorage from "@/util/storage";

interface MasterAccess {
  route: boolean;
  geofence: boolean;
  driver: boolean;
}

interface ReportsAccess {
  status: boolean;
  history: boolean;
  stoppageSummary: boolean;
  stop: boolean;
  travel: boolean;
  trip: boolean;
  idle: boolean;
  alert: boolean;
  routeReport: boolean;
}

interface Access {
  master: MasterAccess;
  reports: ReportsAccess;
}

interface AccessState {
  access: Access | null;
  setAccess: (access: Access) => void;
  clearAccess: () => void;
  hasMasterAccess: (key: keyof MasterAccess) => boolean;
  hasReportAccess: (key: keyof ReportsAccess) => boolean;
}

export const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => ({
      access: null,

      setAccess: (access: Access) => {
        console.log("🔐 Setting access permissions:", access);
        set({ access });
      },

      clearAccess: () => {
        console.log("🔐 Clearing access permissions");
        set({ access: null });
      },

      hasMasterAccess: (key: keyof MasterAccess) => {
        const { access } = get();
        if (!access?.master) return false;
        return access.master[key] === true;
      },

      hasReportAccess: (key: keyof ReportsAccess) => {
        const { access } = get();
        if (!access?.reports) return false;
        return access.reports[key] === true;
      },
    }),
    {
      name: "access-storage",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
