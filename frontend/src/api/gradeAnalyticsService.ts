import { apiClient } from '../services/apiClient';
import * as academicsApi from './academicsApi';

class GradeAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000;

  private _getCacheKey(key: string, params: Record<string, any> = {}) {
    return `${key}?${new URLSearchParams(params).toString()}`;
  }

  private _getCached(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private _setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  clearCache() {
    this.cache.clear();
  }

  async getStatistics(filters: Record<string, any> = {}) {
    const key = this._getCacheKey('statistics', filters);
    const cached = this._getCached(key);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.class) params.append('class', filters.class);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const res = await apiClient.getData<any>(`/academics/grades/statistics/?${params.toString()}`);
      return this._setCache(key, res);
    } catch (err: any) {
      console.error('❌ Failed to fetch statistics:', err);
      throw new Error(err?.response?.data?.error || 'Failed to load statistics');
    }
  }

  async getSubjects() {
    const key = 'subjects';
    const cached = this._getCached(key);
    if (cached) return cached;
    try {
      const res = await academicsApi.getSubjects();
      const list = Array.isArray(res) ? res : (res?.results || []);
      return this._setCache(key, list);
    } catch (err) {
      console.error('❌ Failed to fetch subjects:', err);
      return [];
    }
  }

  async getClasses() {
    const key = 'classes';
    const cached = this._getCached(key);
    if (cached) return cached;
    try {
      const res = await academicsApi.getClasses();
      const list = Array.isArray(res) ? res : (res?.results || []);
      return this._setCache(key, list);
    } catch (err) {
      console.error('❌ Failed to fetch classes:', err);
      return [];
    }
  }

  async exportStatistics(filters: Record<string, any> = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, String(v)));
      const res = await apiClient.getData<Blob>(`/academics/grades/export-statistics/?${params.toString()}`, {
        responseType: 'blob',
      } as any);

      const url = window.URL.createObjectURL(new Blob([res] as any));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `grade_statistics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (err: any) {
      console.error('❌ Failed to export statistics:', err);
      throw new Error('Failed to export report');
    }
  }
}

const gradeAnalyticsService = new GradeAnalyticsService();
export default gradeAnalyticsService;
