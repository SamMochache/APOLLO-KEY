// frontend/src/pages/AttendanceRankings.jsx
import React, { useState, useEffect, useContext } from "react";
import { 
  Trophy, 
  TrendingDown, 
  Users, 
  Award,
  Medal,
  AlertCircle,
  Calendar,
  Filter,
  RefreshCw
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

export default function AttendanceRankings() {
  const { user } = useContext(AuthContext);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    class_id: "",
    limit: 10,
    start_date: "",
    end_date: ""
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchClasses();
    fetchRankings();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/academics/classes/");
      setClasses(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const res = await api.get(`/academics/attendance/rankings/?${params}`);
      setRankings(res.data);
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="text-gray-500 font-bold">{rank}</span>;
    }
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 80) return "text-blue-600";
    if (rate >= 70) return "text-yellow-600";
    if (rate >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getAttendanceBadge = (rate) => {
    if (rate >= 90) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (rate >= 80) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (rate >= 70) return { label: "Average", color: "bg-yellow-100 text-yellow-800" };
    if (rate >= 60) return { label: "Below Average", color: "bg-orange-100 text-orange-800" };
    return { label: "Poor", color: "bg-red-100 text-red-800" };
  };

  const renderStudentCard = (student, index, isTop = true) => {
    const badge = getAttendanceBadge(student.attendance_rate);
    
    return (
      <div 
        key={student.student_id}
        className={`p-4 border rounded-lg transition-all duration-300 hover:shadow-lg ${
          isTop 
            ? "border-green-200 bg-gradient-to-br from-white to-green-50 hover:border-green-400"
            : "border-red-200 bg-gradient-to-br from-white to-red-50 hover:border-red-400"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
              {getMedalIcon(index + 1)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{student.student_name}</h3>
              <p className="text-xs text-gray-500">{student.student_username}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Attendance Rate:</span>
            <span className={`text-2xl font-bold ${getAttendanceColor(student.attendance_rate)}`}>
              {student.attendance_rate}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center">
            <div>
              <p className="text-xs text-gray-500">Present</p>
              <p className="text-sm font-semibold text-green-600">{student.present}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Late</p>
              <p className="text-sm font-semibold text-yellow-600">{student.late}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Absent</p>
              <p className="text-sm font-semibold text-red-600">{student.absent}</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 text-center">
              Total Records: <span className="font-semibold">{student.total_records}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">🏆 Attendance Rankings</h1>
        <p className="text-gray-600">Top and bottom performing students based on attendance</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === "success"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <button
            onClick={fetchRankings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Loading..." : "Apply Filters"}
          </button>
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
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Limit</label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
            >
              <option value="5">Top/Bottom 5</option>
              <option value="10">Top/Bottom 10</option>
              <option value="15">Top/Bottom 15</option>
              <option value="20">Top/Bottom 20</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading rankings...</p>
        </div>
      )}

      {/* Rankings Display */}
      {!loading && rankings && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-800">{rankings.total_students}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Class Filter</p>
                  <p className="text-lg font-bold text-gray-800">{rankings.class_name}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rate (Top {filters.limit})</p>
                  <p className="text-2xl font-bold text-green-600">
                    {rankings.top_students.length > 0 
                      ? Math.round(rankings.top_students.reduce((sum, s) => sum + s.attendance_rate, 0) / rankings.top_students.length)
                      : 0}%
                  </p>
                </div>
                <Award className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Top Performers</h2>
                  <p className="text-sm text-gray-600">Highest attendance rates</p>
                </div>
              </div>

              <div className="space-y-4">
                {rankings.top_students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No data available</p>
                  </div>
                ) : (
                  rankings.top_students.map((student, index) => 
                    renderStudentCard(student, index, true)
                  )
                )}
              </div>
            </div>

            {/* Bottom Performers */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Needs Attention</h2>
                  <p className="text-sm text-gray-600">Students requiring support</p>
                </div>
              </div>

              <div className="space-y-4">
                {rankings.bottom_students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No data available</p>
                  </div>
                ) : (
                  rankings.bottom_students.map((student, index) => 
                    renderStudentCard(student, index, false)
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}