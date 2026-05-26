import { apiClient } from '../services/apiClient';

export const generateReportCard = async <T = any>(payload: any): Promise<T> => apiClient.postData<T>('/reports/generate/', payload);
export const getReport = async <T = any>(id: number): Promise<T> => apiClient.getData<T>(`/reports/${id}/`);
export const exportReportPDF = async <T = any>(params: Record<string, any> = {}): Promise<T> => apiClient.getData<T>('/reports/export/', { params, responseType: 'blob' } as any);

export default {
  generateReportCard,
  getReport,
  exportReportPDF,
};
