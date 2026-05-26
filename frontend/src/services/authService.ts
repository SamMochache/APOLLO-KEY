/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import { apiClient } from './apiClient';
import { User, LoginCredentials, RegisterCredentials, AuthResponse } from '@types';
import { API_ENDPOINTS } from '@config';

export const authService = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return data;
  },

  /**
   * Register new user
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      credentials
    );
    return data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * Refresh access token
   */
  refresh: async (refreshToken: string): Promise<{ access: string }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {
      refresh: refreshToken,
    });
    return data;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
    return data;
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<{ detail: string }> => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.PASSWORD_RESET, {
      email,
    });
    return data;
  },

  /**
   * Confirm password reset
   */
  confirmPasswordReset: async (
    uid: string,
    token: string,
    newPassword: string
  ): Promise<{ detail: string }> => {
    const { data } = await apiClient.post(
      API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM,
      {
        uid,
        token,
        new_password: newPassword,
      }
    );
    return data;
  },
};
