// frontend/src/api/parentService.js
import api from './axios';

const BASE_URL = '/academics/parent';

class ParentService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  // Cache utilities
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

  // ===== Children Management =====

  async getMyChildren() {
    const cacheKey = this._getCacheKey('children');
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get(`${BASE_URL}/my_children/`);
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch children:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to load children'
      );
    }
  }

  async addChild(parentId, studentId, relationshipType = 'guardian') {
    try {
      const response = await api.post(`${BASE_URL}/add_child/`, {
        parent_id: parentId,
        student_id: studentId,
        relationship_type: relationshipType
      });
      this.clearCache();
      return response.data;
    } catch (error) {
      console.error('Failed to add child:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to add child'
      );
    }
  }

  // ===== Child Grades =====

  async getChildGrades(studentId, filters = {}) {
    const cacheKey = this._getCacheKey(`child/${studentId}/grades`, filters);
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const url = `${BASE_URL}/child/${studentId}/grades/?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch child grades:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to load grades'
      );
    }
  }

  // ===== Child Attendance =====

  async getChildAttendance(studentId, filters = {}) {
    const cacheKey = this._getCacheKey(`child/${studentId}/attendance`, filters);
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const url = `${BASE_URL}/child/${studentId}/attendance/?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch child attendance:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to load attendance'
      );
    }
  }

  // ===== Child Timetable =====

  async getChildTimetable(studentId) {
    const cacheKey = this._getCacheKey(`child/${studentId}/timetable`);
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get(`${BASE_URL}/child/${studentId}/timetable/`);
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch child timetable:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to load timetable'
      );
    }
  }

  // ===== Child Performance Summary =====

  async getChildPerformanceSummary(studentId) {
    const cacheKey = this._getCacheKey(`child/${studentId}/performance-summary`);
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get(
        `${BASE_URL}/child/${studentId}/performance-summary/`
      );
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch performance summary:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to load performance summary'
      );
    }
  }

  // ===== Utility Methods =====

  getPerformanceCategory(percentage) {
    if (percentage >= 90) return { label: 'Excellent', color: 'text-green-600' };
    if (percentage >= 80) return { label: 'Very Good', color: 'text-blue-600' };
    if (percentage >= 70) return { label: 'Good', color: 'text-yellow-600' };
    if (percentage >= 60) return { label: 'Satisfactory', color: 'text-orange-600' };
    return { label: 'Needs Improvement', color: 'text-red-600' };
  }

  getAttendanceCategory(rate) {
    if (rate >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (rate >= 80) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (rate >= 70) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    if (rate >= 60) return { label: 'Below Average', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Poor', color: 'bg-red-100 text-red-800' };
  }
}

const parentService = new ParentService();
export default parentService;