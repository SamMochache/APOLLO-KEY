/**
 * useAuth Hook
 * Provides authentication context and methods
 */

import { useAuthStore } from '@store';
import { authService } from '@services/authService';
import { User, LoginCredentials, RegisterCredentials } from '@types';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error, setUser, setLoading, setError, logout: storeLogout } = useAuthStore();

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await authService.register(credentials);
      setUser(response.user);
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      storeLogout();
    }
  };

  const getCurrentUser = async (): Promise<User | null> => {
    setLoading(true);
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
  };
};
