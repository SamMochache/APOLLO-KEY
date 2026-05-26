import { apiClient } from '../services/apiClient';

export const getGradeAnalytics = async <T = any>(params: Record<string, any> = {}): Promise<T> => {
  return apiClient.getData<T>('/grades/analytics/', { params } as any);
};

export const exportGradeAnalyticsCSV = async <T = any>(params: Record<string, any> = {}): Promise<T> => {
  return apiClient.getData<T>('/grades/analytics/export/', { params, responseType: 'blob' } as any);
};
