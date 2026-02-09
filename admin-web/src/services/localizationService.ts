import api from '../lib/api';

export interface Localization {
  _id: string;
  key: string;
  translations: Record<string, string>;
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
  getLocalizations: async (page = 1, limit = 6): Promise<LocalizationsResponse> => {
    const response = await api.get<LocalizationsResponse>('/localization', {
      params: { page, limit },
    });
    return response.data;
  },

  getLocalizationByKey: async (key: string): Promise<Localization> => {
    const response = await api.get<Localization>(`/localization/${key}`);
    return response.data;
  },

  createLocalization: async (key: string, translations: Record<string, string>): Promise<Localization> => {
    const response = await api.post<Localization>('/localization', { key, translations });
    return response.data;
  },

  updateLocalization: async (key: string, translations: Record<string, string>): Promise<Localization> => {
    const response = await api.patch<Localization>(`/localization/${key}`, { translations });
    return response.data;
  },

  deleteLocalization: async (key: string): Promise<void> => {
    await api.delete(`/localization/${key}`);
  },

  translate: async (text: string, source: string, target: string): Promise<string> => {
    const response = await api.post<{ translatedText: string }>('/localization/translate', {
      text,
      source,
      target,
    });
    return response.data.translatedText ?? '';
  },

  getMissingKeys: async (language: string): Promise<string[]> => {
    const response = await api.get<{ missingKeys: string[] }>('/localization/missing', {
      params: { language },
    });
    return response.data.missingKeys;
  },
};
