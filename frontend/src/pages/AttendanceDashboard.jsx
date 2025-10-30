// frontend/src/pages/AttendanceDashboard.jsx
import React, { useState, useEffect, useContext } from "react";
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Filter,
  Download,
  Search
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

export default function AttendanceDashboard() {
  const { user } = useContext(AuthContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    class_id: "",
    student_id: "",
    date: "",
    status: ""
  });
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchClasses();
    fetchAttendance();
    fetchSummary();
    if (user?.role === 'admin' || user?.role === 'teacher') {
      fetchStatistics();
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filters]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/academics/classes/");
      setClasses(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const res = await api.get(`/academics/attendance/?${params}`);
      setAttendanceRecords(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      showMessage("error", "Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/academics/attendance/summary/");
      setSummary(res.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date) {
        const startDate = new Date(filters.date);
        startDate.setDate(startDate.getDate() - 30);
        params.append('start_date', startDate.toISOString().split('T')[0]);
        params.append('end_date', filters.date);
      }

      const res = await api.get(`/academics/attendance/statistics/?${params}`);
      setStatistics(res.data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      absent: { color: "bg-red-100 text-red-800", icon: XCircle },
      late: { color: "bg-yellow-100 text-yellow-800", icon: Clock }
    };
    
    const badge = badges[status] || badges.present;
    const Icon = badge.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      class_id: "",
      student_id: "",
      date: "",
      status: ""
    });
  };

  const exportToCSV = () => {
    const headers = ["Date", "Student", "Class", "Status", "Recorded By", "Notes"];
    const rows = attendanceRecords.map(record => [
      record.date,
      record.student_name,
      record.class_name,
      record.status,
      record.recorded_by_name || "N/A",
      record.notes || ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">📊 Attendance Dashboard</h1>
        <p className="text-gray-600">
          {user?.role === 'student' 
            ? "View your attendance records"
            : "Track and manage attendance"}
        </p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg animate-fadeIn ${
          message.type === "success"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-800">{summary.total_records}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Present</p>
                <p className="text-3xl font-bold text-green-600">{summary.present}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Absent</p>
                <p className="text-3xl font-bold text-red-600">{summary.absent}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Late</p>
                <p className="text-3xl font-bold text-yellow-600">{summary.late}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Statistics for Admin/Teacher */}
      {statistics && (user?.role === 'admin' || user?.role === 'teacher') && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Student Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.student_statistics?.map((stat, index) => (
              <div key={index} className="border rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-2">{stat.student_username}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Present:</span>
                    <span className="text-green-600 font-semibold">{stat.present}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Absent:</span>
                    <span className="text-red-600 font-semibold">{stat.absent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold">{stat.total}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t">
                    <span className="text-gray-600">Rate:</span>
                    <span className={`font-bold ${
                      stat.attendance_rate >= 80 ? 'text-green-600' :
                      stat.attendance_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stat.attendance_rate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <div>
              <label className="block text-sm font-medium mb-2">Class</label>
              <select
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.class_id}
                onChange={(e) => handleFilterChange('class_id', e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Loading attendance records...</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {(user?.role === 'admin' || user?.role === 'teacher') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {record.student_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.class_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.recorded_by_name || "N/A"}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}