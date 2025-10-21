import axios from 'axios';
import { API_CONFIG } from '@/config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('phone_number');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ Add this helper function for typed responses
export async function getTyped<T>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}

export default api;
