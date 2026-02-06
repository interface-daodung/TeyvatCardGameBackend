import api from '../lib/api';

export interface User {
  _id: string;
  email: string;
  role: string;
  isBanned: boolean;
  xu: number;
  ownedCharacters: any[];
  ownedEquipment: any[];
  bannedCards: {
    characters: any[];
    equipment: any[];
  };
  createdAt: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const userService = {
  getUsers: async (page = 1, limit = 20): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>('/users', {
      params: { page, limit },
    });
    return response.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  banUser: async (id: string, isBanned: boolean): Promise<void> => {
    await api.patch(`/users/${id}/ban`, { isBanned });
  },

  updateUserXu: async (id: string, xu: number): Promise<void> => {
    await api.patch(`/users/${id}/xu`, { xu });
  },

  banCard: async (userId: string, cardId: string, cardType: 'character' | 'equipment'): Promise<void> => {
    await api.post(`/users/${userId}/ban-card`, { cardId, cardType });
  },

  unbanCard: async (userId: string, cardId: string, cardType: 'character' | 'equipment'): Promise<void> => {
    await api.post(`/users/${userId}/unban-card`, { cardId, cardType });
  },
};
