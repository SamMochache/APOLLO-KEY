// frontend/src/pages/AttendanceRecorder.jsx
import React, { useState, useEffect } from "react";
import { 
  Save, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Check
} from "lucide-react";
import api from "../api/axios";

export default function AttendanceRecorder() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [existingRecords, setExistingRecords] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      checkExistingRecords();
    }
  }, [selectedClass, attendanceDate]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/academics/classes/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setClasses(data);
    } catch (error) {
      showMessage("error", "Failed to load classes");
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/academics/attendance/students-by-class/?class_id=${selectedClass}`);
      const classData = res.data;
      
      // ✅ Use 'students' (not user_set)
      const validStudents = (classData || []).filter(
        (student) => student.is_active !== false && student.role === "student"
      );
      setStudents(validStudents);
      
      // Initialize attendance data
      const initialData = validStudents.map(student => ({
        student: student.id,
        student_name: student.username,
        status: "present",
        notes: ""
      }));
      
      setAttendanceData(initialData);
    } catch (error) {
      showMessage("error", "Failed to load students");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRecords = async () => {
    if (!selectedClass || !attendanceDate) return;

    try {
      const res = await api.get(
        `/academics/attendance/?class_id=${selectedClass}&date=${attendanceDate}`
      );
      const records = Array.isArray(res.data) ? res.data : res.data.results || [];
      setExistingRecords(records);

      // Update attendance data with existing records
      if (records.length > 0) {
        setAttendanceData(prev => 
          prev.map(item => {
            const existing = records.find(r => r.student === item.student);
            return existing ? {
              ...item,
              status: existing.status,
              notes: existing.notes || "",
              id: existing.id
            } : item;
          })
        );
      }
    } catch (error) {
      console.error("Failed to check existing records:", error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev =>
      prev.map(item =>
        item.student === studentId ? { ...item, status } : item
      )
    );
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceData(prev =>
      prev.map(item =>
        item.student === studentId ? { ...item, notes } : item
      )
    );
  };

  const handleBulkAction = (status) => {
    setAttendanceData(prev =>
      prev.map(item => ({ ...item, status }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedClass) {
      showMessage("error", "Please select a class");
      return;
    }

    setSaving(true);

    try {
      const promises = attendanceData.map(async (record) => {
        const payload = {
          student: record.student,
          class_assigned: selectedClass,
          date: attendanceDate,
          status: record.status,
          notes: record.notes
        };

        // If record has ID, update it; otherwise create new
        if (record.id) {
          return api.put(`/academics/attendance/${record.id}/`, payload);
        } else {
          return api.post("/academics/attendance/", payload);
        }
      });

      await Promise.all(promises);
      showMessage("success", "Attendance saved successfully!");
      checkExistingRecords();
    } catch (error) {
      const errorMsg = error.response?.data?.non_field_errors?.[0] || 
                       error.response?.data?.detail ||
                       "Failed to save attendance";
      showMessage("error", errorMsg);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusButton = (currentStatus, targetStatus, icon, label, color) => {
    const Icon = icon;
    const isActive = currentStatus === targetStatus;
    
    return (
      <button
        type="button"
        onClick={() => handleStatusChange(targetStatus)}
        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? `${color} text-white shadow-md`
            : `bg-gray-100 text-gray-600 hover:bg-gray-200`
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  const getSummary = () => {
    const present = attendanceData.filter(r => r.status === 'present').length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const late = attendanceData.filter(r => r.status === 'late').length;
    const total = attendanceData.length;
    
    return { present, absent, late, total };
  };

  const summary = getSummary();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">✅ Record Attendance</h1>
        <p className="text-gray-600">Mark student attendance for today's class</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === "success"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}>
          {message.type === "success" ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Class and Date Selection */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Class *</label>
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Choose a class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.student_count || 0} students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {existingRecords.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Attendance already recorded for this date. You can update the records below.
          </div>
        )}
      </div>

      {/* Summary and Bulk Actions */}
      {selectedClass && students.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <p className="text-sm font-medium mb-3">Quick Actions:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction('present')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <CheckCircle className="w-4 h-4" />
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('absent')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <XCircle className="w-4 h-4" />
                Mark All Absent
              </button>
            </div>
          </div>
        </>
      )}

      {/* Student List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading students...</p>
        </div>
      ) : selectedClass && students.length > 0 ? (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceData.map((record, index) => (
                    <tr key={record.student} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {record.student_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(record.student, 'present')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                              record.status === 'present'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(record.student, 'absent')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                              record.status === 'absent'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(record.student, 'late')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                              record.status === 'late'
                                ? 'bg-yellow-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            Late
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional notes..."
                          value={record.notes}
                          onChange={(e) => handleNotesChange(record.student, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </form>
      ) : selectedClass ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No students found in this class</p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Please select a class to record attendance</p>
        </div>
      )}
    </div>
  );
}