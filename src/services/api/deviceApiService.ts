import api from "@/lib/axios";
import { GetDeviceResponse, GetExpiredDevicesResponse } from "@/interface/modal";

export const deviceApiService = {
  getDevices: async (
    params: Record<string, any>
  ): Promise<GetDeviceResponse> => {
    const res = await api.get("/device", { params });
    return res.data;
  },

  exportExcel: async (params: Record<string, any>): Promise<Blob> => {
    const res = await api.get("/device/export/excel", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  exportPdf: async (params: Record<string, any>): Promise<Blob> => {
    const res = await api.get("/device/export/pdf", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  createDevice: async (payload: any) => {
    const res = await api.post("/device", payload);
    return res.data;
  },

  updateDevice: async (id: string, payload: any) => {
    const res = await api.put(`/device/${id}`, payload);
    return res.data;
  },

  deleteDeviceById: async (id: string) => {
    const res = await api.delete(`/device/${id}`);
    return res.data;
  },

  deleteDevice: async (ids: string[]) => {
    const res = await api.delete(`/device`, {
      data: { ids },
    });
    return res.data;
  },

  checkRouteAssign: async (id: string) => {
    const res = await api.get(`/deivce/already-assign-check/${id}`);
    return res.data;
  },

  checkDriverAssign: async (driverObjId: string) => {
    const res = await api.get(
      `/deivce/already-assign-check-to-driver/${driverObjId}`
    );
    return res.data;
  },

  getExpiredDevices: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    schoolId?: string;
    branchId?: string;
  }): Promise<GetExpiredDevicesResponse> => {
    const res = await api.get("/deivce/expired", { params });
    return res.data;
  },

  updateExpirationDate: async (uniqueId: string, payload: { expirationdate: string; password?: string }) => {
    const res = await api.put(`/device/expiration/${uniqueId}`, payload);
    return res.data;
  },

  createSubscriptionOrder: async (payload: { uniqueId: string; years: number }) => {
    const res = await api.post("https://psychotropic-kary-bolographically.ngrok-free.dev/api/subscription/create-order", payload);
    return res.data;
  },
};

