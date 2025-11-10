// frontend/src/api/gradeService.js
import api from './axios';

class GradeAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  // Utility methods
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

  // API methods
  async getStatistics(filters = {}) {
    const cacheKey = this._getCacheKey('statistics', filters);
    const cached = this._getCached(cacheKey);
    
    if (cached) {
      console.log('📦 Using cached statistics');
      return cached;
    }

    try {
      const params = new URLSearchParams();
      
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.class) params.append('class', filters.class);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      
      const response = await api.get(`/academics/grades/statistics/?${params.toString()}`);
      const data = response.data;
      
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch statistics:', error);
      throw new Error(error.response?.data?.error || 'Failed to load statistics');
    }
  }

  async getSubjects() {
    const cacheKey = 'subjects';
    const cached = this._getCached(cacheKey);
    
    if (cached) return cached;

    try {
      const response = await api.get('/academics/subjects/');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch subjects:', error);
      return [];
    }
  }

  async getClasses() {
    const cacheKey = 'classes';
    const cached = this._getCached(cacheKey);
    
    if (cached) return cached;

    try {
      const response = await api.get('/academics/classes/');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch classes:', error);
      return [];
    }
  }

  async exportStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/academics/grades/export-statistics/?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grade_statistics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to export statistics:', error);
      throw new Error('Failed to export report');
    }
  }
}

// Create singleton instance
const gradeAnalyticsService = new GradeAnalyticsService();

export default gradeAnalyticsService;

// Named exports for convenience
export const {
  getStatistics,
  getSubjects,
  getClasses,
  exportStatistics,
  clearCache
} = gradeAnalyticsService;