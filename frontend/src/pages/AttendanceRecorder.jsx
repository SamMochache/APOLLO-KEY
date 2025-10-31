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
import api from "../api/axios"; // keep this only if you use it for classes/students

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
        const res = await api.get(`/academics/students-by-class/${selectedClass}/`);
        setStudents(res.data);
        setAttendanceData(res.data.map(s => ({
          student: s.id,
          student_name: s.full_name,
          status: "Present",
          notes: "",
          id: null
        })));
      } catch (error) {
        console.error("Failed to load students:", error.message);
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
      alert("Please select a class and date before saving.");
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
            ...r,
            class_assigned: selectedClass,
            date: attendanceDate,
          }))
        );
      }

      if (toCreate.length) {
        await attendanceService.bulkCreate(
          toCreate.map(r => ({
            ...r,
            class_assigned: selectedClass,
            date: attendanceDate,
          }))
        );
      }

      setMessage("✅ Attendance saved successfully!");
      await checkExistingRecords(); // refresh data after save
    } catch (error) {
      console.error("Error saving attendance:", error.message);
      setMessage(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ---------- JSX ----------
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
        <Users className="text-blue-500" /> Attendance Recorder
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={attendanceDate}
          onChange={(e) => setAttendanceDate(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={checkExistingRecords}
          className="bg-gray-100 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-200"
        >
          <Clock size={18} /> Check Existing
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p className="text-gray-600">No students found for this class.</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Student</th>
              <th className="p-2">Status</th>
              <th className="p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((record, index) => (
              <tr key={record.student} className="border-t">
                <td className="p-2">{record.student_name}</td>
                <td className="p-2">
                  <select
                    value={record.status}
                    onChange={(e) =>
                      handleChange(index, "status", e.target.value)
                    }
                    className="border rounded p-1"
                  >
                    <option value="Present">✅ Present</option>
                    <option value="Absent">❌ Absent</option>
                    <option value="Late">⏰ Late</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={record.notes}
                    onChange={(e) =>
                      handleChange(index, "notes", e.target.value)
                    }
                    placeholder="Add note..."
                    className="border rounded p-1 w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Save Button */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded text-white ${
            saving ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {saving ? (
            <>
              <Clock size={16} /> Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save Attendance
            </>
          )}
        </button>
        {message && (
          <div
            className={`flex items-center gap-2 ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.startsWith("✅") ? <CheckCircle /> : <AlertCircle />}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
