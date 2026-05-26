import { apiClient } from '../services/apiClient';
import { PaginatedResponse, Attendance, AttendanceSummary } from '@types';

const BASE_URL = '/academics/attendance';

export async function getAttendanceRecords(params: Record<string, any> = {}): Promise<PaginatedResponse<Attendance>> {
  return apiClient.getData<PaginatedResponse<Attendance>>(`${BASE_URL}/`, { params } as any);
}

export async function getAttendanceRecord(id: number): Promise<Attendance> {
  return apiClient.getData<Attendance>(`${BASE_URL}/${id}/`);
}

export async function createAttendanceRecord(data: Partial<Attendance>): Promise<Attendance> {
  return apiClient.postData<Attendance>(`${BASE_URL}/`, data);
}

export async function updateAttendanceRecord(id: number, data: Partial<Attendance>): Promise<Attendance> {
  return apiClient.postData<Attendance>(`${BASE_URL}/${id}/`, data);
}

export async function deleteAttendanceRecord(id: number): Promise<{ detail: string }> {
  return apiClient.postData<{ detail: string }>(`${BASE_URL}/${id}/`, {});
}

export async function getAttendanceSummary(params: Record<string, any> = {}): Promise<AttendanceSummary> {
  return apiClient.getData<AttendanceSummary>(`${BASE_URL}/summary/`, { params } as any);
}

export async function getAttendanceStatistics(params: Record<string, any> = {}): Promise<Record<string, any>> {
  return apiClient.getData<Record<string, any>>(`${BASE_URL}/statistics/`, { params } as any);
}

export async function getAttendanceRankings(params: Record<string, any> = {}): Promise<Record<string, any>> {
  return apiClient.getData<Record<string, any>>(`${BASE_URL}/rankings/`, { params } as any);
}

export async function getStudentRank(studentId: number, classId: number | null = null): Promise<Record<string, any>> {
  return apiClient.getData<Record<string, any>>(`${BASE_URL}/student-rank/`, { params: { student_id: studentId, ...(classId ? { class_id: classId } : {}) } } as any);
}

export async function bulkCreateAttendance(records: Attendance[]): Promise<{ detail: string }> {
  return apiClient.postData<{ detail: string }>(`${BASE_URL}/bulk-create/`, { records });
}

export async function bulkUpdateAttendance(records: Attendance[]): Promise<{ detail: string }> {
  return apiClient.postData<{ detail: string }>(`${BASE_URL}/bulk-update/`, { records });
}

export async function bulkDeleteAttendance(ids: number[]): Promise<{ detail: string }> {
  return apiClient.postData<{ detail: string }>(`${BASE_URL}/bulk-delete/`, { ids });
}

export async function exportRankingsCSV(params: Record<string, any> = {}): Promise<Blob> {
  return apiClient.getData<Blob>(`${BASE_URL}/export-rankings/`, { params, responseType: 'blob' } as any);
}

class AttendanceService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 2 * 60 * 1000;

  private getCacheKey(endpoint: string, params: Record<string, any> = {}) {
    return `${endpoint}?${new URLSearchParams(params).toString()}`;
  }

  private getCached(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async handleRequest<T>(fn: () => Promise<T>, key: string, useCache = true) {
    try {
      if (useCache) {
        const cached = this.getCached(key);
        if (cached) return { data: cached, cached: true } as unknown as { data: T; cached: boolean };
      }
      const data = await fn();
      if (useCache) this.setCache(key, data);
      return { data, cached: false } as { data: T; cached: boolean };
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.error || error.message || 'An unexpected error occurred.';
      throw new Error(message);
    }
  }

  async fetchRecords(params: Record<string, any> = {}, useCache = true) {
    const key = this.getCacheKey('records', params);
    return this.handleRequest(() => getAttendanceRecords(params), key, useCache);
  }

  async fetchRecord(id: number) {
    return this.handleRequest(() => getAttendanceRecord(id), `record_${id}`, false);
  }

  async createRecord(data: Partial<Attendance>) {
    this.cache.clear();
    return this.handleRequest(() => createAttendanceRecord(data as any), `create_${Date.now()}`, false);
  }

  async updateRecord(id: number, data: Partial<Attendance>) {
    this.cache.clear();
    return this.handleRequest(() => updateAttendanceRecord(id, data as any), `update_${id}`, false);
  }

  async deleteRecord(id: number) {
    this.cache.clear();
    return this.handleRequest(() => deleteAttendanceRecord(id), `delete_${id}`, false);
  }

  async summary(params: Record<string, any> = {}, useCache = true) {
    const key = this.getCacheKey('summary', params);
    return this.handleRequest(() => getAttendanceSummary(params), key, useCache);
  }

  async statistics(params: Record<string, any> = {}, useCache = true) {
    const key = this.getCacheKey('statistics', params);
    return this.handleRequest(() => getAttendanceStatistics(params), key, useCache);
  }

  async rankings(params: Record<string, any> = {}, useCache = true) {
    const key = this.getCacheKey('rankings', params);
    return this.handleRequest(() => getAttendanceRankings(params), key, useCache);
  }

  async studentRank(studentId: number, classId: number | null = null) {
    return this.handleRequest(() => getStudentRank(studentId, classId), `rank_${studentId}_${classId || 'all'}`, true);
  }

  async bulkCreate(records: Attendance[]) {
    this.cache.clear();
    return this.handleRequest(() => bulkCreateAttendance(records), 'bulk_create', false);
  }

  async bulkUpdate(records: Attendance[]) {
    this.cache.clear();
    return this.handleRequest(() => bulkUpdateAttendance(records), 'bulk_update', false);
  }

  async bulkDelete(ids: number[]) {
    this.cache.clear();
    return this.handleRequest(() => bulkDeleteAttendance(ids), 'bulk_delete', false);
  }

  async exportRankings(params: Record<string, any> = {}) {
    return exportRankingsCSV(params);
  }

  clearCache() {
    this.cache.clear();
  }
}

const attendanceService = new AttendanceService();
export default attendanceService;
