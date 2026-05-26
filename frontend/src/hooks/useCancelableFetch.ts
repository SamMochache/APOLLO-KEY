import { useState, useEffect, useRef, useCallback } from 'react';

type AsyncFn<TData, TArgs extends any[]> = (opts: { signal: AbortSignal }, ...args: TArgs) => Promise<TData>;

interface UseCancelableFetchOptions<TData> {
  immediate?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (err: any) => void;
  retryCount?: number;
  retryDelay?: number;
}

export default function useCancelableFetch<TData = any, TArgs extends any[] = any[]>(
  asyncFn: AsyncFn<TData, TArgs>,
  deps: any[] = [],
  options: UseCancelableFetchOptions<TData> = {}
) {
  const {
    immediate = true,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (...args: TArgs) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn({ signal: controller.signal }, ...args);
      if (mountedRef.current && !controller.signal.aborted) {
        setData(result);
        setError(null);
        onSuccess?.(result);
        retryCountRef.current = 0;
      }
      return result;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
        // cancelled
        return null as any;
      }

      if (mountedRef.current && !controller.signal.aborted) {
        if (retryCountRef.current < (retryCount || 0)) {
          retryCountRef.current++;
          setTimeout(() => {
            if (mountedRef.current) execute(...args);
          }, retryDelay);
          return null as any;
        }

        setError(err);
        setData(null);
        onError?.(err);
        retryCountRef.current = 0;
        return null as any;
      }
      return null as any;
    } finally {
      if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [asyncFn, onSuccess, onError, retryCount, retryDelay]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      (execute as unknown as (...args: any[]) => Promise<any>)();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: execute,
    cancel,
  } as const;
}
