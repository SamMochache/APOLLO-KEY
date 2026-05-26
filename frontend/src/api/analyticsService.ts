import { apiClient } from '../services/apiClient';

class AnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000;

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

  clearCache() {
    this.cache.clear();
  }

  async getStudentPerformanceAnalytics(studentId: number | null = null) {
    const params = studentId ? { student_id: studentId } : {};
    const key = this.getCacheKey('student-performance', params);
    const cached = this.getCached(key);
    if (cached) return cached;

    const query = studentId ? { params } : undefined;
    const data = await apiClient.getData<any>(`/academics/analytics/student-performance/`, query as any);
    this.setCache(key, data);
    return data;
  }

  async exportAnalyticsPDF(studentId: number | null = null) {
    const params = studentId ? { student_id: studentId } : {};
    const res = await apiClient.getData<Blob>(`/academics/analytics/export-pdf/`, { params, responseType: 'blob' } as any);
    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics_${studentId || 'current'}_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  }

  async getSubjectAnalytics(studentId: number, subjectId: number) {
    const data = await apiClient.getData<any>(`/academics/analytics/subject-performance/`, { params: { student_id: studentId, subject_id: subjectId } } as any);
    return data;
  }

  async compareStudents(studentIds: number[]) {
    return apiClient.postData<any>('/academics/analytics/compare-students/', { student_ids: studentIds });
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
export const { getStudentPerformanceAnalytics, exportAnalyticsPDF, clearCache } = analyticsService;
