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
    return await apiClient.postData<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
  },

  /**
   * Register new user
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return await apiClient.postData<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, credentials);
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await apiClient.postData<void>(API_ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * Refresh access token
   */
  refresh: async (refreshToken: string): Promise<{ access: string }> => {
    return await apiClient.postData<{ access: string }>(API_ENDPOINTS.AUTH.REFRESH, {
      refresh: refreshToken,
    });
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    return await apiClient.getData<User>(API_ENDPOINTS.AUTH.ME);
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<{ detail: string }> => {
    return await apiClient.postData<{ detail: string }>(API_ENDPOINTS.AUTH.PASSWORD_RESET, {
      email,
    });
  },

  /**
   * Confirm password reset
   */
  confirmPasswordReset: async (
    uid: string,
    token: string,
    newPassword: string
  ): Promise<{ detail: string }> => {
    return await apiClient.postData<{ detail: string }>(
      API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM,
      {
        uid,
        token,
        new_password: newPassword,
      }
    );
  },
};
