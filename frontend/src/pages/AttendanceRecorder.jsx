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
import attendanceService from "../api/attendanceService";
import api from "../api/axios";

export default function AttendanceRecorder() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [existingRecords, setExistingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ---------- Fetch Classes ----------
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/academics/classes/");
        setClasses(res.data);
      } catch (error) {
        console.error("Failed to load classes:", error.message);
      }
    };
    fetchClasses();
  }, []);

  // ---------- Fetch Students ----------
  useEffect(() => {
    if (!selectedClass) return;
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // ✅ FIXED: Correct endpoint
        const res = await api.get(`/academics/attendance/students-by-class/?class_id=${selectedClass}`);
        setStudents(res.data);
        setAttendanceData(res.data.map(s => ({
          student: s.id,
          student_name: s.full_name || s.username,
          status: "present", // ✅ FIXED: lowercase to match backend
          notes: "",
          id: null
        })));
      } catch (error) {
        console.error("Failed to load students:", error.message);
        setMessage(`❌ Failed to load students: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // ---------- Check Existing Records ----------
  const checkExistingRecords = async () => {
    if (!selectedClass || !attendanceDate) return;
    try {
      const { data: records } = await attendanceService.fetchRecords({
        class_id: selectedClass,
        date: attendanceDate,
      });

      setExistingRecords(records);

      if (records.length > 0) {
        setAttendanceData(prev =>
          prev.map(item => {
            const existing = records.find(r => r.student === item.student);
            return existing
              ? {
                  ...item,
                  status: existing.status,
                  notes: existing.notes || "",
                  id: existing.id,
                }
              : item;
          })
        );
      }
    } catch (error) {
      console.error("Failed to check existing records:", error.message);
    }
  };

  // ---------- Handle Change ----------
  const handleChange = (index, field, value) => {
    setAttendanceData(prev =>
      prev.map((record, i) =>
        i === index ? { ...record, [field]: value } : record
      )
    );
  };

  // ---------- Submit Attendance ----------
  const handleSubmit = async () => {
    if (!selectedClass || !attendanceDate) {
      setMessage("❌ Please select a class and date before saving.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const toUpdate = attendanceData.filter(r => r.id);
      const toCreate = attendanceData.filter(r => !r.id);

      if (toUpdate.length) {
        await attendanceService.bulkUpdate(
          toUpdate.map(r => ({
            id: r.id,
            student: r.student,
            class_assigned: selectedClass,
            date: attendanceDate,
            status: r.status,
            notes: r.notes
          }))
        );
      }

      if (toCreate.length) {
        await attendanceService.bulkCreate(
          toCreate.map(r => ({
            student: r.student,
            class_assigned: selectedClass,
            date: attendanceDate,
            status: r.status,
            notes: r.notes
          }))
        );
      }

      setMessage("✅ Attendance saved successfully!");
      await checkExistingRecords();
    } catch (error) {
      console.error("Error saving attendance:", error.message);
      setMessage(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ---------- JSX ----------
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="text-blue-600 w-8 h-8" />
          Attendance Recorder
        </h1>
        <p className="text-gray-600">Mark attendance for selected class</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Select Class *
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Choose Class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Date *
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={checkExistingRecords}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <Clock size={18} />
              Check Existing Records
            </button>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-fadeIn ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {message.startsWith("✅") ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* Students Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>
            {selectedClass
              ? "No students found for this class"
              : "Please select a class to view students"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={record.student} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {record.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.student_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={record.status}
                        onChange={(e) =>
                          handleChange(index, "status", e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="present">✅ Present</option>
                        <option value="absent">❌ Absent</option>
                        <option value="late">⏰ Late</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={record.notes}
                        onChange={(e) =>
                          handleChange(index, "notes", e.target.value)
                        }
                        placeholder="Add note (optional)"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <button
              onClick={handleSubmit}
              disabled={saving || !selectedClass}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all ${
                saving || !selectedClass
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
            >
              {saving ? (
                <>
                  <Clock size={18} className="animate-spin" />
                  Saving Attendance...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}