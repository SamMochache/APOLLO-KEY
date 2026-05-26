/**
 * Authentication Store (Zustand)
 * Centralized auth state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@types';
import { storage } from '@utils';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  resetError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        setUser: (user: User | null) =>
          set({
            user,
            isAuthenticated: !!user,
            error: null,
          }),

        setLoading: (loading: boolean) =>
          set({ isLoading: loading }),

        setError: (error: string | null) =>
          set({ error }),

        logout: () => {
          storage.remove('access_token');
          storage.remove('refresh_token');
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        },

        resetError: () => set({ error: null }),
      }),
      {
        name: 'auth-store',
        storage: {
          getItem: (key: string) => {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
          },
          setItem: (key: string, value: unknown) => {
            localStorage.setItem(key, JSON.stringify(value));
          },
          removeItem: (key: string) => {
            localStorage.removeItem(key);
          },
        },
      }
    )
  )
);
