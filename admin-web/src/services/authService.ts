import axios from 'axios';
import api from '../lib/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { user } = response.data;
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userRole', user.role);
    return response.data;
  },

  loginUser: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login-user', credentials);
    const { user } = response.data;
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userRole', user.role);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },

  getUserEmail: (): string | null => {
    return localStorage.getItem('userEmail');
  },

  getUserId: (): string | null => {
    return localStorage.getItem('userId');
  },

  getUserRole: (): string | null => {
    return localStorage.getItem('userRole');
  },

  isUserRole: (): boolean => {
    return localStorage.getItem('userRole') === 'user';
  },

  /** Refresh access token (uses raw axios to avoid interceptor loop). Returns true if success. */
  refreshAccessToken: async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const response = await axios.post<{ accessToken?: string }>('/api/auth/refresh', {
        refreshToken,
      });
      const { accessToken } = response.data;
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /** Clear tokens and redirect to login (e.g. when refresh fails). */
  logoutAndRedirect: () => {
    authService.logout();
    window.location.href = '/login';
  },
};
