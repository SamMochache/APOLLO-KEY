// frontend/src/pages/ParentDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  Users, BookOpen, Calendar, TrendingUp, Award,
  AlertCircle, RefreshCw, CheckCircle, XCircle, Clock,
  ChevronDown, Loader
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import parentService from '../api/parentService';

export default function ParentDashboard() {
  const { user } = useContext(AuthContext);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch children on mount
  useEffect(() => {
    fetchChildren();
  }, []);

  // Fetch child data when selected
  useEffect(() => {
    if (selectedChild) {
      fetchChildData();
    }
  }, [selectedChild, activeTab]);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const data = await parentService.getMyChildren();
      setChildren(data.children || []);
      
      if (data.children && data.children.length > 0) {
        setSelectedChild(data.children[0].student_id);
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async () => {
    setLoading(true);
    try {
      // Fetch based on active tab
      if (activeTab === 'overview') {
        const perf = await parentService.getChildPerformanceSummary(selectedChild);
        setPerfData(perf);
      } else if (activeTab === 'grades') {
        const grades = await parentService.getChildGrades(selectedChild, { limit: 20 });
        setGradesData(grades);
      } else if (activeTab === 'attendance') {
        const att = await parentService.getChildAttendance(selectedChild);
        setAttendanceData(att);
      } else if (activeTab === 'timetable') {
        const tt = await parentService.getChildTimetable(selectedChild);
        setTimetableData(tt);
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const currentChild = children.find(c => c.student_id === selectedChild);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="text-blue-600 w-8 h-8" />
          Parent Portal
        </h1>
        <p className="text-gray-600">Monitor your child's academic progress</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {loading && !perfData && !gradesData && !attendanceData ? (
        <div className="text-center py-12">
          <Loader className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : !children.length ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 text-lg">No children linked to your account</p>
          <p className="text-gray-500 text-sm mt-2">Contact your school administrator to link your children</p>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <label className="block text-sm font-semibold mb-2">Select Child</label>
            <div className="relative">
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                value={selectedChild || ''}
                onChange={(e) => setSelectedChild(parseInt(e.target.value))}
              >
                {children.map(child => (
                  <option key={child.student_id} value={child.student_id}>
                    {child.student_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-md mb-6 border-b">
            <div className="flex border-b bg-gray-50">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'grades', label: 'Grades', icon: Award },
                { id: 'attendance', label: 'Attendance', icon: CheckCircle },
                { id: 'timetable', label: 'Schedule', icon: Calendar }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'border-b-3 border-blue-600 text-blue-600 bg-white'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && perfData && <OverviewTab data={perfData} />}
            {activeTab === 'grades' && gradesData && <GradesTab data={gradesData} />}
            {activeTab === 'attendance' && attendanceData && <AttendanceTab data={attendanceData} />}
            {activeTab === 'timetable' && timetableData && <TimetableTab data={timetableData} />}
          </div>
        </>
      )}
    </div>
  );
}

// ===== Overview Tab Component =====
function OverviewTab({ data }) {
  const perfCategory = getPerformanceCategory(data.overall_percentage);
  const attCategory = getAttendanceCategory(data.attendance_rate);

  return (
    <>
      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Overall Score</p>
          <p className="text-3xl font-bold text-blue-600">{data.overall_percentage.toFixed(1)}%</p>
          <p className={`text-xs font-semibold mt-2 ${perfCategory.color}`}>
            {perfCategory.label}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
          <p className="text-3xl font-bold text-green-600">{data.attendance_rate}%</p>
          <p className="text-xs text-gray-500 mt-2">{data.present}/{data.total_attendance} days</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 mb-1">Assessments</p>
          <p className="text-3xl font-bold text-purple-600">{data.total_assessments}</p>
          <p className="text-xs text-gray-500 mt-2">Completed</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 mb-1">Performance</p>
          <p className="text-2xl font-bold text-yellow-600">
            {data.performance_category === 'Excellent' ? '⭐' :
             data.performance_category === 'Very Good' ? '✨' :
             data.performance_category === 'Good' ? '👍' : '📚'}
          </p>
          <p className="text-xs text-gray-500 mt-2">{data.performance_category}</p>
        </div>
      </div>

      {/* Recent Grades */}
      {data.recent_grades && data.recent_grades.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold mb-4">Recent Assessments</h3>
          <div className="space-y-3">
            {data.recent_grades.map((grade, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium">{grade.assessment_name}</p>
                  <p className="text-xs text-gray-600">{new Date(grade.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{grade.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{grade.marks}/{grade.total_marks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ===== Grades Tab Component =====
function GradesTab({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Grade History</h3>
            <p className="text-sm text-gray-600">Total: {data.total_grades} assessments</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{data.average_percentage.toFixed(1)}%</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Assessment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Marks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Percentage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.grades && data.grades.map(grade => (
              <tr key={grade.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">{grade.assessment_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{grade.subject_name}</td>
                <td className="px-6 py-4 text-sm">{grade.marks_obtained}/{grade.total_marks}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    grade.percentage >= 80 ? 'bg-green-100 text-green-800' :
                    grade.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {grade.percentage.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold">{grade.grade_letter || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Attendance Tab Component =====
function AttendanceTab({ data }) {
  const presentPercent = data.total_records > 0 
    ? ((data.present / data.total_records) * 100).toFixed(1) 
    : 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Total Days</p>
          <p className="text-3xl font-bold text-blue-600">{data.total_records}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">Present</p>
          <p className="text-3xl font-bold text-green-600">{data.present}</p>
          <p className="text-xs text-gray-500 mt-1">{presentPercent}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-600">{data.absent}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
          <p className="text-3xl font-bold text-yellow-600">{data.attendance_rate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-4">Recent Records</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Class</th>
              <th className="px-4 py-2 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.records && data.records.slice(0, 10).map(record => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{new Date(record.date).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                    record.status === 'absent' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.status === 'present' && <CheckCircle className="w-3 h-3" />}
                    {record.status === 'absent' && <XCircle className="w-3 h-3" />}
                    {record.status === 'late' && <Clock className="w-3 h-3" />}
                    {record.status_display}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">{record.class_name}</td>
                <td className="px-4 py-2 text-gray-500">{record.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ===== Timetable Tab Component =====
function TimetableTab({ data }) {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const groupedByDay = {};
  
  data.timetable?.forEach(entry => {
    if (!groupedByDay[entry.day]) {
      groupedByDay[entry.day] = [];
    }
    groupedByDay[entry.day].push(entry);
  });

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold mb-4">Weekly Schedule</h3>
      
      <div className="space-y-4">
        {dayOrder.map(day => {
          const entries = groupedByDay[day] || [];
          if (entries.length === 0) return null;
          
          return (
            <div key={day} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-blue-600">{day}</h4>
              <div className="space-y-2 ml-4">
                {entries.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{entry.subject_name}</p>
                      <p className="text-xs text-gray-600">{entry.teacher_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{entry.start_time} - {entry.end_time}</p>
                      <p className="text-xs text-gray-500">{entry.class_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper functions
function getPerformanceCategory(percentage) {
  if (percentage >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (percentage >= 80) return { label: 'Very Good', color: 'text-blue-600' };
  if (percentage >= 70) return { label: 'Good', color: 'text-yellow-600' };
  if (percentage >= 60) return { label: 'Satisfactory', color: 'text-orange-600' };
  return { label: 'Needs Improvement', color: 'text-red-600' };
}

function getAttendanceCategory(rate) {
  if (rate >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (rate >= 80) return { label: 'Good', color: 'text-blue-600' };
  if (rate >= 70) return { label: 'Average', color: 'text-yellow-600' };
  if (rate >= 60) return { label: 'Below Average', color: 'text-orange-600' };
  return { label: 'Poor', color: 'text-red-600' };
}