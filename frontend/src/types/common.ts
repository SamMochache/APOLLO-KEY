/**
 * Common Utility Types
 */

export type Maybe<T> = T | null | undefined;

export type Nullable<T> = T | null;

export interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationParams {
  page: number;
  page_size: number;
  ordering?: string;
  search?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: unknown;
}

export type AsyncThunkStatus = 'idle' | 'pending' | 'fulfilled' | 'rejected';

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}
