import api from '../lib/api';

export interface Localization {
  _id: string;
  key: string;
  values: Record<string, string>;
}

export interface LocalizationsResponse {
  localizations: Localization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const localizationService = {
  getLocalizations: async (page = 1, limit = 20): Promise<LocalizationsResponse> => {
    const response = await api.get<LocalizationsResponse>('/localization', {
      params: { page, limit },
    });
    return response.data;
  },

  getLocalizationByKey: async (key: string): Promise<Localization> => {
    const response = await api.get<Localization>(`/localization/${key}`);
    return response.data;
  },

  createLocalization: async (key: string, values: Record<string, string>): Promise<Localization> => {
    const response = await api.post<Localization>('/localization', { key, values });
    return response.data;
  },

  updateLocalization: async (key: string, values: Record<string, string>): Promise<Localization> => {
    const response = await api.patch<Localization>(`/localization/${key}`, { values });
    return response.data;
  },

  getMissingKeys: async (language: string): Promise<string[]> => {
    const response = await api.get<{ missingKeys: string[] }>('/localization/missing', {
      params: { language },
    });
    return response.data.missingKeys;
  },
};
