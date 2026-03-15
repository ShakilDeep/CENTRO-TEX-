import { api } from './client';
import type { ApiResponse } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface SSOCallbackRequest {
  code: string;
  state: string;
  provider?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  office?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface SSOResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', data);
    return response.data;
  },

  logout: async (data: LogoutRequest): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post<ApiResponse<{ message: string }>>('/api/v1/auth/logout', data);
    return response.data;
  },

  refreshToken: async (data: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> => {
    const response = await api.post<ApiResponse<RefreshTokenResponse>>('/api/v1/auth/refresh', data);
    return response.data;
  },

  ssoCallback: async (data: SSOCallbackRequest): Promise<ApiResponse<SSOResponse>> => {
    const response = await api.post<ApiResponse<SSOResponse>>('/api/v1/auth/sso/callback', data);
    return response.data;
  }
};

export default authApi;