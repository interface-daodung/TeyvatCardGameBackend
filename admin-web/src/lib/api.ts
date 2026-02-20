import axios from 'axios';
import { authService } from '../services/authService';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: 401 → refresh & retry or logout; 5xx/network → refresh & retry or logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRefresh = originalRequest.url?.includes('/auth/refresh');
    const status = error.response?.status;
    const is5xx = status >= 500 && status < 600;
    const isNetworkError = !error.response;

    // 401: token expired → refresh once then retry or logout
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const ok = await authService.refreshAccessToken();
        if (ok) {
          originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
          return api(originalRequest);
        }
      } catch {
        // ignore
      }
      authService.logoutAndRedirect();
      return Promise.reject(error);
    }

    // 5xx or network error (e.g. DB down): check token → refresh & retry once or logout
    const couldBeDbDown = (is5xx || isNetworkError) && !isAuthRefresh && !originalRequest._retryDbAuth;
    if (couldBeDbDown) {
      originalRequest._retryDbAuth = true;
      try {
        const ok = await authService.refreshAccessToken();
        if (ok) {
          originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
          return api(originalRequest);
        }
      } catch {
        // ignore
      }
      authService.logoutAndRedirect();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
