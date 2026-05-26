/**
 * useFetch Hook
 * Wrapper around React Query for data fetching
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export const useFetch = <TData, TError = AxiosError>(
  key: string | string[],
  fn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TData, TError>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: fn,
    ...options,
  });
};

export const useMutate = <TData, TError = AxiosError, TVariables = unknown>(
  fn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
) => {
  return useMutation<TData, TError, TVariables>({
    mutationFn: fn,
    ...options,
  });
};
