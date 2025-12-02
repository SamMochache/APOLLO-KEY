// frontend/src/api/analyticsService.js
import api from './axios';

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  _getCacheKey(endpoint, params = {}) {
    return `${endpoint}?${new URLSearchParams(params).toString()}`;
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const { data, timestamp } = entry;
    if (Date.now() - timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return data;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }

  async getStudentPerformanceAnalytics(studentId = null) {
    const params = studentId ? { student_id: studentId } : {};
    const cacheKey = this._getCacheKey('student-performance', params);
    const cached = this._getCached(cacheKey);
    
    if (cached) {
      console.log('📦 Using cached analytics');
      return cached;
    }

    try {
      const queryString = studentId ? `?student_id=${studentId}` : '';
      const response = await api.get(`/academics/analytics/student-performance/${queryString}`);
      const data = response.data;
      
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to load analytics');
    }
  }

  async exportAnalyticsPDF(studentId = null) {
    try {
      const queryString = studentId ? `?student_id=${studentId}` : '';
      const response = await api.get(`/academics/analytics/export-pdf/${queryString}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${studentId || 'current'}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to export PDF:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to export report'
      };
    }
  }

  async getSubjectAnalytics(studentId, subjectId) {
    try {
      const response = await api.get(`/academics/analytics/subject-performance/`, {
        params: { student_id: studentId, subject_id: subjectId }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to load subject analytics');
    }
  }

  async compareStudents(studentIds) {
    try {
      const response = await api.post('/academics/analytics/compare-students/', {
        student_ids: studentIds
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to compare students');
    }
  }
}

const analyticsService = new AnalyticsService();

export default analyticsService;
export const {
  getStudentPerformanceAnalytics,
  exportAnalyticsPDF,
  clearCache
} = analyticsService;

