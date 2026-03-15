import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useRateLimitActions } from '../stores/rateLimitStore';
import { useToastActions } from '../stores/uiStore';
import TokenRefreshService from '../services/tokenRefreshService';

// Types for API responses and requests
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// API Client class
class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private tokenRefreshService: TokenRefreshService;

  private constructor() {
    const baseURL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '');
    console.log('[ApiClient] Initializing with baseURL:', baseURL);

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.tokenRefreshService = TokenRefreshService.getInstance();
    this.setupInterceptors();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        console.log('[ApiClient] Request:', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''));
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        } else {
          config.headers.Authorization = `Bearer demo-token`;
        }

        // Add hardware tracking header if present
        const deviceId = localStorage.getItem('device_id') || 'HW-SCANNER-001';
        config.headers['x-device-id'] = deviceId;

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 429) {
          const responseData = error.response.data as { message?: string };
          const errorMessage = responseData?.message || this.getDefaultErrorMessage(429);
          const retryAfterHeader = error.response.headers['retry-after'];
          const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;

          const { setRateLimit } = useRateLimitActions();
          const { addToast } = useToastActions();

          setRateLimit(errorMessage, retryAfterSeconds);
          addToast({
            type: 'warning',
            title: 'Rate Limit Exceeded',
            message: errorMessage,
            duration: 5000
          });
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.tokenRefreshService.ensureValidToken();
            const { accessToken } = useAuthStore.getState();

            if (accessToken) {
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            window.location.href = '/login';
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
    };

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as { message?: string; code?: string };

      apiError.status = status;
      apiError.message = data?.message || this.getDefaultErrorMessage(status);
      apiError.code = data?.code;
    } else if (error.request) {
      apiError.message = 'Network error. Please check your connection.';
    } else {
      apiError.message = error.message || 'Request configuration error';
    }

    return apiError;
  }

  private getDefaultErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'Conflict with existing data.';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  get axios(): AxiosInstance {
    return this.axiosInstance;
  }

  isAuthenticated(): boolean {
    const { isAuthenticated, isTokenExpired } = useAuthStore.getState();
    return isAuthenticated && !isTokenExpired();
  }

  destroy(): void {
    this.tokenRefreshService.destroy();
  }
}

export const apiClient = ApiClient.getInstance();
export const api = apiClient.axios;
export type { AxiosResponse, AxiosError };
