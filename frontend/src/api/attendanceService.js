// frontend/src/api/attendanceApi.js
import {
  getAttendanceRecords,
  getAttendanceRecord,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceSummary,
  getAttendanceStatistics,
  getAttendanceRankings,
  getStudentRank,
  bulkCreateAttendance,
  bulkUpdateAttendance,
  exportRankingsCSV,
} from "./attendanceService";

// frontend/src/api/attendanceService.js
import api from "./axios";

// Base URL for attendance endpoints
const BASE_URL = "/attendance";

// ---------- CRUD ----------
export async function getAttendanceRecords(params = {}) {
  const response = await api.get(`${BASE_URL}/`, { params });
  return response.data;
}

export async function getAttendanceRecord(id) {
  const response = await api.get(`${BASE_URL}/${id}/`);
  return response.data;
}

export async function createAttendanceRecord(data) {
  const response = await api.post(`${BASE_URL}/`, data);
  return response.data;
}

export async function updateAttendanceRecord(id, data) {
  const response = await api.put(`${BASE_URL}/${id}/`, data);
  return response.data;
}

export async function deleteAttendanceRecord(id) {
  const response = await api.delete(`${BASE_URL}/${id}/`);
  return response.data;
}

// ---------- Statistics ----------
export async function getAttendanceSummary(params = {}) {
  const response = await api.get(`${BASE_URL}/summary/`, { params });
  return response.data;
}

export async function getAttendanceStatistics(params = {}) {
  const response = await api.get(`${BASE_URL}/statistics/`, { params });
  return response.data;
}

export async function getAttendanceRankings(params = {}) {
  const response = await api.get(`${BASE_URL}/rankings/`, { params });
  return response.data;
}

export async function getStudentRank(studentId, classId = null) {
  const response = await api.get(`${BASE_URL}/student-rank/${studentId}/`, {
    params: classId ? { class_id: classId } : {},
  });
  return response.data;
}

// ---------- Bulk Operations ----------
export async function bulkCreateAttendance(records) {
  const response = await api.post(`${BASE_URL}/bulk_create/`, records);
  return response.data;
}

export async function bulkUpdateAttendance(records) {
  const response = await api.put(`${BASE_URL}/bulk_update/`, records);
  return response.data;
}

// ---------- Export ----------
export async function exportRankingsCSV(params = {}) {
  const response = await api.get(`${BASE_URL}/export-rankings/`, {
    params,
    responseType: "blob",
  });
  return response.data;
}

class AttendanceService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 2 * 60 * 1000; // 2 minutes
  }

  // ---------- Utility Helpers ----------

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

  async _handleRequest(fn, key, useCache = true) {
    try {
      if (useCache) {
        const cached = this._getCached(key);
        if (cached) return { data: cached, cached: true };
      }

      const data = await fn();
      if (useCache) this._setCache(key, data);
      return { data, cached: false };
    } catch (error) {
      console.error("AttendanceService error:", error);
      const message =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "An unexpected error occurred.";
      throw new Error(message);
    }
  }

  // ---------- API Wrappers ----------

  async fetchRecords(params = {}, useCache = true) {
    const key = this._getCacheKey("records", params);
    return this._handleRequest(() => getAttendanceRecords(params), key, useCache);
  }

  async fetchRecord(id) {
    return this._handleRequest(() => getAttendanceRecord(id), `record_${id}`, false);
  }

  async createRecord(data) {
    this.cache.clear(); // invalidate cache after mutation
    return this._handleRequest(() => createAttendanceRecord(data), `create_${Date.now()}`, false);
  }

  async updateRecord(id, data) {
    this.cache.clear();
    return this._handleRequest(() => updateAttendanceRecord(id, data), `update_${id}`, false);
  }

  async deleteRecord(id) {
    this.cache.clear();
    return this._handleRequest(() => deleteAttendanceRecord(id), `delete_${id}`, false);
  }

  async summary(params = {}, useCache = true) {
    const key = this._getCacheKey("summary", params);
    return this._handleRequest(() => getAttendanceSummary(params), key, useCache);
  }

  async statistics(params = {}, useCache = true) {
    const key = this._getCacheKey("statistics", params);
    return this._handleRequest(() => getAttendanceStatistics(params), key, useCache);
  }

  async rankings(params = {}, useCache = true) {
    const key = this._getCacheKey("rankings", params);
    return this._handleRequest(() => getAttendanceRankings(params), key, useCache);
  }

  async studentRank(studentId, classId = null) {
    return this._handleRequest(() => getStudentRank(studentId, classId), `rank_${studentId}_${classId || "all"}`, true);
  }

  async bulkCreate(records) {
    this.cache.clear();
    return this._handleRequest(() => bulkCreateAttendance(records), "bulk_create", false);
  }

  async bulkUpdate(records) {
    this.cache.clear();
    return this._handleRequest(() => bulkUpdateAttendance(records), "bulk_update", false);
  }

  async exportRankings(params = {}) {
    return exportRankingsCSV(params);
  }
}

const attendanceService = new AttendanceService();
export default attendanceService;
