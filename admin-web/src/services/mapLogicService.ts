import api from '../lib/api';

export type MapLogicStatus = 'draft' | 'active';

export interface MapLogicLookupCase {
  from: number;
  to: number;
  chain: number[];
}

export interface MapLogicLookupTable {
  width: number;
  height: number;
  cases: MapLogicLookupCase[];
}

export interface MapLogic {
  _id: string;
  name: string;
  width: number;
  height: number;
  gridConfig: {
    width: number;
    height: number;
  };
  lookupTable: MapLogicLookupTable;
  status: MapLogicStatus;
  createdAt: string;
  updatedAt: string;
}

export type MapLogicCreatePayload = {
  name: string;
  width: number;
  height: number;
  gridConfig: {
    width: number;
    height: number;
  };
  lookupTable: MapLogicLookupTable;
  status?: MapLogicStatus;
};

export type MapLogicUpdatePayload = Partial<MapLogicCreatePayload>;

export const mapLogicService = {
  getMapLogics: async (status?: MapLogicStatus): Promise<MapLogic[]> => {
    const response = await api.get<{ mapLogics: MapLogic[] }>('/map-logic', {
      params: status ? { status } : {},
    });
    return response.data.mapLogics;
  },

  getMapLogicById: async (id: string): Promise<MapLogic> => {
    const response = await api.get<MapLogic>(`/map-logic/${id}`);
    return response.data;
  },

  createMapLogic: async (data: MapLogicCreatePayload): Promise<MapLogic> => {
    const response = await api.post<MapLogic>('/map-logic', data);
    return response.data;
  },

  updateMapLogic: async (id: string, data: MapLogicUpdatePayload): Promise<MapLogic> => {
    const response = await api.patch<MapLogic>(`/map-logic/${id}`, data);
    return response.data;
  },

  deleteMapLogic: async (id: string): Promise<void> => {
    await api.delete(`/map-logic/${id}`);
  },
};

