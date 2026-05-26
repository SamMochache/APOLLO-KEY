import { apiClient } from '../services/apiClient';

const BASE = '/grades';

export const getGrades = async <T = any>(params: Record<string, any> = {}): Promise<T> => apiClient.getData<T>(`${BASE}/`, { params } as any);
export const getGrade = async <T = any>(id: number): Promise<T> => apiClient.getData<T>(`${BASE}/${id}/`);
export const createGrade = async <T = any>(data: any): Promise<T> => apiClient.postData<T>(`${BASE}/`, data);
export const updateGrade = async <T = any>(id: number, data: any): Promise<T> => apiClient.postData<T>(`${BASE}/${id}/`, data);
export const deleteGrade = async <T = any>(id: number): Promise<T> => apiClient.postData<T>(`${BASE}/${id}/`, {});
