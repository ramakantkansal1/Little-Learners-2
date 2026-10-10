import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '@hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuth.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshAccessToken } = useAuth.getState();
        const success = await refreshAccessToken();

        if (success) {
          const { accessToken } = useAuth.getState();
          if (originalRequest.headers && accessToken) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuth.getState().clearAuth();
        window.location.href = '/auth/parent/login';
      }
    }

    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      cursor?: string;
      limit: number;
      hasMore: boolean;
    };
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Array<{
      field: string;
      message: string;
      type: string;
    }>;
  };
}

// Helper to extract data from response
export const extractData = <T>(response: { data: ApiResponse<T> }): T => {
  return response.data.data;
};

// Helper to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};