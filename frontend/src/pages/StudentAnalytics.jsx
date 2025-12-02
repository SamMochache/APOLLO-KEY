// frontend/src/pages/StudentAnalytics.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Award, Target, AlertCircle,
  Download, RefreshCw, Calendar, BookOpen, CheckCircle,
  XCircle, Activity, Brain, Lightbulb
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

export default function StudentAnalytics() {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.role === 'student') {
      fetchAnalytics();
    } else {
      fetchStudents();
    }
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/academics/classes/');
      const classes = Array.isArray(response.data) ? response.data : response.data.results || [];
      // Fetch students from first class for demo
      if (classes.length > 0) {
        const studentsRes = await api.get(`/academics/attendance/students-by-class/?class_id=${classes[0].id}`);
        setStudents(studentsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchAnalytics = async (studentId = null) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const params = studentId ? `?student_id=${studentId}` : '';
      const response = await api.get(`/academics/analytics/student-performance/${params}`);
      setAnalytics(response.data);
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (studentId) => {
    setSelectedStudent(studentId);
    fetchAnalytics(studentId);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const params = selectedStudent ? `?student_id=${selectedStudent}` : '';
      const response = await api.get(`/academics/analytics/export-pdf/${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showMessage('success', 'Analytics report downloaded successfully!');
    } catch (error) {
      showMessage('error', 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Activity className="w-5 h-5 text-blue-600" />;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[priority] || colors.medium;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="text-blue-600 w-8 h-8" />
          Performance Analytics Dashboard
        </h1>
        <p className="text-gray-600">Comprehensive insights into academic performance</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Student Selector (for teachers/admins) */}
      {user?.role !== 'student' && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2">Select Student</label>
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedStudent || ''}
                onChange={(e) => handleStudentChange(e.target.value)}
              >
                <option value="">-- Choose a student --</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name || student.username}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={!analytics || exporting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Export button for students */}
      {user?.role === 'student' && analytics && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      )}

      {!analytics ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {user?.role === 'student' 
              ? 'No analytics data available yet'
              : 'Please select a student to view their analytics'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Overall Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Score</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {analytics.overall_metrics.average_score}%
                  </p>
                </div>
                <Target className="w-12 h-12 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">GPA</p>
                  <p className="text-3xl font-bold text-green-600">
                    {analytics.overall_metrics.gpa.toFixed(2)}
                  </p>
                </div>
                <Award className="w-12 h-12 text-green-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rank Percentile</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {analytics.overall_metrics.rank_percentile}%
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assessments</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {analytics.overall_metrics.total_assessments}
                  </p>
                </div>
                <BookOpen className="w-12 h-12 text-yellow-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Grade Trends Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold">Grade Trends Over Time</h2>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.grade_trends.trend)}
                <span className="text-sm font-semibold capitalize">
                  {analytics.grade_trends.trend.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            {analytics.grade_trends.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.grade_trends.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Insufficient data for trend analysis
              </div>
            )}
          </div>

          {/* Subject Comparison & Attendance Correlation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Radar Chart - Subject Comparison */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Subject Performance Comparison
              </h2>
              
              {analytics.subject_comparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analytics.subject_comparison}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar 
                      name="Average Score" 
                      dataKey="average" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6} 
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No subject data available
                </div>
              )}
            </div>

            {/* Attendance-Grade Correlation */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-600" />
                Attendance & Performance Correlation
              </h2>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Insight:</strong> {analytics.attendance_correlation.insight}
                </p>
              </div>

              {analytics.attendance_correlation.monthly_data?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics.attendance_correlation.monthly_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="grade_avg" 
                      stroke="#3b82f6" 
                      name="Grade Average"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="attendance_rate" 
                      stroke="#10b981" 
                      name="Attendance Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Insufficient data for correlation analysis
                </div>
              )}
            </div>
          </div>

          {/* Predicted Grades */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-600" />
              Predicted Final Grades
            </h2>
            
            {analytics.predicted_grades.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.predicted_grades.map((pred, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition">
                    <h3 className="font-semibold text-lg mb-2">{pred.subject}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current:</span>
                        <span className="font-semibold">{pred.current_average}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Predicted:</span>
                        <span className="font-bold text-purple-600">{pred.predicted_final}%</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          pred.confidence === 'high' ? 'bg-green-100 text-green-800' :
                          pred.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {pred.confidence} confidence
                        </span>
                        <span className="text-lg font-bold text-blue-600">{pred.predicted_grade}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Insufficient data for predictions
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-green-600" />
                Academic Strengths
              </h2>
              
              {analytics.strengths_weaknesses.strengths.length > 0 ? (
                <div className="space-y-3">
                  {analytics.strengths_weaknesses.strengths.map((strength, idx) => (
                    <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-green-800">{strength.subject}</h3>
                        <span className="text-2xl font-bold text-green-600">{strength.average}%</span>
                      </div>
                      <p className="text-sm text-green-700">{strength.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Keep working to identify strengths
                </div>
              )}
            </div>

            {/* Weaknesses */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                Areas for Improvement
              </h2>
              
              {analytics.strengths_weaknesses.weaknesses.length > 0 ? (
                <div className="space-y-3">
                  {analytics.strengths_weaknesses.weaknesses.map((weakness, idx) => (
                    <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-red-800">{weakness.subject}</h3>
                        <span className="text-2xl font-bold text-red-600">{weakness.average}%</span>
                      </div>
                      <p className="text-sm text-red-700">{weakness.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No significant weaknesses identified
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-600" />
              Personalized Recommendations
            </h2>
            
            {analytics.recommendations.length > 0 ? (
              <div className="space-y-3">
                {analytics.recommendations.map((rec, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)}`}>
                    <div className="flex items-start gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        rec.priority === 'high' ? 'bg-red-200 text-red-900' :
                        rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                        'bg-green-200 text-green-900'
                      }`}>
                        {rec.priority}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{rec.message}</p>
                        <p className="text-sm opacity-80">
                          <strong>Action:</strong> {rec.action}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Keep up the great work! No recommendations at this time.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}