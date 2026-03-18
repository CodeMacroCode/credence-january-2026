import api from "@/lib/axios";
import { GetGeofenceResponse, Geofence } from "@/interface/modal";

export const geofenceService = {
  getGeofence: async (
    params: Record<string, any>
  ): Promise<GetGeofenceResponse> => {
    const res = await api.get<GetGeofenceResponse>("/geofence", { params });
    return res.data;
  },

  getGeofenceByUniqueId: async (params: Record<string, any>) => {
    const res = await api.get<GetGeofenceResponse>(`/geofence/timeline`, {
      params,
    });
    return res.data;
  },

  getGeofencesForDashboard: async (): Promise<Geofence[]> => {
    const res = await api.get("/geofencetodashboard");
    // API may return { data: [...] } or a plain array
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
  },

  createGeofence: async (payload: any) => {
    const res = await api.post("/geofence", payload);
    return res.data;
  },

  createMultipleGeofence: async (payload: any) => {
    const res = await api.post("/geofence/multiple", payload);
    return res.data;
  },

  updateGeofence: async (id: string, payload: any) => {
    const res = await api.put(`/geofence/${id}`, payload);
    return res.data;
  },

  deleteGeofence: async (id: string[]) => {
    const res = await api.delete(`/geofence`, { data: { ids: id } });
    return res.data;
  },
};
