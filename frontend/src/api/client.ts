import axios from 'axios';
import type { AxiosError } from 'axios';

const rawBase = String(
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '',
).trim();
const baseURL = (rawBase.replace(/\/$/, '') || '/api');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return /\/auth\/(login|register)\b/.test(url);
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:unauthorized'));
      if (hadToken && !/\/(login|register)\b/.test(window.location.pathname)) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiFailure = {
  success: false;
  error: {
    code?: string;
    message: string;
  };
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export { api };
