import { apiClient } from '../services/apiClient';

const BASE = '/parents';

export const getParents = async <T = any>(params: Record<string, any> = {}): Promise<T> => apiClient.getData<T>(`${BASE}/`, { params } as any);
export const getParent = async <T = any>(id: number): Promise<T> => apiClient.getData<T>(`${BASE}/${id}/`);
export const createParent = async <T = any>(data: any): Promise<T> => apiClient.postData<T>(`${BASE}/`, data);
export const updateParent = async <T = any>(id: number, data: any): Promise<T> => apiClient.postData<T>(`${BASE}/${id}/`, data);
export const deleteParent = async <T = any>(id: number): Promise<T> => apiClient.postData<T>(`${BASE}/${id}/`, {});

export default {
  getParents,
  getParent,
  createParent,
  updateParent,
  deleteParent,
};
