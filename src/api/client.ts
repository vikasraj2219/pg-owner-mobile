import axios from 'axios';
import { safeStorage } from '../utils/storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://pg-owner-backend.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token into requests across Web, Android, and iOS
apiClient.interceptors.request.use(
  async config => {
    try {
      const token = await safeStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_err) {
      // Ignore storage read error
    }
    return config;
  },
  error => Promise.reject(error),
);
