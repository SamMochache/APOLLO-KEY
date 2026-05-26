/**
 * useAsync Hook
 * Handles async operations with loading and error states
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export const useAsync = <T,>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
) => {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null, isLoading: true });
    try {
      const result = await asyncFunction();
      setState({
        status: 'success',
        data: result,
        error: null,
        isLoading: false,
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({
        status: 'error',
        data: null,
        error: err,
        isLoading: false,
      });
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
  };
};
