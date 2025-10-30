// frontend/src/api/attendanceApi.js
import api from "./axios";

// Get all attendance records with optional filters
export const getAttendanceRecords = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await api.get(`/academics/attendance/${queryString ? `?${queryString}` : ""}`);
  return res.data;
};

// Get single attendance record
export const getAttendanceRecord = async (id) => {
  const res = await api.get(`/academics/attendance/${id}/`);
  return res.data;
};

// Create new attendance record
export const createAttendanceRecord = async (data) => {
  const res = await api.post("/academics/attendance/", data);
  return res.data;
};

// Update attendance record
export const updateAttendanceRecord = async (id, data) => {
  const res = await api.put(`/academics/attendance/${id}/`, data);
  return res.data;
};

// Delete attendance record
export const deleteAttendanceRecord = async (id) => {
  const res = await api.delete(`/academics/attendance/${id}/`);
  return res.data;
};

// Get attendance summary
export const getAttendanceSummary = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await api.get(`/academics/attendance/summary/${queryString ? `?${queryString}` : ""}`);
  return res.data;
};

// Get attendance statistics
export const getAttendanceStatistics = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await api.get(`/academics/attendance/statistics/${queryString ? `?${queryString}` : ""}`);
  return res.data;
};

// Bulk create attendance records
export const bulkCreateAttendance = async (records) => {
  const promises = records.map(record => createAttendanceRecord(record));
  return Promise.all(promises);
};

// Bulk update attendance records
export const bulkUpdateAttendance = async (records) => {
  const promises = records.map(record => 
    updateAttendanceRecord(record.id, record)
  );
  return Promise.all(promises);
};