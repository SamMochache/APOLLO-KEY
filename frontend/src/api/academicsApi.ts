import { apiClient } from '../services/apiClient';

export const getClasses = async <T = any>(): Promise<T> => {
  return apiClient.getData<T>('/academics/classes/');
};

export const getClass = async <T = any>(id: number): Promise<T> => {
  return apiClient.getData<T>(`/academics/classes/${id}/`);
};

export const createClass = async <T = any>(data: any): Promise<T> => {
  return apiClient.postData<T>('/academics/classes/', data);
};

export const updateClass = async <T = any>(id: number, data: any): Promise<T> => {
  return apiClient.postData<T>(`/academics/classes/${id}/`, data);
};

export const deleteClass = async <T = any>(id: number): Promise<T> => {
  return apiClient.postData<T>(`/academics/classes/${id}/`, {});
};

export const getClassTimetable = async <T = any>(id: number): Promise<T> => {
  return apiClient.getData<T>(`/academics/classes/${id}/timetable/`);
};

// Subjects
export const getSubjects = async <T = any>(): Promise<T> => apiClient.getData<T>('/academics/subjects/');
export const getSubject = async <T = any>(id: number): Promise<T> => apiClient.getData<T>(`/academics/subjects/${id}/`);
export const createSubject = async <T = any>(data: any): Promise<T> => apiClient.postData<T>('/academics/subjects/', data);
export const updateSubject = async <T = any>(id: number, data: any): Promise<T> => apiClient.postData<T>(`/academics/subjects/${id}/`, data);
export const deleteSubject = async <T = any>(id: number): Promise<T> => apiClient.postData<T>(`/academics/subjects/${id}/`, {});

// Timetable
export const getTimetable = async <T = any>(params: Record<string, any> = {}): Promise<T> => {
  return apiClient.getData<T>('/academics/timetable/', { params });
};

export const getTimetableEntry = async <T = any>(id: number): Promise<T> => apiClient.getData<T>(`/academics/timetable/${id}/`);
export const createTimetableEntry = async <T = any>(data: any): Promise<T> => apiClient.postData<T>('/academics/timetable/', data);
export const updateTimetableEntry = async <T = any>(id: number, data: any): Promise<T> => apiClient.postData<T>(`/academics/timetable/${id}/`, data);
export const deleteTimetableEntry = async <T = any>(id: number): Promise<T> => apiClient.postData<T>(`/academics/timetable/${id}/`, {});

// Bulk operations
export const bulkCreateTimetable = async <T = any>(entries: any[]): Promise<T> => apiClient.postData<T>('/academics/timetable/bulk_create/', { entries });
export const bulkUpdateTimetable = async <T = any>(entries: any[]): Promise<T> => apiClient.postData<T>('/academics/timetable/bulk_update/', { entries });
export const bulkDeleteTimetable = async <T = any>(ids: any[]): Promise<T> => apiClient.postData<T>('/academics/timetable/bulk_delete/', { ids });

export const checkTimetableConflicts = async <T = any>(params: Record<string, any> = {}): Promise<T> => apiClient.getData<T>('/academics/timetable/conflicts/', { params });
