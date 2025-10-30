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

// frontend/src/api/attendanceApi.js
// Add these new functions to your existing attendanceApi.js

/**
 * Get attendance rankings (top and bottom performers)
 * @param {Object} params - Query parameters
 * @param {string} params.class_id - Filter by class ID
 * @param {number} params.limit - Number of top/bottom students (default: 10)
 * @param {string} params.start_date - Start date for calculation (YYYY-MM-DD)
 * @param {string} params.end_date - End date for calculation (YYYY-MM-DD)
 * @returns {Promise<Object>} Rankings data
 */
export const getAttendanceRankings = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const res = await api.get(`/academics/attendance/rankings/${queryString ? `?${queryString}` : ""}`);
  return res.data;
};

/**
 * Get a specific student's ranking
 * @param {number} studentId - Student ID
 * @param {string} classId - Optional class ID filter
 * @returns {Promise<Object>} Student rank data
 */
export const getStudentRank = async (studentId, classId = null) => {
  const params = new URLSearchParams({ student_id: studentId });
  if (classId) params.append('class_id', classId);
  
  const res = await api.get(`/academics/attendance/student-rank/?${params}`);
  return res.data;
};

/**
 * Export rankings to CSV
 * @param {Object} params - Query parameters (same as getAttendanceRankings)
 */
export const exportRankingsCSV = async (params = {}) => {
  const rankings = await getAttendanceRankings(params);
  
  const headers = ["Rank", "Student Name", "Username", "Attendance Rate (%)", "Present", "Absent", "Late", "Total Records"];
  
  // Combine top and bottom students
  const allStudents = [
    ...rankings.top_students.map((s, idx) => ({ ...s, rank: idx + 1 })),
    ...rankings.bottom_students.map((s, idx) => ({ 
      ...s, 
      rank: rankings.total_students - rankings.bottom_students.length + idx + 1 
    }))
  ];
  
  const rows = allStudents.map(student => [
    student.rank,
    student.student_name,
    student.student_username,
    student.attendance_rate,
    student.present,
    student.absent,
    student.late,
    student.total_records
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_rankings_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};