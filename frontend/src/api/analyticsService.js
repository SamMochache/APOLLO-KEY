import api from './axios';

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 10 * 60 * 1000; // 10 minutes
  }

  // Uses your existing caching pattern from gradeService and parentService
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

  async getStudentPerformance(studentId = null, filters = {}) {
    const cacheKey = this._getCacheKey('student-performance', { studentId, ...filters });
    const cached = this._getCached(cacheKey);
    
    if (cached) {
      console.log('📦 Using cached analytics');
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (studentId) params.append('student_id', studentId);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      console.log('🔍 Fetching analytics from:', `/academics/analytics/student-performance/?${params.toString()}`);
      
      const response = await api.get(`/academics/analytics/student-performance/?${params.toString()}`);
      const data = response.data;
      
      console.log('✅ Analytics data received:', data);
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to load analytics');
    }
  }

  async exportAnalyticsPDF(studentId = null, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (studentId) params.append('student_id', studentId);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const response = await api.get(`/academics/analytics/export-pdf/?${params.toString()}`, {
        responseType: 'blob'
      });

      // Use your existing download logic from reportService
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `analytics_report_${studentId || 'current'}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('❌ Failed to export analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to export analytics report');
    }
  }

  // Utility methods following your pattern from parentService
  getPerformanceCategory(score) {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 80) return { label: 'Very Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 70) return { label: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (score >= 60) return { label: 'Satisfactory', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { label: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100' };
  }

  getTrendIndicator(trend) {
    const trends = {
      'improving': { icon: '↗️', color: 'text-green-600', label: 'Improving' },
      'declining': { icon: '↘️', color: 'text-red-600', label: 'Declining' },
      'stable': { icon: '→', color: 'text-blue-600', label: 'Stable' }
    };
    return trends[trend] || trends.stable;
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;